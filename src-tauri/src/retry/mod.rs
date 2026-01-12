//! Retry module for LLM API calls
//!
//! Provides a decoupled, configurable retry mechanism with exponential backoff,
//! provider-specific error classification, and comprehensive logging.

pub mod classifier;
pub mod executor;
pub mod policy;
pub mod strategy;

// Re-export commonly used types
pub use classifier::{ErrorClassifier, get_classifier};
pub use executor::RetryExecutor;
pub use policy::{RetryDecision, RetryableError};
pub use strategy::{calculate_backoff, has_time_budget};

// Re-export RetryConfig from settings
pub use crate::models::settings::RetryConfig;
