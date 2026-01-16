//! Tauri commands for scheduler management
//!
//! This module provides Tauri commands for enabling/disabling schedules,
//! checking status, triggering manual runs, and viewing history.

use crate::database::SettingsRepository;
use crate::models::{ScheduleRun, ScheduleStatus};
use crate::scheduler::{calculate_next_run, ScheduleRunRepository};

#[cfg(target_os = "macos")]
use crate::scheduler::{install_plist, remove_plist};

use sqlx::SqlitePool;
use std::sync::Arc;
use tauri::State;
use tokio::sync::Mutex;

/// Maximum consecutive failures before auto-disabling schedule
const MAX_CONSECUTIVE_FAILURES: i32 = 3;

/// State for tracking scheduler operations
pub struct SchedulerState {
    pub is_running: Arc<Mutex<bool>>,
}

impl SchedulerState {
    pub fn new() -> Self {
        Self {
            is_running: Arc::new(Mutex::new(false)),
        }
    }
}

/// Validate time format (HH:MM)
fn validate_time_format(time: &str) -> Result<(), String> {
    let parts: Vec<&str> = time.split(':').collect();
    if parts.len() != 2 {
        return Err("Invalid time format. Use HH:MM (24-hour format)".to_string());
    }

    let hour: u32 = parts[0]
        .parse()
        .map_err(|_| "Invalid hour. Must be 00-23".to_string())?;
    let minute: u32 = parts[1]
        .parse()
        .map_err(|_| "Invalid minute. Must be 00-59".to_string())?;

    if hour > 23 {
        return Err("Hour must be between 00 and 23".to_string());
    }
    if minute > 59 {
        return Err("Minute must be between 00 and 59".to_string());
    }

    Ok(())
}

/// Validate week days selection
fn validate_week_days(week_days: &Option<Vec<i32>>) -> Result<(), String> {
    if let Some(days) = week_days {
        if days.is_empty() {
            return Err("At least one day must be selected for weekly schedule".to_string());
        }
        for &day in days {
            if day < 0 || day > 6 {
                return Err(format!("Invalid weekday: {}. Must be 0-6 (0=Monday, 6=Sunday)", day));
            }
        }
    }
    Ok(())
}

/// Enable the schedule
#[tauri::command]
pub async fn enable_schedule(
    pool: State<'_, SqlitePool>,
    scheduler_state: State<'_, SchedulerState>,
) -> Result<ScheduleStatus, String> {
    // Check if already running
    {
        let running = scheduler_state.is_running.lock().await;
        if *running {
            return Err("A fetch is already running".to_string());
        }
    }

    // Load settings
    let settings_repo = SettingsRepository::new(&*pool);
    let settings = settings_repo
        .get_all()
        .await
        .map_err(|e| format!("Failed to load settings: {}", e))?;

    // Validate schedule configuration
    if settings.schedule_time.is_none() {
        return Err("Schedule time is not configured. Please set a time in the schedule settings.".to_string());
    }

    // Validate time format
    let time = settings.schedule_time.as_ref().unwrap();
    validate_time_format(time)?;

    // Validate week days for weekly schedule
    if settings.schedule_frequency == crate::models::ScheduleFrequency::Weekly {
        validate_week_days(&settings.schedule_week_days)?;
    }

    // Check if topics are configured
    if settings.topics.is_empty() {
        return Err("No topics configured. Please add at least one research topic in the settings.".to_string());
    }

    // Check if any topics have ArXiv categories
    let has_categories = settings.topics.iter()
        .any(|t| t.arxiv_categories.as_ref().map_or(false, |cats| !cats.is_empty()));
    if !has_categories {
        return Err("No ArXiv categories configured. Please add ArXiv categories to at least one topic.".to_string());
    }

    // Check API key
    let api_key = match settings.llm_provider {
        crate::models::LLMProvider::Glm => &settings.glm_api_key,
        crate::models::LLMProvider::Claude => &settings.claude_api_key,
    };

    if api_key.is_none() {
        return Err("API key is not configured. Please add your API key in the settings.".to_string());
    }

    // Check consecutive failures
    let run_repo = ScheduleRunRepository::new(&*pool);
    let consecutive_failures = run_repo
        .count_consecutive_failures()
        .await
        .map_err(|e| format!("Failed to check failures: {}", e))?;

    if consecutive_failures >= MAX_CONSECUTIVE_FAILURES {
        return Err(format!(
            "Schedule has failed {} times consecutively. Please check the error logs and fix any configuration issues before re-enabling.",
            consecutive_failures
        ));
    }

    // Enable schedule
    let mut settings = settings;
    settings.schedule_enabled = true;
    settings_repo
        .save_all(&settings)
        .await
        .map_err(|e| format!("Failed to save settings: {}", e))?;

    // Install launchd plist
    #[cfg(target_os = "macos")]
    {
        install_plist(&settings).map_err(|e| {
            if e.to_string().contains("Permission denied") || e.to_string().contains("launchctl") {
                format!("Failed to install schedule: Permission denied. Please grant necessary permissions in System Preferences > Privacy & Security > Automation.")
            } else {
                format!("Failed to install schedule: {}", e)
            }
        })?;
    }

    // Calculate next run time
    let next_run_time = calculate_next_run(
        &settings.schedule_frequency,
        settings.schedule_time.as_ref().unwrap(),
        &settings.schedule_week_days,
    )
    .map_err(|e| format!("Failed to calculate next run: {}", e))?;

    Ok(ScheduleStatus {
        enabled: true,
        next_run_time: Some(next_run_time),
        last_run_time: None,
        last_run_status: None,
        consecutive_failures: 0,
    })
}

/// Disable the schedule
#[tauri::command]
pub async fn disable_schedule(
    pool: State<'_, SqlitePool>,
) -> Result<ScheduleStatus, String> {
    // Load settings
    let settings_repo = SettingsRepository::new(&*pool);
    let mut settings = settings_repo
        .get_all()
        .await
        .map_err(|e| format!("Failed to load settings: {}", e))?;

    // Disable schedule
    settings.schedule_enabled = false;
    settings_repo
        .save_all(&settings)
        .await
        .map_err(|e| format!("Failed to save settings: {}", e))?;

    // Remove launchd plist
    #[cfg(target_os = "macos")]
    {
        remove_plist().map_err(|e| format!("Failed to remove schedule: {}", e))?;
    }

    Ok(ScheduleStatus {
        enabled: false,
        next_run_time: None,
        last_run_time: None,
        last_run_status: None,
        consecutive_failures: 0,
    })
}

/// Get current schedule status
#[tauri::command]
pub async fn get_schedule_status(
    pool: State<'_, SqlitePool>,
) -> Result<ScheduleStatus, String> {
    // Load settings
    let settings_repo = SettingsRepository::new(&*pool);
    let settings = settings_repo
        .get_all()
        .await
        .map_err(|e| format!("Failed to load settings: {}", e))?;

    // Get last run
    let run_repo = ScheduleRunRepository::new(&*pool);
    let last_run = run_repo
        .get_last_completed()
        .await
        .map_err(|e| format!("Failed to get last run: {}", e))?;

    // Count consecutive failures
    let consecutive_failures = run_repo
        .count_consecutive_failures()
        .await
        .map_err(|e| format!("Failed to count failures: {}", e))?;

    // Calculate next run time if enabled
    let next_run_time = if settings.schedule_enabled {
        if let Some(time) = &settings.schedule_time {
            Some(
                calculate_next_run(
                    &settings.schedule_frequency,
                    time,
                    &settings.schedule_week_days,
                )
                .map_err(|e| format!("Failed to calculate next run: {}", e))?,
            )
        } else {
            None
        }
    } else {
        None
    };

    Ok(ScheduleStatus {
        enabled: settings.schedule_enabled,
        next_run_time,
        last_run_time: last_run.as_ref().and_then(|r| Some(r.started_at.clone())),
        last_run_status: last_run.map(|r| r.status),
        consecutive_failures,
    })
}

/// Trigger a scheduled fetch immediately
#[tauri::command]
pub async fn trigger_scheduled_fetch_now(
    pool: State<'_, SqlitePool>,
    scheduler_state: State<'_, SchedulerState>,
) -> Result<String, String> {
    // Check if already running
    {
        let mut running = scheduler_state.is_running.lock().await;
        if *running {
            return Err("A fetch is already running".to_string());
        }
        *running = true;
    }

    // Clone pool inner for the async task
    let pool_inner = pool.inner().clone();

    // Spawn background task
    tauri::async_runtime::spawn(async move {
        let worker = crate::scheduler::ScheduledFetchWorker::new(pool_inner);

        match worker.run_scheduled_fetch().await {
            Ok(run) => {
                println!("Manual fetch completed: {} papers saved", run.papers_saved);
            }
            Err(e) => {
                eprintln!("Manual fetch failed: {}", e);
            }
        }
    });

    Ok("Fetch started".to_string())
}

/// Get schedule run history
#[tauri::command]
pub async fn get_schedule_history(
    pool: State<'_, SqlitePool>,
    limit: Option<i32>,
) -> Result<Vec<ScheduleRun>, String> {
    let run_repo = ScheduleRunRepository::new(&*pool);
    let runs = run_repo
        .get_recent(limit.unwrap_or(10))
        .await
        .map_err(|e| format!("Failed to get history: {}", e))?;

    Ok(runs)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_scheduler_state_creation() {
        let state = SchedulerState::new();
        // Just verify it can be created
        assert!(Arc::strong_count(&state.is_running) >= 1);
    }

    #[test]
    fn test_validate_time_format_valid() {
        assert!(validate_time_format("00:00").is_ok());
        assert!(validate_time_format("12:30").is_ok());
        assert!(validate_time_format("23:59").is_ok());
        assert!(validate_time_format("09:05").is_ok());
    }

    #[test]
    fn test_validate_time_format_invalid_parts() {
        assert!(validate_time_format("invalid").is_err());
        assert!(validate_time_format("12").is_err());
        assert!(validate_time_format("12:30:45").is_err());
        assert!(validate_time_format("").is_err());
    }

    #[test]
    fn test_validate_time_format_invalid_hour() {
        assert!(validate_time_format("24:00").is_err());
        assert!(validate_time_format("25:30").is_err());
        assert!(validate_time_format("-1:00").is_err());
        assert!(validate_time_format("ab:00").is_err());
    }

    #[test]
    fn test_validate_time_format_invalid_minute() {
        assert!(validate_time_format("12:60").is_err());
        assert!(validate_time_format("12:99").is_err());
        assert!(validate_time_format("12:-1").is_err());
        assert!(validate_time_format("12:ab").is_err());
    }

    #[test]
    fn test_validate_week_days_valid() {
        assert!(validate_week_days(&None).is_ok());
        assert!(validate_week_days(&Some(vec![0])).is_ok());
        assert!(validate_week_days(&Some(vec![0, 1, 2, 3, 4, 5, 6])).is_ok());
        assert!(validate_week_days(&Some(vec![3, 5])).is_ok());
    }

    #[test]
    fn test_validate_week_days_invalid_empty() {
        assert!(validate_week_days(&Some(vec![])).is_err());
    }

    #[test]
    fn test_validate_week_days_invalid_range() {
        assert!(validate_week_days(&Some(vec![-1])).is_err());
        assert!(validate_week_days(&Some(vec![7])).is_err());
        assert!(validate_week_days(&Some(vec![0, 1, 10])).is_err());
    }

    #[test]
    fn test_max_consecutive_failures_const() {
        assert_eq!(MAX_CONSECUTIVE_FAILURES, 3);
    }
}
