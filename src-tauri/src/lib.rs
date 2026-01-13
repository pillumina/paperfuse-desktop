use sqlx::SqlitePool;
use std::sync::Arc;
use tauri::Manager;

mod models;
mod database;
mod commands;
mod arxiv;
mod llm;
mod retry;
mod fetch;
mod scheduler;
mod latex_parser;

// Re-export specific types instead of glob to avoid ambiguity
pub use models::{
    Paper, ArxivPaper, AuthorInfo, KeyFormula, Algorithm, FlowDiagram,
    Settings, LLMProvider, ScheduleFrequency, TopicConfig,
    FetchOptions, FetchResult, FetchStatus, FetchStatusState,
    ScheduleStatus, ScheduleRun, ScheduleRunStatus,
    Collection, CollectionWithPaperCount, CreateCollection, UpdateCollection,
    compute_topics_hash,
};

// Re-export commands
pub use commands::{
    get_papers, get_paper_by_id, search_papers, get_papers_by_tag,
    get_paper_count, save_paper, delete_paper, batch_delete_papers, get_tags_with_counts,
    get_spam_papers, get_spam_paper_count, toggle_paper_spam,
    analyze_paper, batch_analyze_papers,
    get_settings, save_settings, get_setting, set_setting,
    get_cache_stats, clear_cache,
    start_fetch, get_fetch_status, is_fetching, cancel_fetch,
    get_fetch_history, delete_fetch_history_entry,
    enable_schedule, disable_schedule, get_schedule_status,
    trigger_scheduled_fetch_now, get_schedule_history,
    create_collection, get_collections, get_collection, update_collection,
    delete_collection, add_paper_to_collection, remove_paper_from_collection,
    get_collection_papers, get_paper_collections,
    FetchManagerState, SchedulerState,
};

/// Application state
pub struct AppState {
    pub db: Arc<SqlitePool>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            // Initialize database synchronously for setup
            let rt = tokio::runtime::Runtime::new().expect("Failed to create runtime");

            let pool = rt.block_on(async {
                let pool = database::init_db().await.expect("Failed to initialize database");

                // Create schema if needed (for development)
                #[cfg(debug_assertions)]
                {
                    database::create_schema(&pool).await.expect("Failed to create schema");
                }

                pool
            });

            // Manage the pool so commands can access it via State<'_, SqlitePool>
            app.manage(pool.clone());

            // Also manage AppState for backwards compatibility
            app.manage(AppState { db: Arc::new(pool.clone()) });

            // Initialize fetch manager state
            app.manage(commands::FetchManagerState::new());

            // Initialize scheduler state
            app.manage(commands::SchedulerState::new());

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Paper commands
            get_papers,
            get_paper_by_id,
            search_papers,
            get_papers_by_tag,
            get_paper_count,
            save_paper,
            delete_paper,
            batch_delete_papers,
            get_tags_with_counts,
            // Spam/Archive commands
            get_spam_papers,
            get_spam_paper_count,
            toggle_paper_spam,
            // Analysis commands
            analyze_paper,
            batch_analyze_papers,
            // Settings commands
            get_settings,
            save_settings,
            get_setting,
            set_setting,
            get_cache_stats,
            clear_cache,
            // Fetch commands
            start_fetch,
            get_fetch_status,
            is_fetching,
            cancel_fetch,
            get_fetch_history,
            delete_fetch_history_entry,
            // Schedule commands
            enable_schedule,
            disable_schedule,
            get_schedule_status,
            trigger_scheduled_fetch_now,
            get_schedule_history,
            // Collection commands
            create_collection,
            get_collections,
            get_collection,
            update_collection,
            delete_collection,
            add_paper_to_collection,
            remove_paper_from_collection,
            get_collection_papers,
            get_paper_collections,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

/// Run scheduled fetch in headless mode (for launchd)
pub fn run_scheduled_fetch() -> Result<(), Box<dyn std::error::Error>> {
    // Create runtime
    let rt = tokio::runtime::Runtime::new()?;
    rt.block_on(async {
        println!("Starting scheduled fetch worker...");

        // Initialize database
        let pool = database::init_db().await?;

        // Create schema if needed
        #[cfg(debug_assertions)]
        {
            database::create_schema(&pool).await?;
        }

        // Create worker and run with failure recovery
        let worker = scheduler::ScheduledFetchWorker::new(pool);
        match worker.run_with_failure_recovery().await {
            Ok(run) => {
                println!(
                    "Scheduled fetch completed: {} papers saved",
                    run.papers_saved
                );
                Ok(())
            }
            Err(e) => {
                eprintln!("Scheduled fetch failed: {}", e);
                Err(e.into())
            }
        }
    })
}
