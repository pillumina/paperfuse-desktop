//! macOS launchd integration for scheduled task management
//!
//! This module provides functionality for creating, installing, and managing
//! launchd plist files for background scheduled execution.

use crate::models::{ScheduleFrequency, Settings};
use std::fs;
use std::path::PathBuf;
use std::process::Command;
use thiserror::Error;

/// Errors that can occur during launchd operations
#[derive(Debug, Error)]
pub enum LaunchdError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Invalid schedule configuration: {0}")]
    InvalidSchedule(String),

    #[error("launchctl command failed: {0}")]
    LaunchctlFailed(String),

    #[error("App path not found")]
    AppPathNotFound,

    #[error("Plist file not found")]
    PlistNotFound,
}

pub type LaunchdResult<T> = std::result::Result<T, LaunchdError>;

/// Launchd job identifier
const LAUNCHD_LABEL: &str = "com.paperfuse.app";

/// Get the path to the launchd plist file
pub fn get_plist_path() -> PathBuf {
    let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
    PathBuf::from(home)
        .join("Library")
        .join("LaunchAgents")
        .join(format!("{}.plist", LAUNCHD_LABEL))
}

/// Get the path to the app executable
pub fn get_app_executable_path() -> LaunchdResult<PathBuf> {
    // During development, use cargo run path
    // In production, this will be the .app bundle path
    let exe = std::env::current_exe()?;

    // If running from target/debug or target/release, get the project root
    if exe.to_string_lossy().contains("target/") {
        // Development mode - use the cargo command
        Ok(exe)
    } else {
        // Production mode - app is in .app bundle
        Ok(exe)
    }
}

/// Generate launchd plist content
fn generate_plist_content(
    app_path: &PathBuf,
    frequency: &ScheduleFrequency,
    time_str: &str,
    week_days: &Option<Vec<i32>>,
) -> LaunchdResult<String> {
    let (hour, minute) = parse_time(time_str)?;

    let content = match frequency {
        ScheduleFrequency::Daily => {
            format!(
                r#"<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>{}</string>
    <key>ProgramArguments</key>
    <array>
        <string>{}</string>
        <string>--scheduled-fetch</string>
    </array>
    <key>StartCalendarInterval</key>
    <dict>
        <key>Hour</key>
        <integer>{}</integer>
        <key>Minute</key>
        <integer>{}</integer>
    </dict>
    <key>StandardOutPath</key>
    <string>/tmp/paperfuse-scheduler.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/paperfuse-scheduler.error.log</string>
</dict>
</plist>
"#,
                LAUNCHD_LABEL,
                app_path.display(),
                hour,
                minute
            )
        }
        ScheduleFrequency::Weekly => {
            let days = week_days.as_ref().ok_or_else(|| {
                LaunchdError::InvalidSchedule("Week days not specified for weekly schedule".to_string())
            })?;

            if days.is_empty() {
                return Err(LaunchdError::InvalidSchedule("No weekdays specified".to_string()));
            }

            // Create multiple StartCalendarInterval entries for each weekday
            let mut intervals = String::new();
            for day in days {
                // launchd uses 0=Sunday, 1=Monday, ..., 6=Saturday
                // Our system uses 0=Monday, so we need to convert
                let launchd_day = if *day == 6 { 0 } else { *day + 1 };

                intervals.push_str(&format!(
                    "    <dict>\n\
                        <key>Weekday</key>\n\
                        <integer>{}</integer>\n\
                        <key>Hour</key>\n\
                        <integer>{}</integer>\n\
                        <key>Minute</key>\n\
                        <integer>{}</integer>\n\
                    </dict>\n",
                    launchd_day, hour, minute
                ));
            }

            format!(
                r#"<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>{}</string>
    <key>ProgramArguments</key>
    <array>
        <string>{}</string>
        <string>--scheduled-fetch</string>
    </array>
    <key>StartCalendarInterval</key>
    <array>
{}</array>
    <key>StandardOutPath</key>
    <string>/tmp/paperfuse-scheduler.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/paperfuse-scheduler.error.log</string>
</dict>
</plist>
"#,
                LAUNCHD_LABEL,
                app_path.display(),
                intervals
            )
        }
    };

    Ok(content)
}

/// Parse time string in "HH:MM" format
fn parse_time(time_str: &str) -> LaunchdResult<(u32, u32)> {
    let parts: Vec<&str> = time_str.split(':').collect();
    if parts.len() != 2 {
        return Err(LaunchdError::InvalidSchedule(format!(
            "Invalid time format: {}. Expected HH:MM",
            time_str
        )));
    }

    let hour: u32 = parts[0]
        .parse()
        .map_err(|_| LaunchdError::InvalidSchedule(format!("Invalid hour: {}", parts[0])))?;
    let minute: u32 = parts[1]
        .parse()
        .map_err(|_| LaunchdError::InvalidSchedule(format!("Invalid minute: {}", parts[1])))?;

    if hour > 23 || minute > 59 {
        return Err(LaunchdError::InvalidSchedule(format!(
            "Invalid time: {}:{}",
            hour, minute
        )));
    }

    Ok((hour, minute))
}

/// Check if launchd job is currently loaded
pub fn is_loaded() -> LaunchdResult<bool> {
    let output = Command::new("launchctl")
        .args(&["list", LAUNCHD_LABEL])
        .output()?;

    Ok(output.status.success())
}

/// Install and load the launchd plist
pub fn install_plist(settings: &Settings) -> LaunchdResult<()> {
    if !settings.schedule_enabled {
        return Err(LaunchdError::InvalidSchedule(
            "Schedule is not enabled".to_string(),
        ));
    }

    let time = settings.schedule_time.as_ref().ok_or_else(|| {
        LaunchdError::InvalidSchedule("Schedule time not specified".to_string())
    })?;

    let app_path = get_app_executable_path()?;
    let plist_content = generate_plist_content(
        &app_path,
        &settings.schedule_frequency,
        time,
        &settings.schedule_week_days,
    )?;

    let plist_path = get_plist_path();

    // Ensure LaunchAgents directory exists
    if let Some(parent) = plist_path.parent() {
        fs::create_dir_all(parent)?;
    }

    // Write plist file
    fs::write(&plist_path, plist_content)?;

    // Load the job
    load_plist()?;

    Ok(())
}

/// Load the launchd plist
pub fn load_plist() -> LaunchdResult<()> {
    let plist_path = get_plist_path();

    if !plist_path.exists() {
        return Err(LaunchdError::PlistNotFound);
    }

    let output = Command::new("launchctl")
        .args(&["load", &plist_path.to_string_lossy()])
        .output()?;

    if !output.status.success() {
        let error = String::from_utf8_lossy(&output.stderr);
        return Err(LaunchdError::LaunchctlFailed(error.to_string()));
    }

    Ok(())
}

/// Unload the launchd plist
pub fn unload_plist() -> LaunchdResult<()> {
    let plist_path = get_plist_path();

    if !plist_path.exists() {
        // Already unloaded, consider this success
        return Ok(());
    }

    // First try to unload the job
    let _ = Command::new("launchctl")
        .args(&["unload", &plist_path.to_string_lossy()])
        .output();

    // Then remove the plist file
    fs::remove_file(&plist_path)?;

    Ok(())
}

/// Remove the launchd plist (unload and delete)
pub fn remove_plist() -> LaunchdResult<()> {
    unload_plist()
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
    fn test_generate_plist_daily() {
        let app_path = PathBuf::from("/usr/local/bin/paperfuse");
        let content = generate_plist_content(
            &app_path,
            &ScheduleFrequency::Daily,
            "09:00",
            &None,
        );

        assert!(content.is_ok());
        let plist = content.unwrap();
        assert!(plist.contains("com.paperfuse.app"));
        assert!(plist.contains("--scheduled-fetch"));
        assert!(plist.contains("<key>Hour</key>"));
        assert!(plist.contains("<integer>9</integer>"));
        assert!(plist.contains("<key>Minute</key>"));
        assert!(plist.contains("<integer>0</integer>"));
    }

    #[test]
    fn test_generate_plist_weekly() {
        let app_path = PathBuf::from("/usr/local/bin/paperfuse");
        let week_days = Some(vec![0, 2, 4]); // Mon, Wed, Fri
        let content = generate_plist_content(
            &app_path,
            &ScheduleFrequency::Weekly,
            "09:00",
            &week_days,
        );

        assert!(content.is_ok());
        let plist = content.unwrap();
        assert!(plist.contains("com.paperfuse.app"));
        assert!(plist.contains("--scheduled-fetch"));
        // Weekday 1 (Monday in launchd) for day 0 (Monday in our system)
        assert!(plist.contains("<key>Weekday</key>"));
    }

    #[test]
    fn test_generate_plist_weekly_no_days() {
        let app_path = PathBuf::from("/usr/local/bin/paperfuse");
        let result = generate_plist_content(
            &app_path,
            &ScheduleFrequency::Weekly,
            "09:00",
            &Some(vec![]),
        );

        assert!(result.is_err());
    }

    #[test]
    fn test_get_plist_path() {
        let path = get_plist_path();
        assert!(path.to_string_lossy().contains("LaunchAgents"));
        assert!(path.to_string_lossy().contains("com.paperfuse.app.plist"));
    }
}
