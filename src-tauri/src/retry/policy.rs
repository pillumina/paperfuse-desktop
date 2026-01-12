//! Retry policy types and traits
//!
//! Defines the core types for retry decision making and error classification.

use serde::{Deserialize, Serialize};

/// Types of retryable errors
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RetryableError {
    /// Rate limit exceeded (HTTP 429)
    RateLimit,
    /// Server error (HTTP 5xx)
    ServerError,
    /// Request timeout
    Timeout,
    /// Network error (connection failure, DNS error, etc.)
    NetworkError,
}

/// Decision on whether to retry an error
#[derive(Debug, Clone)]
pub struct RetryDecision {
    /// Whether the error is retryable
    pub should_retry: bool,
    /// Type of retryable error (if retryable)
    pub error_type: Option<RetryableError>,
    /// Human-readable reason for the decision
    pub reason: String,
}

impl RetryDecision {
    /// Create a retryable decision
    pub fn retryable(error_type: RetryableError, reason: &str) -> Self {
        Self {
            should_retry: true,
            error_type: Some(error_type),
            reason: reason.to_string(),
        }
    }

    /// Create a non-retryable decision
    pub fn not_retryable(reason: &str) -> Self {
        Self {
            should_retry: false,
            error_type: None,
            reason: reason.to_string(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_retryable_decision() {
        let decision = RetryDecision::retryable(
            RetryableError::RateLimit,
            "Too many requests"
        );

        assert!(decision.should_retry);
        assert_eq!(decision.error_type, Some(RetryableError::RateLimit));
        assert_eq!(decision.reason, "Too many requests");
    }

    #[test]
    fn test_not_retryable_decision() {
        let decision = RetryDecision::not_retryable("Invalid API key");

        assert!(!decision.should_retry);
        assert_eq!(decision.error_type, None);
        assert_eq!(decision.reason, "Invalid API key");
    }
}
