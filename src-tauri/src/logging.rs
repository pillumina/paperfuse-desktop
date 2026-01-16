//! Logging initialization and configuration
//!
//! Development mode: colored console output
//! Release mode: file output in user data directory

use std::path::PathBuf;
use tracing_subscriber::{fmt, layer::SubscriberExt, EnvFilter};

/// Get the log directory path
/// Platform-specific application data directories:
/// - macOS: ~/Library/Logs/com.paperfuse.app/
/// - Windows: %APPDATA%\com.paperfuse.app\logs\
/// - Linux: ~/.local/share/com.paperfuse.app/logs/
fn get_log_dir() -> PathBuf {
    #[cfg(target_os = "macos")]
    {
        if let Some(home) = std::env::var_os("HOME") {
            let mut path = std::path::PathBuf::from(&home);
            path.push("Library");
            path.push("Logs");
            path.push("com.paperfuse.app");
            return path;
        }
    }

    #[cfg(target_os = "windows")]
    {
        if let Some(appdata) = std::env::var_os("APPDATA") {
            let mut path = std::path::PathBuf::from(&appdata);
            path.push("com.paperfuse.app");
            path.push("logs");
            return path;
        }
    }

    #[cfg(target_os = "linux")]
    {
        if let Some(home) = std::env::var_os("HOME") {
            let mut path = std::path::PathBuf::from(&home);
            path.push(".local");
            path.push("share");
            path.push("com.paperfuse.app");
            path.push("logs");
            return path;
        }
    }

    // Fallback to current directory
    std::env::current_dir()
        .unwrap_or_else(|_| std::path::PathBuf::from("."))
        .join("logs")
}

/// Initialize the logging system
///
/// # Behavior
/// - **Debug builds**: Colored console output with INFO level
/// - **Release builds**: File output with INFO level, stored in user data directory
pub fn init_logging() {
    let env_filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new("info"));

    #[cfg(debug_assertions)]
    {
        // Development mode: colored console output
        let subscriber = tracing_subscriber::registry()
            .with(env_filter)
            .with(fmt::layer()
                .with_target(true)
                .with_thread_ids(false)
                .with_file(true)
                .with_line_number(true));

        tracing::subscriber::set_global_default(subscriber)
            .expect("Failed to set tracing subscriber");

        tracing::info!(
            log_dir = ?get_log_dir(),
            "Logging initialized (console mode)"
        );
    }

    #[cfg(not(debug_assertions))]
    {
        // Release mode: file output
        let log_dir = get_log_dir();

        // Create log directory if it doesn't exist
        std::fs::create_dir_all(&log_dir).unwrap_or_else(|e| {
            eprintln!("Failed to create log directory {:?}: {}", log_dir, e);
        });

        // Get current date for log file name
        let now = chrono::Local::now();
        let log_file_name = format!("paperfuse_{}.log", now.format("%Y%m%d"));
        let log_file_path = log_dir.join(&log_file_name);

        // Create file appender with rotation
        let file_appender = tracing_appender::rolling::never(&log_dir, log_file_name);

        let subscriber = tracing_subscriber::registry()
            .with(env_filter)
            .with(fmt::layer()
                .with_writer(file_appender)
                .with_target(true)
                .with_thread_ids(false)
                .with_ansi(false)); // No colors in file

        tracing::subscriber::set_global_default(subscriber)
            .expect("Failed to set tracing subscriber");

        tracing::info!(
            log_dir = ?log_dir,
            log_file = %log_file_name,
            "Logging initialized (file mode)"
        );

        // Also print to console on startup for visibility
        println!("PaperFuse log directory: {}", log_dir.display());
        println!("Log file: {}", log_file_name);
    }
}

/// Get the path to the current log file
#[allow(dead_code)]
pub fn get_log_file_path() -> Option<PathBuf> {
    #[cfg(not(debug_assertions))]
    {
        let log_dir = get_log_dir();
        let now = chrono::Local::now();
        let log_file_name = format!("paperfuse_{}.log", now.format("%Y%m%d"));
        Some(log_dir.join(&log_file_name))
    }

    #[cfg(debug_assertions)]
    {
        None // Debug mode doesn't write to file
    }
}

/// Open the log directory in the system file explorer
#[cfg(not(debug_assertions))]
pub fn open_log_directory() -> Result<(), String> {
    let log_dir = get_log_dir();

    // Check if directory exists
    if !log_dir.exists() {
        return Err(format!("Log directory does not exist: {}", log_dir.display()));
    }

    // Open in system file explorer
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(&log_dir)
            .spawn()
            .map_err(|e| format!("Failed to open log directory: {}", e))?;
    }

    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&log_dir)
            .spawn()
            .map_err(|e| format!("Failed to open log directory: {}", e))?;
    }

    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&log_dir)
            .spawn()
            .map_err(|e| format!("Failed to open log directory: {}", e))?;
    }

    Ok(())
}
