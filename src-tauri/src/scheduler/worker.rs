//! Background fetch worker for scheduled execution
//!
//! This module provides the worker that runs when triggered by launchd
//! for scheduled paper fetching without UI interaction.

use crate::database::SettingsRepository;
use crate::fetch::FetchManager;
use crate::models::{FetchOptions, LLMProvider, ScheduleRun, ScheduleRunStatus};
use sqlx::SqlitePool;
use std::path::PathBuf;
use thiserror::Error;
use tokio::time::Instant;
use uuid::Uuid;

/// Errors that can occur during worker operations
#[derive(Debug, Error)]
pub enum WorkerError {
    #[error("Database error: {0}")]
    Database(String),

    #[error("Fetch error: {0}")]
    Fetch(String),

    #[error("Settings error: {0}")]
    Settings(String),

    #[error("No schedule configured")]
    NoSchedule,

    #[error("Schedule not enabled")]
    NotEnabled,

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
}

pub type WorkerResult<T> = std::result::Result<T, WorkerError>;

/// Background worker for scheduled fetch operations
pub struct ScheduledFetchWorker {
    pool: SqlitePool,
    log_file: PathBuf,
}

impl ScheduledFetchWorker {
    /// Create a new scheduled fetch worker
    pub fn new(pool: SqlitePool) -> Self {
        Self {
            pool,
            log_file: PathBuf::from("/tmp/paperfuse-scheduler.log"),
        }
    }

    /// Set custom log file path
    pub fn with_log_file(mut self, path: PathBuf) -> Self {
        self.log_file = path;
        self
    }

    /// Execute a scheduled fetch cycle
    pub async fn run_scheduled_fetch(&self) -> WorkerResult<ScheduleRun> {
        let start_time = Instant::now();
        let run_id = Uuid::new_v4().to_string();
        let started_at = chrono::Utc::now().to_rfc3339();

        self.log(&format!("[{}] Starting scheduled fetch", started_at));

        // Create initial run record
        let mut run = ScheduleRun {
            id: run_id.clone(),
            started_at: started_at.clone(),
            completed_at: None,
            status: ScheduleRunStatus::Running,
            papers_fetched: 0,
            papers_saved: 0,
            error_message: None,
        };

        // Save initial state
        self.save_run(&run).await?;

        // Load settings
        let settings_repo = SettingsRepository::new(&self.pool);
        let settings = settings_repo
            .get_all()
            .await
            .map_err(|e| WorkerError::Settings(e.to_string()))?;

        // Check if schedule is enabled
        if !settings.schedule_enabled {
            self.log("Schedule is not enabled, skipping fetch");
            run.status = ScheduleRunStatus::Failed;
            run.error_message = Some("Schedule not enabled".to_string());
            run.completed_at = Some(chrono::Utc::now().to_rfc3339());
            self.save_run(&run).await?;
            return Err(WorkerError::NotEnabled);
        }

        // Check if API keys are configured
        let api_key = match settings.llm_provider {
            crate::models::LLMProvider::Glm => settings.glm_api_key,
            crate::models::LLMProvider::Claude => settings.claude_api_key,
        };

        let api_key = api_key.ok_or_else(|| {
            self.log("No API key configured");
            WorkerError::Settings("No API key configured".to_string())
        })?;

        // Check if topics are configured
        if settings.topics.is_empty() {
            self.log("No topics configured, skipping fetch");
            run.status = ScheduleRunStatus::Failed;
            run.error_message = Some("No topics configured".to_string());
            run.completed_at = Some(chrono::Utc::now().to_rfc3339());
            self.save_run(&run).await?;
            return Err(WorkerError::NoSchedule);
        }

        // Build fetch options from topics
        let mut all_categories = Vec::new();
        let max_papers = settings
            .topics
            .iter()
            .filter_map(|t| t.max_papers_per_day)
            .max()
            .unwrap_or(50);

        for topic in &settings.topics {
            if let Some(cats) = &topic.arxiv_categories {
                all_categories.extend(cats.clone());
            }
        }

        if all_categories.is_empty() {
            self.log("No ArXiv categories configured, skipping fetch");
            run.status = ScheduleRunStatus::Failed;
            run.error_message = Some("No ArXiv categories configured".to_string());
            run.completed_at = Some(chrono::Utc::now().to_rfc3339());
            self.save_run(&run).await?;
            return Err(WorkerError::NoSchedule);
        }

        let fetch_options = FetchOptions {
            api_key,
            llm_provider: settings.llm_provider.clone(),
            quick_model: match settings.llm_provider {
                LLMProvider::Glm => settings.glm_quick_model.clone(),
                LLMProvider::Claude => settings.claude_quick_model.clone(),
            },
            deep_model: match settings.llm_provider {
                LLMProvider::Glm => settings.glm_deep_model.clone(),
                LLMProvider::Claude => settings.claude_deep_model.clone(),
            },
            categories: all_categories,
            max_papers,
            days_back: Some(1), // Fetch papers from last day
            min_relevance: 50,
            deep_analysis: false, // Skip deep analysis for scheduled runs
            deep_analysis_threshold: None, // Not used for scheduled runs
            analysis_mode: None, // Not used for scheduled runs (deep_analysis is false)
            async_mode: settings.async_analysis_mode.clone(),
            max_concurrent: settings.max_concurrent_analyses,
            language: Some("en".to_string()), // Default to English for scheduled runs
            date_from: None,
            date_to: None,
            fetch_by_id: false, // Scheduled fetch always uses category mode
            arxiv_ids: None, // Not used for scheduled fetch
        };

        // Execute fetch without UI events
        let fetch_manager = FetchManager::new(self.pool.clone());
        let fetch_result = fetch_manager
            .fetch_papers(fetch_options, settings.topics, None)
            .await
            .map_err(|e| {
                self.log(&format!("Fetch failed: {}", e));
                WorkerError::Fetch(e.to_string())
            })?;

        // Update run with results
        run.papers_fetched = fetch_result.papers_fetched as i32;
        run.papers_saved = fetch_result.papers_saved as i32;
        run.status = ScheduleRunStatus::Completed;
        run.completed_at = Some(chrono::Utc::now().to_rfc3339());

        self.save_run(&run).await?;

        let duration = start_time.elapsed();
        self.log(&format!(
            "[{}] Completed: {} papers fetched, {} saved in {:.2}s",
            run.completed_at.as_ref().unwrap(),
            run.papers_fetched,
            run.papers_saved,
            duration.as_secs_f64()
        ));

        Ok(run)
    }

    /// Execute a scheduled fetch cycle with failure recovery
    pub async fn run_with_failure_recovery(&self) -> WorkerResult<ScheduleRun> {
        match self.run_scheduled_fetch().await {
            Ok(run) => Ok(run),
            Err(e) => {
                // Check consecutive failures and auto-disable if needed
                let run_repo = crate::scheduler::ScheduleRunRepository::new(&self.pool);
                match run_repo.count_consecutive_failures().await {
                    Ok(failures) => {
                        const MAX_FAILURES: i32 = 3;
                        if failures >= MAX_FAILURES {
                            self.log(&format!(
                                "Too many consecutive failures ({}), auto-disabling schedule",
                                failures
                            ));

                            // Disable schedule in settings
                            let settings_repo = SettingsRepository::new(&self.pool);
                            if let Ok(mut settings) = settings_repo.get_all().await {
                                settings.schedule_enabled = false;
                                let _ = settings_repo.save_all(&settings).await;
                            }

                            #[cfg(target_os = "macos")]
                            {
                                let _ = crate::scheduler::remove_plist();
                            }
                        }
                    }
                    Err(_) => {}
                }
                Err(e)
            }
        }
    }

    /// Save a schedule run record
    async fn save_run(&self, run: &ScheduleRun) -> WorkerResult<()> {
        // Use ScheduleRunRepository
        let repo = crate::scheduler::ScheduleRunRepository::new(&self.pool);
        repo.save(run)
            .await
            .map_err(|e| WorkerError::Database(e.to_string()))?;
        Ok(())
    }

    /// Log a message to the log file
    fn log(&self, message: &str) {
        let timestamp = chrono::Utc::now().to_rfc3339();
        let log_message = format!("[{}] {}\n", timestamp, message);

        // Print to stdout for visibility
        println!("{}", log_message.trim());

        // Also write to log file
        if let Ok(mut file) = std::fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(&self.log_file)
        {
            use std::io::Write;
            let _ = file.write_all(log_message.as_bytes());
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_worker_creation() {
        // This test just verifies the worker can be created
        // Actual testing requires a database
        let pool = SqlitePool::connect("sqlite::memory:")
            .await
            .unwrap();

        let worker = ScheduledFetchWorker::new(pool);
        assert_eq!(worker.log_file, PathBuf::from("/tmp/paperfuse-scheduler.log"));
    }

    #[tokio::test]
    async fn test_worker_with_custom_log() {
        let pool = SqlitePool::connect("sqlite::memory:")
            .await
            .unwrap();

        let worker = ScheduledFetchWorker::new(pool)
            .with_log_file(PathBuf::from("/tmp/test.log"));
        assert_eq!(worker.log_file, PathBuf::from("/tmp/test.log"));
    }

    #[test]
    fn test_worker_error_display() {
        let err = WorkerError::Database("connection failed".to_string());
        assert_eq!(err.to_string(), "Database error: connection failed");
    }

    #[test]
    fn test_worker_error_fetch() {
        let err = WorkerError::Fetch("timeout".to_string());
        assert_eq!(err.to_string(), "Fetch error: timeout");
    }

    #[test]
    fn test_worker_error_settings() {
        let err = WorkerError::Settings("no api key".to_string());
        assert_eq!(err.to_string(), "Settings error: no api key");
    }

    #[test]
    fn test_worker_error_no_schedule() {
        let err = WorkerError::NoSchedule;
        assert_eq!(err.to_string(), "No schedule configured");
    }

    #[test]
    fn test_worker_error_not_enabled() {
        let err = WorkerError::NotEnabled;
        assert_eq!(err.to_string(), "Schedule not enabled");
    }

    #[test]
    fn test_worker_error_from_io() {
        let io_err = std::io::Error::new(std::io::ErrorKind::NotFound, "file not found");
        let worker_err: WorkerError = io_err.into();
        assert!(matches!(worker_err, WorkerError::Io(_)));
        assert!(worker_err.to_string().contains("IO error"));
    }
}
