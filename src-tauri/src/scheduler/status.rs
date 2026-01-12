//! Schedule status tracking and next run calculation
//!
//! This module provides functionality for tracking the scheduler state,
//! calculating next run times, and managing schedule run history.

use crate::models::{ScheduleFrequency, ScheduleRun, ScheduleRunStatus};
use chrono::{Datelike, Duration, Timelike, Utc};
use sqlx::{SqlitePool, Row};
use thiserror::Error;

/// Errors that can occur during schedule status operations
#[derive(Debug, Error)]
pub enum StatusError {
    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),

    #[error("Invalid schedule time format: {0}")]
    InvalidTimeFormat(String),

    #[error("Invalid weekday: {0}")]
    InvalidWeekday(i32),
}

pub type Result<T> = std::result::Result<T, StatusError>;

/// Calculate next run time based on schedule frequency and time
pub fn calculate_next_run(
    frequency: &ScheduleFrequency,
    time_str: &str,
    week_days: &Option<Vec<i32>>,
) -> Result<String> {
    let (hour, minute) = parse_time(time_str)?;

    let now = Utc::now();
    let next_run = match frequency {
        ScheduleFrequency::Daily => {
            calculate_next_daily_run(now, hour, minute)
        }
        ScheduleFrequency::Weekly => {
            let days = week_days.as_ref().ok_or(StatusError::InvalidWeekday(0))?;
            calculate_next_weekly_run(now, hour, minute, days)?
        }
    };

    Ok(next_run.to_rfc3339())
}

/// Parse time string in "HH:MM" format
fn parse_time(time_str: &str) -> Result<(u32, u32)> {
    let parts: Vec<&str> = time_str.split(':').collect();
    if parts.len() != 2 {
        return Err(StatusError::InvalidTimeFormat(time_str.to_string()));
    }

    let hour: u32 = parts[0]
        .parse()
        .map_err(|_| StatusError::InvalidTimeFormat(time_str.to_string()))?;
    let minute: u32 = parts[1]
        .parse()
        .map_err(|_| StatusError::InvalidTimeFormat(time_str.to_string()))?;

    if hour > 23 || minute > 59 {
        return Err(StatusError::InvalidTimeFormat(time_str.to_string()));
    }

    Ok((hour, minute))
}

/// Calculate next run time for daily schedule
fn calculate_next_daily_run(now: chrono::DateTime<Utc>, hour: u32, minute: u32) -> chrono::DateTime<Utc> {
    let target = now
        .with_hour(hour)
        .and_then(|t| t.with_minute(minute))
        .and_then(|t| t.with_second(0))
        .and_then(|t| t.with_nanosecond(0))
        .unwrap_or_else(|| now + Duration::days(1));

    if target > now {
        target
    } else {
        (target + Duration::days(1))
            .with_hour(hour)
            .and_then(|t| t.with_minute(minute))
            .and_then(|t| t.with_second(0))
            .and_then(|t| t.with_nanosecond(0))
            .unwrap()
    }
}

/// Calculate next run time for weekly schedule
fn calculate_next_weekly_run(
    now: chrono::DateTime<Utc>,
    hour: u32,
    minute: u32,
    week_days: &[i32],
) -> Result<chrono::DateTime<Utc>> {
    if week_days.is_empty() {
        return Err(StatusError::InvalidWeekday(0));
    }

    let current_weekday = now.weekday().num_days_from_monday() as i32; // 0=Monday, 6=Sunday

    // Sort weekdays and find the next valid day
    let mut sorted_days: Vec<i32> = week_days.to_vec();
    sorted_days.sort(); // Note: week_days are 0-6 (0=Monday)

    // Find the next occurrence
    for day in sorted_days {
        let day_diff = day - current_weekday;

        let target = if day_diff > 0 {
            // Later this week
            now + Duration::days(day_diff as i64)
        } else if day_diff < 0 {
            // Next week
            now + Duration::days((7 + day_diff) as i64)
        } else {
            // Same day - check if time has passed
            let target_time = now
                .with_hour(hour)
                .and_then(|t| t.with_minute(minute))
                .and_then(|t| t.with_second(0))
                .and_then(|t| t.with_nanosecond(0))
                .unwrap();

            if target_time > now {
                target_time
            } else {
                // Next week same day
                now + Duration::days(7)
            }
        };

        let result = target
            .with_hour(hour)
            .and_then(|t| t.with_minute(minute))
            .and_then(|t| t.with_second(0))
            .and_then(|t| t.with_nanosecond(0))
            .unwrap();

        return Ok(result);
    }

    Err(StatusError::InvalidWeekday(0))
}

/// Repository for schedule run history
pub struct ScheduleRunRepository {
    pool: SqlitePool,
}

impl ScheduleRunRepository {
    pub fn new(pool: &SqlitePool) -> Self {
        Self { pool: pool.clone() }
    }

    /// Save a schedule run record
    pub async fn save(&self, run: &ScheduleRun) -> Result<()> {
        sqlx::query(
            "INSERT INTO schedule_runs (id, started_at, completed_at, status, papers_fetched, papers_saved, error_message)
             VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(&run.id)
        .bind(&run.started_at)
        .bind(&run.completed_at)
       .bind(match run.status {
            ScheduleRunStatus::Pending => "pending",
            ScheduleRunStatus::Running => "running",
            ScheduleRunStatus::Completed => "completed",
            ScheduleRunStatus::Failed => "failed",
        })
        .bind(run.papers_fetched)
        .bind(run.papers_saved)
        .bind(&run.error_message)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    /// Get recent schedule runs
    pub async fn get_recent(&self, limit: i32) -> Result<Vec<ScheduleRun>> {
        let rows = sqlx::query(
            "SELECT * FROM schedule_runs ORDER BY started_at DESC LIMIT ?"
        )
        .bind(limit)
        .fetch_all(&self.pool)
        .await?;

        rows.iter().map(|row| {
            let status_str: String = row.get("status");
            Ok(ScheduleRun {
                id: row.get("id"),
                started_at: row.get("started_at"),
                completed_at: row.get("completed_at"),
                status: match status_str.as_str() {
                    "pending" => ScheduleRunStatus::Pending,
                    "running" => ScheduleRunStatus::Running,
                    "completed" => ScheduleRunStatus::Completed,
                    "failed" => ScheduleRunStatus::Failed,
                    _ => ScheduleRunStatus::Pending,
                },
                papers_fetched: row.get("papers_fetched"),
                papers_saved: row.get("papers_saved"),
                error_message: row.get("error_message"),
            })
        }).collect()
    }

    /// Get the most recent completed run
    pub async fn get_last_completed(&self) -> Result<Option<ScheduleRun>> {
        let row = sqlx::query(
            "SELECT * FROM schedule_runs WHERE status = 'completed' ORDER BY started_at DESC LIMIT 1"
        )
        .fetch_optional(&self.pool)
        .await?;

        match row {
            Some(row) => {
                let status_str: String = row.get("status");
                Ok(Some(ScheduleRun {
                    id: row.get("id"),
                    started_at: row.get("started_at"),
                    completed_at: row.get("completed_at"),
                    status: match status_str.as_str() {
                        "pending" => ScheduleRunStatus::Pending,
                        "running" => ScheduleRunStatus::Running,
                        "completed" => ScheduleRunStatus::Completed,
                        "failed" => ScheduleRunStatus::Failed,
                        _ => ScheduleRunStatus::Pending,
                    },
                    papers_fetched: row.get("papers_fetched"),
                    papers_saved: row.get("papers_saved"),
                    error_message: row.get("error_message"),
                }))
            }
            None => Ok(None),
        }
    }

    /// Count consecutive failures
    pub async fn count_consecutive_failures(&self) -> Result<i32> {
        let row = sqlx::query(
            "SELECT status FROM schedule_runs ORDER BY started_at DESC LIMIT 10"
        )
        .fetch_all(&self.pool)
        .await?;

        let mut failures = 0;
        for r in row {
            let status: String = r.get("status");
            if status == "failed" {
                failures += 1;
            } else {
                break;
            }
        }

        Ok(failures)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_time_valid() {
        let result = parse_time("09:30");
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), (9, 30));
    }

    #[test]
    fn test_parse_time_invalid() {
        assert!(parse_time("invalid").is_err());
        assert!(parse_time("25:00").is_err());
        assert!(parse_time("12:60").is_err());
    }

    #[test]
    fn test_calculate_next_daily_run() {
        let now = Utc::now();
        let next = calculate_next_daily_run(now, 9, 0);
        assert!(next > now);
    }

    #[test]
    fn test_calculate_next_weekly_run() {
        let now = Utc::now();
        let week_days = vec![0, 2, 4]; // Mon, Wed, Fri
        let result = calculate_next_weekly_run(now, 9, 0, &week_days);
        assert!(result.is_ok());
        assert!(result.unwrap() > now);
    }

    #[test]
    fn test_calculate_next_weekly_run_empty_days() {
        let now = Utc::now();
        let week_days: Vec<i32> = vec![];
        let result = calculate_next_weekly_run(now, 9, 0, &week_days);
        assert!(result.is_err());
    }

    #[test]
    fn test_calculate_next_run_daily() {
        let result = calculate_next_run(&ScheduleFrequency::Daily, "09:00", &None);
        assert!(result.is_ok());

        let next_run_str = result.unwrap();
        let next_run = next_run_str.parse::<chrono::DateTime<Utc>>();
        assert!(next_run.is_ok());
        assert!(next_run.unwrap() > Utc::now());
    }

    #[test]
    fn test_calculate_next_run_weekly() {
        let week_days = Some(vec![0, 2, 4]); // Mon, Wed, Fri
        let result = calculate_next_run(&ScheduleFrequency::Weekly, "09:00", &week_days);
        assert!(result.is_ok());

        let next_run_str = result.unwrap();
        let next_run = next_run_str.parse::<chrono::DateTime<Utc>>();
        assert!(next_run.is_ok());
        assert!(next_run.unwrap() > Utc::now());
    }
}
