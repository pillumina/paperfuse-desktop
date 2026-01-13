//! Retry execution engine
//!
//! Provides the core retry logic with exponential backoff and comprehensive logging.

use std::time::Instant;
use std::pin::Pin;
use tokio::time::sleep;
use crate::llm::LlmError;
use crate::models::LLMProvider;
use crate::models::settings::RetryConfig;
use crate::retry::classifier::ErrorClassifier;
use crate::retry::policy::RetryableError;
use crate::retry::strategy::{calculate_backoff, has_time_budget};

/// Retry execution engine
///
/// Wraps an async operation with retry logic, exponential backoff, and logging.
pub struct RetryExecutor {
    provider: LLMProvider,
    config: RetryConfig,
    classifier: Box<dyn ErrorClassifier>,
}

impl RetryExecutor {
    /// Create a new retry executor for the specified provider
    pub fn new(provider: LLMProvider, config: RetryConfig) -> Self {
        let classifier = crate::retry::classifier::get_classifier(provider.clone());

        Self {
            provider,
            config,
            classifier,
        }
    }

    /// Execute an async operation with retry logic
    ///
    /// # Arguments
    /// * `operation` - Async operation to execute (wrapped in Pin<Box>)
    /// * `operation_name` - Human-readable name for logging
    ///
    /// # Returns
    /// * `Ok(T)` - Operation succeeded
    /// * `Err(LlmError)` - Operation failed after all retries
    ///
    /// # Example
    /// ```no_run
    /// let operation = || {
    ///     Box::pin(async {
    ///         my_api_call().await
    ///     })
    /// };
    /// executor.execute(operation, "API call").await
    /// ```
    pub async fn execute<F, T>(
        &self,
        operation: F,
        operation_name: &str,
    ) -> Result<T, LlmError>
    where
        F: Fn() -> Pin<Box<dyn std::future::Future<Output = Result<T, LlmError>> + Send>>,
    {
        let start_time = Instant::now();
        let mut last_error: Option<LlmError> = None;

        // Log initial attempt
        eprintln!("[Retry] Executing: {} (provider: {:?})", operation_name, self.provider);

        for attempt in 0..=self.config.max_retries {
            // Execute operation
            match operation().await {
                Ok(result) => {
                    // Success!
                    if attempt > 0 {
                        eprintln!(
                            "[Retry {}] SUCCESS: {} after {} attempts (took {:.2}s)",
                            attempt,
                            operation_name,
                            attempt + 1,
                            start_time.elapsed().as_secs_f64()
                        );
                    } else {
                        eprintln!(
                            "[Retry] SUCCESS: {} (took {:.2}s)",
                            operation_name,
                            start_time.elapsed().as_secs_f64()
                        );
                    }
                    return Ok(result);
                }
                Err(error) => {
                    last_error = Some(error.clone());

                    // Classify error
                    let decision = self.classifier.classify(&error);

                    // Log error with reason
                    eprintln!(
                        "[Retry {}] ERROR: {} - {}",
                        attempt, operation_name, decision.reason
                    );

                    // Check if we should retry
                    if !decision.should_retry {
                        eprintln!("[Retry] Non-retryable error, aborting: {}", decision.reason);
                        return Err(error);
                    }

                    // Check retry policy for this error type
                    let should_retry = match decision.error_type {
                        Some(RetryableError::RateLimit) => self.config.retry_on_rate_limit,
                        Some(RetryableError::ServerError) => self.config.retry_on_server_error,
                        Some(RetryableError::Timeout) | Some(RetryableError::NetworkError) => {
                            self.config.retry_on_network_error
                        }
                        None => false,
                    };

                    if !should_retry {
                        eprintln!("[Retry] Retry disabled for error type, aborting");
                        return Err(error);
                    }

                    // Check if we've exhausted retries
                    if attempt >= self.config.max_retries {
                        eprintln!(
                            "[Retry] Max retries exhausted ({}), aborting",
                            self.config.max_retries
                        );
                        return Err(error);
                    }

                    // Check time budget
                    let elapsed = start_time.elapsed();
                    if !has_time_budget(elapsed, self.config.max_retry_duration_secs) {
                        eprintln!(
                            "[Retry] Time budget exceeded: {:.2}s / {}s, aborting",
                            elapsed.as_secs_f64(),
                            self.config.max_retry_duration_secs
                        );
                        return Err(error);
                    }

                    // Calculate and wait backoff
                    let delay = calculate_backoff(
                        attempt,
                        self.config.initial_backoff_ms,
                        self.config.max_backoff_ms,
                        self.config.backoff_multiplier,
                        self.config.jitter_factor,
                    );

                    eprintln!(
                        "[Retry {}] Waiting {:.2}s before retry...",
                        attempt,
                        delay.as_secs_f64()
                    );

                    sleep(delay).await;
                }
            }
        }

        // Should never reach here, but handle it gracefully
        Err(last_error.unwrap_or_else(|| {
            LlmError::ApiError("Retry exhausted without error".to_string())
        }))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicU32, Ordering};

    // Mock operation that succeeds after N attempts
    fn mock_operation(success_after: AtomicU32) -> impl Fn() -> Pin<Box<dyn std::future::Future<Output = Result<String, LlmError>> + Send>> {
        move || {
            Box::pin(async move {
                let attempt = success_after.fetch_add(1, Ordering::SeqCst);
                if attempt >= success_after.load(Ordering::SeqCst) {
                    Ok("Success".to_string())
                } else {
                    Err(LlmError::ApiError(format!("Attempt {}", attempt)))
                }
            })
        }
    }

    // Note: These are basic structure tests. Full integration tests would require
    // async test runtime and more sophisticated mocking.

    #[test]
    fn test_executor_creation() {
        let config = RetryConfig::default();
        let executor = RetryExecutor::new(LLMProvider::Glm, config);
        assert_eq!(executor.provider, LLMProvider::Glm);
    }

    #[test]
    fn test_calculate_backoff_with_config() {
        let config = RetryConfig {
            initial_backoff_ms: 1000,
            max_backoff_ms: 10000,
            backoff_multiplier: 2.0,
            jitter_factor: 0.0,
            ..Default::default()
        };

        let delay = calculate_backoff(
            2,
            config.initial_backoff_ms,
            config.max_backoff_ms,
            config.backoff_multiplier,
            config.jitter_factor,
        );

        // 1000 * 2^2 = 4000ms
        assert_eq!(delay.as_millis(), 4000);
    }
}
