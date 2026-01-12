//! # Scheduler Module
//!
//! This module provides macOS launchd integration for scheduled background
//! paper fetching. It includes status tracking, plist management, and
//! background worker execution.
//!
//! ## Features
//!
//! - **launchd Integration**: Automatic scheduling using macOS launchd
//! - **Status Tracking**: Monitor scheduler state and execution history
//! - **Failure Recovery**: Auto-disable after 3 consecutive failures
//! - **Background Worker**: Headless execution for scheduled tasks
//!
//! ## Modules
//!
//! - [`status`]: Status tracking and next run calculation
//! - [`launchd`]: macOS launchd plist management (macOS only)
//! - [`worker`]: Background fetch worker

pub mod status;
pub mod worker;
#[cfg(target_os = "macos")]
pub mod launchd;

pub use status::{calculate_next_run, ScheduleRunRepository};

pub use worker::ScheduledFetchWorker;

#[cfg(target_os = "macos")]
pub use launchd::{install_plist, remove_plist};
