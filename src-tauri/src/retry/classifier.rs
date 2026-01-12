//! Provider-specific error classification for retry decisions
//!
//! Defines how to classify errors and determine retry eligibility per LLM provider.

use crate::llm::LlmError;
use crate::models::LLMProvider;
use crate::retry::policy::{RetryDecision, RetryableError};

/// Trait for classifying errors and determining retry eligibility
pub trait ErrorClassifier: Send + Sync {
    /// Classify error and return retry decision
    fn classify(&self, error: &LlmError) -> RetryDecision;
}

/// GLM (ZhipuAI) error classifier
///
/// # Retry Policy
/// - **Retry on**: 429 (rate limit), 500-599 (server errors), network errors, timeouts
/// - **Don't retry on**: 400 (bad request), 401 (auth), 403 (forbidden), parse errors
pub struct GlmErrorClassifier;

impl ErrorClassifier for GlmErrorClassifier {
    fn classify(&self, error: &LlmError) -> RetryDecision {
        match error {
            // HTTP request errors with status codes
            LlmError::RequestError(reqwest_err) => {
                let status = reqwest_err.status();

                match status {
                    Some(s) if s.as_u16() == 429 => {
                        // Rate limit - retry with backoff
                        RetryDecision::retryable(
                            RetryableError::RateLimit,
                            &format!("GLM rate limit exceeded (429) - {}", s.canonical_reason().unwrap_or("Too Many Requests")),
                        )
                    }
                    Some(s) if s.as_u16() == 401 => {
                        // Unauthorized - don't retry (invalid/expired API key)
                        RetryDecision::not_retryable(
                            &format!("GLM authentication failed (401) - check API key: {}", s.canonical_reason().unwrap_or("Unauthorized")),
                        )
                    }
                    Some(s) if s.as_u16() == 400 => {
                        // Bad request - don't retry (invalid parameters)
                        RetryDecision::not_retryable(
                            &format!("GLM bad request (400) - check request format: {}", s.canonical_reason().unwrap_or("Bad Request")),
                        )
                    }
                    Some(s) if s.as_u16() == 403 => {
                        // Forbidden - don't retry (insufficient permissions)
                        RetryDecision::not_retryable(
                            &format!("GLM forbidden (403) - insufficient permissions: {}", s.canonical_reason().unwrap_or("Forbidden")),
                        )
                    }
                    Some(s) if s.as_u16() >= 500 => {
                        // Server errors - retry
                        RetryDecision::retryable(
                            RetryableError::ServerError,
                            &format!("GLM server error ({}) - {}", s.as_u16(), s.canonical_reason().unwrap_or("Internal Server Error")),
                        )
                    }
                    Some(s) => {
                        // Other status codes - don't retry by default
                        RetryDecision::not_retryable(
                            &format!("GLM error ({}): {} - not retryable", s.as_u16(), s.canonical_reason().unwrap_or("Unknown")),
                        )
                    }
                    None => {
                        // Network error without status code - check error type
                        if reqwest_err.is_timeout() {
                            RetryDecision::retryable(
                                RetryableError::Timeout,
                                &format!("GLM request timeout: {}", reqwest_err),
                            )
                        } else if reqwest_err.is_connect() {
                            RetryDecision::retryable(
                                RetryableError::NetworkError,
                                &format!("GLM connection failed: {}", reqwest_err),
                            )
                        } else {
                            // Other network errors - retry (might be transient)
                            RetryDecision::retryable(
                                RetryableError::NetworkError,
                                &format!("GLM network error: {}", reqwest_err),
                            )
                        }
                    }
                }
            }

            // API errors with status codes in message string
            LlmError::ApiError(msg) => {
                let msg_lower = msg.to_lowercase();

                // Check for rate limit errors
                if msg.contains("429") || msg_lower.contains("rate limit") || msg_lower.contains("too many requests") {
                    RetryDecision::retryable(
                        RetryableError::RateLimit,
                        &format!("GLM rate limit exceeded: {}", msg),
                    )
                }
                // Check for authentication errors
                else if msg.contains("401") || msg_lower.contains("unauthorized") || msg_lower.contains("invalid api key") {
                    RetryDecision::not_retryable(
                        &format!("GLM authentication failed - check API key: {}", msg),
                    )
                }
                // Check for bad request errors
                else if msg.contains("400") || msg_lower.contains("bad request") || msg_lower.contains("invalid parameter") {
                    RetryDecision::not_retryable(
                        &format!("GLM bad request - check request format: {}", msg),
                    )
                }
                // Check for server errors
                else if msg.contains("500") || msg.contains("502") || msg.contains("503") || msg.contains("504") ||
                          msg_lower.contains("internal server error") || msg_lower.contains("service unavailable") {
                    RetryDecision::retryable(
                        RetryableError::ServerError,
                        &format!("GLM server error: {}", msg),
                    )
                }
                // Unknown API error - don't retry by default
                else {
                    RetryDecision::not_retryable(
                        &format!("GLM API error: {}", msg),
                    )
                }
            }

            // Parse errors - don't retry (response format issue)
            LlmError::ParseError(msg) => {
                RetryDecision::not_retryable(
                    &format!("GLM response parse error - format issue: {}", msg),
                )
            }

            // No API key - don't retry
            LlmError::NoApiKey => {
                RetryDecision::not_retryable("No GLM API key configured")
            }

            // Unsupported provider - don't retry
            LlmError::UnsupportedProvider(_) => {
                RetryDecision::not_retryable("Unsupported LLM provider")
            }
        }
    }
}

/// Claude (Anthropic) error classifier
///
/// # Retry Policy
/// - **Retry on**: 429 (rate limit), 500-599 (server errors), 529 (overloaded), network errors
/// - **Don't retry on**: 400 (bad request), 401 (auth), 403 (forbidden), parse errors
pub struct ClaudeErrorClassifier;

impl ErrorClassifier for ClaudeErrorClassifier {
    fn classify(&self, error: &LlmError) -> RetryDecision {
        match error {
            LlmError::RequestError(reqwest_err) => {
                let status = reqwest_err.status();

                match status {
                    Some(s) if s.as_u16() == 429 => {
                        RetryDecision::retryable(
                            RetryableError::RateLimit,
                            &format!("Claude rate limit exceeded (429) - {}", s.canonical_reason().unwrap_or("Too Many Requests")),
                        )
                    }
                    Some(s) if s.as_u16() == 401 => {
                        RetryDecision::not_retryable(
                            &format!("Claude authentication failed (401) - check API key: {}", s.canonical_reason().unwrap_or("Unauthorized")),
                        )
                    }
                    Some(s) if s.as_u16() == 400 => {
                        RetryDecision::not_retryable(
                            &format!("Claude bad request (400) - check request format: {}", s.canonical_reason().unwrap_or("Bad Request")),
                        )
                    }
                    Some(s) if s.as_u16() == 403 => {
                        RetryDecision::not_retryable(
                            &format!("Claude forbidden (403) - insufficient permissions: {}", s.canonical_reason().unwrap_or("Forbidden")),
                        )
                    }
                    Some(s) if s.as_u16() == 529 => {
                        // Claude 529 = service overloaded - definitely retry
                        RetryDecision::retryable(
                            RetryableError::ServerError,
                            &format!("Claude service overloaded (529) - {}", s.canonical_reason().unwrap_or("Service Unavailable")),
                        )
                    }
                    Some(s) if s.as_u16() >= 500 => {
                        RetryDecision::retryable(
                            RetryableError::ServerError,
                            &format!("Claude server error ({}) - {}", s.as_u16(), s.canonical_reason().unwrap_or("Internal Server Error")),
                        )
                    }
                    Some(s) => {
                        RetryDecision::not_retryable(
                            &format!("Claude error ({}): {} - not retryable", s.as_u16(), s.canonical_reason().unwrap_or("Unknown")),
                        )
                    }
                    None => {
                        // Network errors - retry
                        if reqwest_err.is_timeout() {
                            RetryDecision::retryable(
                                RetryableError::Timeout,
                                &format!("Claude request timeout: {}", reqwest_err),
                            )
                        } else if reqwest_err.is_connect() {
                            RetryDecision::retryable(
                                RetryableError::NetworkError,
                                &format!("Claude connection failed: {}", reqwest_err),
                            )
                        } else {
                            RetryDecision::retryable(
                                RetryableError::NetworkError,
                                &format!("Claude network error: {}", reqwest_err),
                            )
                        }
                    }
                }
            }

            LlmError::ApiError(msg) => {
                let msg_lower = msg.to_lowercase();

                if msg.contains("429") || msg_lower.contains("rate limit") {
                    RetryDecision::retryable(
                        RetryableError::RateLimit,
                        &format!("Claude rate limit exceeded: {}", msg),
                    )
                } else if msg.contains("401") || msg_lower.contains("unauthorized") {
                    RetryDecision::not_retryable(
                        &format!("Claude authentication failed - check API key: {}", msg),
                    )
                } else if msg.contains("400") || msg_lower.contains("bad request") {
                    RetryDecision::not_retryable(
                        &format!("Claude bad request - check request format: {}", msg),
                    )
                } else if msg.contains("529") || msg_lower.contains("overloaded") {
                    RetryDecision::retryable(
                        RetryableError::ServerError,
                        &format!("Claude service overloaded: {}", msg),
                    )
                } else if msg.contains("500") || msg.contains("502") || msg.contains("503") {
                    RetryDecision::retryable(
                        RetryableError::ServerError,
                        &format!("Claude server error: {}", msg),
                    )
                } else {
                    RetryDecision::not_retryable(
                        &format!("Claude API error: {}", msg),
                    )
                }
            }

            LlmError::ParseError(msg) => {
                RetryDecision::not_retryable(
                    &format!("Claude response parse error: {}", msg),
                )
            }

            LlmError::NoApiKey => {
                RetryDecision::not_retryable("No Claude API key configured")
            }

            LlmError::UnsupportedProvider(_) => {
                RetryDecision::not_retryable("Unsupported LLM provider")
            }
        }
    }
}

/// Get error classifier for the specified provider
pub fn get_classifier(provider: LLMProvider) -> Box<dyn ErrorClassifier> {
    match provider {
        LLMProvider::Glm => Box::new(GlmErrorClassifier),
        LLMProvider::Claude => Box::new(ClaudeErrorClassifier),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use reqwest::StatusCode;

    // Helper to create a mock request error with status code
    fn create_mock_error(status: u16) -> LlmError {
        let url = format!("https://api.example.com/{}", status);
        let err = reqwest::Error::from(
            reqwest::StatusCode::from_u16(status).unwrap()
        ).with::<reqwest::Error>(reqwest::Error::from(std::io::Error::new(std::io::ErrorKind::Other, "test")));
        LlmError::RequestError(err)
    }

    #[test]
    fn test_glm_classifier_429_retryable() {
        let classifier = GlmErrorClassifier;
        let error = LlmError::ApiError("GLM API error: 429 rate limit".to_string());
        let decision = classifier.classify(&error);

        assert!(decision.should_retry);
        assert_eq!(decision.error_type, Some(RetryableError::RateLimit));
    }

    #[test]
    fn test_glm_classifier_401_not_retryable() {
        let classifier = GlmErrorClassifier;
        let error = LlmError::ApiError("GLM API error: 401 unauthorized".to_string());
        let decision = classifier.classify(&error);

        assert!(!decision.should_retry);
        assert!(decision.reason.contains("authentication failed"));
    }

    #[test]
    fn test_glm_classifier_400_not_retryable() {
        let classifier = GlmErrorClassifier;
        let error = LlmError::ApiError("GLM API error: 400 bad request".to_string());
        let decision = classifier.classify(&error);

        assert!(!decision.should_retry);
        assert!(decision.reason.contains("bad request"));
    }

    #[test]
    fn test_glm_classifier_500_retryable() {
        let classifier = GlmErrorClassifier;
        let error = LlmError::ApiError("GLM API error: 500 internal server error".to_string());
        let decision = classifier.classify(&error);

        assert!(decision.should_retry);
        assert_eq!(decision.error_type, Some(RetryableError::ServerError));
    }

    #[test]
    fn test_glm_classifier_parse_error_not_retryable() {
        let classifier = GlmErrorClassifier;
        let error = LlmError::ParseError("Invalid JSON".to_string());
        let decision = classifier.classify(&error);

        assert!(!decision.should_retry);
        assert!(decision.reason.contains("parse error"));
    }

    #[test]
    fn test_glm_classifier_no_api_key_not_retryable() {
        let classifier = GlmErrorClassifier;
        let error = LlmError::NoApiKey;
        let decision = classifier.classify(&error);

        assert!(!decision.should_retry);
        assert!(decision.reason.contains("No API key"));
    }

    #[test]
    fn test_claude_classifier_429_retryable() {
        let classifier = ClaudeErrorClassifier;
        let error = LlmError::ApiError("Claude API error: 429 rate limit".to_string());
        let decision = classifier.classify(&error);

        assert!(decision.should_retry);
        assert_eq!(decision.error_type, Some(RetryableError::RateLimit));
    }

    #[test]
    fn test_claude_classifier_529_retryable() {
        let classifier = ClaudeErrorClassifier;
        let error = LlmError::ApiError("Claude API error: 529 service overloaded".to_string());
        let decision = classifier.classify(&error);

        assert!(decision.should_retry);
        assert_eq!(decision.error_type, Some(RetryableError::ServerError));
    }
}
