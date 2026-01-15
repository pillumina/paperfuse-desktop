//! Platform-specific commands
//!
//! This module provides commands for querying platform capabilities and information.

use serde::Serialize;
use tauri::command;

#[derive(Debug, Clone, Serialize)]
pub struct PlatformInfo {
    pub os: String,
    pub supports_scheduler: bool,
}

/// Get platform information
/// Returns the current OS and which features are supported on this platform
#[command]
pub fn get_platform_info() -> PlatformInfo {
    PlatformInfo {
        os: std::env::consts::OS.to_string(),
        supports_scheduler: cfg!(target_os = "macos"),
    }
}
