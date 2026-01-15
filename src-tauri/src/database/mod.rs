use sqlx::{SqlitePool, Result as SqlxResult, sqlite::SqliteConnectOptions};
use std::path::PathBuf;

pub mod papers;
pub mod settings;
pub mod classification_cache;
pub mod collections;
pub mod fetch_history;

pub use papers::{PaperRepository, PaperError};
pub use settings::SettingsRepository;
pub use classification_cache::ClassificationCacheRepository;
pub use collections::CollectionRepository;
pub use fetch_history::{FetchHistoryRepository, FetchHistoryEntry, PaperSummary};

/// Get the path to the SQLite database file
/// Platform-specific application data directories:
/// - macOS: ~/Library/Application Support/com.paperfuse.app/paperfuse.db
/// - Windows: %APPDATA%\com.paperfuse.app\paperfuse.db
/// - Linux: ~/.local/share/com.paperfuse.app/paperfuse.db
pub fn get_db_path() -> PathBuf {
    #[cfg(target_os = "macos")]
    {
        if let Some(home) = std::env::var_os("HOME") {
            let mut path = PathBuf::from(&home);
            path.push("Library");
            path.push("Application Support");
            path.push("com.paperfuse.app");
            path.push("paperfuse.db");
            return path;
        }
    }

    #[cfg(target_os = "windows")]
    {
        if let Some(appdata) = std::env::var_os("APPDATA") {
            let mut path = PathBuf::from(&appdata);
            path.push("com.paperfuse.app");
            path.push("paperfuse.db");
            return path;
        }
    }

    #[cfg(target_os = "linux")]
    {
        if let Some(home = std::env::var_os("HOME") {
            let mut path = PathBuf::from(&home);
            path.push(".local");
            path.push("share");
            path.push("com.paperfuse.app");
            path.push("paperfuse.db");
            return path;
        }
    }

    // Fallback to current directory if platform-specific path is not available
    let mut path = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
    path.push("paperfuse.db");
    path
}

/// Initialize the database connection and run migrations
pub async fn init_db() -> SqlxResult<SqlitePool> {
    let db_path = get_db_path();

    // Create parent directory if it doesn't exist
    if let Some(parent) = db_path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| {
            sqlx::Error::Io(std::io::Error::new(
                std::io::ErrorKind::NotFound,
                format!("Failed to create database directory: {}", e),
            ))
        })?;
    }

    // Use SqliteConnectOptions for better control over connection parameters
    let options = SqliteConnectOptions::new()
        .filename(&db_path)
        .create_if_missing(true);
    let pool = SqlitePool::connect_with(options).await?;

    // Run migrations
    sqlx::query("PRAGMA foreign_keys = ON")
        .execute(&pool)
        .await?;

    Ok(pool)
}

/// Smart SQL statement splitter that handles triggers with BEGIN...END blocks
/// Returns a vector of complete SQL statements
fn split_sql_statements(sql: &str) -> Vec<String> {
    let mut statements = Vec::new();
    let mut current = String::new();
    let mut in_begin_end: i32 = 0; // Track nesting level of BEGIN...END blocks
    
    for segment in sql.split(';') {
        current.push_str(segment);
        current.push(';');
        
        // Count BEGIN and END keywords (case-insensitive, whole word)
        let normalized = current.to_uppercase();
        let words: Vec<&str> = normalized.split_whitespace().collect();
        
        for word in words.iter() {
            if *word == "BEGIN" {
                in_begin_end += 1;
            } else if *word == "END" {
                in_begin_end = in_begin_end.saturating_sub(1);
            }
        }
        
        // Only finalize statement when we're not inside a BEGIN...END block
        if in_begin_end == 0 {
            statements.push(current.trim().to_string());
            current.clear();
        }
    }
    
    // Add remaining content if any
    if !current.trim().is_empty() {
        statements.push(current.trim().to_string());
    }
    
    statements
}

/// Create the database schema (for development)
/// In production, use sqlx-cli or a migration system
pub async fn create_schema(pool: &SqlitePool) -> SqlxResult<()> {
    // Begin transaction
    let mut tx = pool.begin().await?;

    // Disable foreign keys during schema creation to avoid circular dependency issues
    sqlx::query("PRAGMA foreign_keys = OFF")
        .execute(&mut *tx)
        .await?;

    // Run all migration files in order
    // Note: include_str! requires string literals at compile time
    let migrations = [
        ("001_initial.sql", include_str!("../../migrations/001_initial.sql")),
        ("002_add_schedule_status.sql", include_str!("../../migrations/002_add_schedule_status.sql")),
        ("003_fetch_history.sql", include_str!("../../migrations/003_fetch_history.sql")),
        ("004_add_arxiv_id.sql", include_str!("../../migrations/004_add_arxiv_id.sql")),
        ("005_add_classification_cache.sql", include_str!("../../migrations/005_add_classification_cache.sql")),
        ("006_deep_analysis_v2.sql", include_str!("../../migrations/006_deep_analysis_v2.sql")),
        ("007_add_topics.sql", include_str!("../../migrations/007_add_topics.sql")),
        ("008_add_fts_search.sql", include_str!("../../migrations/008_add_fts_search.sql")),
        ("009_add_authors_to_fts.sql", include_str!("../../migrations/009_add_authors_to_fts.sql")),
        ("010_add_topics_tags_to_fts.sql", include_str!("../../migrations/010_add_topics_tags_to_fts.sql")),
        ("011_add_retry_settings.sql", include_str!("../../migrations/011_add_retry_settings.sql")),
        ("012_add_papers_to_fetch_history.sql", include_str!("../../migrations/012_add_papers_to_fetch_history.sql")),
        ("013_backfill_fetch_history.sql", include_str!("../../migrations/013_backfill_fetch_history.sql")),
        ("014_update_authors_with_affiliation.sql", include_str!("../../migrations/014_update_authors_with_affiliation.sql")),
        ("015_fix_nested_authors.sql", include_str!("../../migrations/015_fix_nested_authors.sql")),
        ("016_add_spam_field.sql", include_str!("../../migrations/016_add_spam_field.sql")),
        ("017_add_pdf_local_path.sql", include_str!("../../migrations/017_add_pdf_local_path.sql")),
        ("018_add_analysis_config.sql", include_str!("../../migrations/018_add_analysis_config.sql")),
        ("019_add_related_papers.sql", include_str!("../../migrations/019_add_related_papers.sql")),
        ("020_add_content_metadata.sql", include_str!("../../migrations/020_add_content_metadata.sql")),
    ];

    for (migration_name, schema) in migrations.iter() {
        eprintln!("[create_schema] Running migration: {}", migration_name);

        // Split SQL statements intelligently (handles triggers with BEGIN...END)
        let statements = split_sql_statements(schema);
        
        for statement in statements.iter() {
            let statement = statement.trim();

            // Skip empty statements
            if statement.is_empty() {
                continue;
            }

            // Remove all comment lines from the statement
            let cleaned_statement: String = statement
                .lines()
                .filter(|line| !line.trim().starts_with("--"))
                .collect::<Vec<&str>>()
                .join("\n")
                .trim()
                .to_string();

            // Skip if empty after removing comments
            if cleaned_statement.is_empty() {
                continue;
            }

            // Execute the statement, ignore errors if columns/tables already exist
            if let Err(e) = sqlx::query(&cleaned_statement).execute(&mut *tx).await {
                // Check if it's a duplicate column/table error (SQLite error code 1)
                let error_msg = e.to_string().to_lowercase();
                if error_msg.contains("duplicate column") ||
                   error_msg.contains("already exists") {
                    eprintln!("[create_schema] Skipping (already exists): {}", cleaned_statement.chars().take(100).collect::<String>());
                } else {
                    eprintln!("[create_schema] Error executing statement: {}. Error: {}", cleaned_statement.chars().take(100).collect::<String>(), e);
                }
            }
        }
    }

    // Re-enable foreign keys after schema is created
    sqlx::query("PRAGMA foreign_keys = ON")
        .execute(&mut *tx)
        .await?;

    // Commit transaction
    tx.commit().await?;

    eprintln!("[create_schema] All migrations completed successfully");
    
    // Rebuild FTS5 index to ensure search works correctly
    eprintln!("[create_schema] Rebuilding FTS5 index...");
    let paper_repo = crate::database::PaperRepository::new(pool);
    if let Err(e) = paper_repo.rebuild_fts_index().await {
        eprintln!("[create_schema] Warning: Failed to rebuild FTS5 index: {}", e);
        // Don't fail the whole migration if FTS5 rebuild fails
    }
    
    Ok(())
}
