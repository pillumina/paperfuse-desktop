//! Retry module for LLM API calls
//!
//! Provides a decoupled, configurable retry mechanism with exponential backoff,
//! provider-specific error classification, and comprehensive logging.

pub mod classifier;
pub mod executor;
pub mod policy;
pub mod strategy;

// Re-export commonly used types
pub use executor::RetryExecutor;
