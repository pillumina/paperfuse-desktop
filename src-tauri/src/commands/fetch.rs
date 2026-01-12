//! Tauri commands for paper fetching operations

use crate::database::{FetchHistoryEntry, FetchHistoryRepository, PaperSummary};
use crate::fetch::{FetchError, FetchManager};
use crate::models::{FetchOptions, FetchStatus, TopicConfig};
use serde::Serialize;
use sqlx::SqlitePool;
use std::sync::Arc;
use tauri::{AppHandle, Emitter, State};
use tokio::sync::Mutex;

/// Error information for frontend
#[derive(Serialize, Clone)]
struct FetchErrorInfo {
    error_type: String,
    message: String,
    is_retryable: bool,
}

impl From<&FetchError> for FetchErrorInfo {
    fn from(err: &FetchError) -> Self {
        FetchErrorInfo {
            error_type: err.error_type().to_string(),
            message: err.to_string(),
            is_retryable: err.is_retryable(),
        }
    }
}

/// Global fetch manager state
pub struct FetchManagerState(Arc<Mutex<Option<Arc<FetchManager>>>>);

impl FetchManagerState {
    pub fn new() -> Self {
        Self(Arc::new(Mutex::new(None)))
    }

    pub async fn get_or_init(&self, pool: &SqlitePool) -> Arc<FetchManager> {
        let mut guard = self.0.lock().await;
        if guard.is_none() {
            *guard = Some(Arc::new(FetchManager::new(pool.clone())));
        }
        guard.as_ref().unwrap().clone()
    }
}

/// Start a paper fetch operation
#[tauri::command]
pub async fn start_fetch(
    app: AppHandle,
    pool: State<'_, SqlitePool>,
    manager_state: State<'_, FetchManagerState>,
    options: FetchOptions,
    topics: Vec<TopicConfig>,
) -> Result<String, String> {
    eprintln!("[start_fetch] Command called with options: {:?}", options);
    eprintln!("[start_fetch] Topics count: {}", topics.len());
    for (i, topic) in topics.iter().enumerate() {
        eprintln!("[start_fetch] Topic {}: key={}, label={}, keywords={:?}", i, topic.key, topic.label, topic.keywords);
    }

    let manager = manager_state.get_or_init(pool.inner()).await;

    // Emit fetch-started event
    // Note: FetchGuard inside fetch_papers() will atomically prevent concurrent fetches
    // The small race window between this event emission and lock acquisition is acceptable
    // as any concurrent request will fail immediately when trying to acquire the lock
    eprintln!("[start_fetch] Emitting fetch-started event");
    let _ = app.emit("fetch-started", ());

    // Create event emitter callback
    let app_handle = app.clone();
    let emitter = move |status: FetchStatus| {
        eprintln!("[start_fetch] Emitting fetch-progress: {:?}", status);
        let _ = app_handle.emit("fetch-progress", status);
    };

    // Start fetch in background
    // FetchGuard inside fetch_papers() provides atomic, race-condition-free locking
    // No separate is_fetching() check needed here (was TOCTOU vulnerability)
    let manager_clone = manager.clone();
    tauri::async_runtime::spawn(async move {
        eprintln!("[start_fetch] Background task started");
        let result = manager_clone
            .fetch_papers(options, topics, Some(Arc::new(emitter)))
            .await;

        eprintln!("[start_fetch] Fetch completed with result: {:?}", result);

        // Emit completion event
        let completion_status = match result {
            Ok(result) => {
                eprintln!("[start_fetch] Fetch successful, emitting completed event");
                serde_json::json!({
                    "status": "completed",
                    "papers_fetched": result.papers_fetched,
                    "papers_analyzed": result.papers_analyzed,
                    "papers_saved": result.papers_saved,
                    "papers_filtered": result.papers_filtered,
                    "errors": result.errors,
                })
            }
            Err(FetchError::Cancelled) => {
                eprintln!("[start_fetch] Fetch was cancelled");
                serde_json::json!({
                    "status": "cancelled",
                    "error": {
                        "error_type": "cancelled",
                        "message": "Fetch was cancelled by user",
                        "is_retryable": false,
                    }
                })
            }
            Err(e) => {
                eprintln!("[start_fetch] Fetch failed with error: {}", e);
                let error_info: FetchErrorInfo = (&e).into();
                serde_json::json!({
                    "status": "error",
                    "error": error_info
                })
            }
        };

        eprintln!("[start_fetch] Emitting fetch-complete event: {}", completion_status);
        let _ = app.emit("fetch-complete", completion_status);
    });

    eprintln!("[start_fetch] Background task spawned, returning success");
    Ok("Fetch started".to_string())
}

/// Get current fetch status
#[tauri::command]
pub async fn get_fetch_status(
    pool: State<'_, SqlitePool>,
    manager_state: State<'_, FetchManagerState>,
) -> Result<FetchStatus, String> {
    let manager = manager_state.get_or_init(pool.inner()).await;
    Ok(manager.get_status().await)
}

/// Check if a fetch is currently in progress
#[tauri::command]
pub async fn is_fetching(
    pool: State<'_, SqlitePool>,
    manager_state: State<'_, FetchManagerState>,
) -> Result<bool, String> {
    let manager = manager_state.get_or_init(pool.inner()).await;
    Ok(manager.is_fetching().await)
}

/// Cancel the current fetch operation
#[tauri::command]
pub async fn cancel_fetch(
    pool: State<'_, SqlitePool>,
    manager_state: State<'_, FetchManagerState>,
) -> Result<(), String> {
    let manager = manager_state.get_or_init(pool.inner()).await;
    manager
        .cancel_fetch()
        .await
        .map_err(|e| e.to_string())
}

/// Get fetch history
#[tauri::command]
pub async fn get_fetch_history(
    pool: State<'_, SqlitePool>,
    limit: Option<i32>,
) -> Result<Vec<FetchHistoryEntry>, String> {
    let repo = FetchHistoryRepository::new(pool.inner());
    repo.get_all(limit)
        .await
        .map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_fetch_error_info_from_rate_limit() {
        let err = FetchError::LlmRateLimitError;
        let info = FetchErrorInfo::from(&err);
        assert_eq!(info.error_type, "llm_rate_limit");
        assert!(info.is_retryable);
        assert!(info.message.contains("rate limit"));
    }

    #[test]
    fn test_fetch_error_info_from_auth() {
        let err = FetchError::LlmAuthError;
        let info = FetchErrorInfo::from(&err);
        assert_eq!(info.error_type, "llm_auth");
        assert!(!info.is_retryable);
        assert!(info.message.contains("authentication"));
    }

    #[test]
    fn test_fetch_error_info_from_network() {
        let err = FetchError::NetworkError("timeout".to_string());
        let info = FetchErrorInfo::from(&err);
        assert_eq!(info.error_type, "network");
        assert!(info.is_retryable);
        assert!(info.message.contains("timeout"));
    }

    #[test]
    fn test_fetch_error_info_from_cancelled() {
        let err = FetchError::Cancelled;
        let info = FetchErrorInfo::from(&err);
        assert_eq!(info.error_type, "cancelled");
        assert!(!info.is_retryable);
        assert!(info.message.contains("Cancelled"));
    }

    #[test]
    fn test_fetch_manager_state_new() {
        let state = FetchManagerState::new();
        // Just verify it creates without panic
        assert_eq!(state.0.try_lock().is_ok(), true);
    }
}
