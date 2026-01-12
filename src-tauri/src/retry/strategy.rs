//! Retry strategy with exponential backoff and jitter
//!
//! Implements exponential backoff with jitter to avoid thundering herd problem.

use std::time::Duration;
use rand::Rng;

/// Calculate retry delay with exponential backoff and jitter
///
/// # Formula
/// 1. Calculate exponential delay: `initial_backoff * (multiplier ^ attempt)`
/// 2. Cap at maximum backoff
/// 3. Add jitter: `delay * (1 + random(-jitter_factor, +jitter_factor))`
///
/// # Arguments
/// * `attempt` - Retry attempt number (0-based)
/// * `initial_backoff_ms` - Initial backoff in milliseconds
/// * `max_backoff_ms` - Maximum backoff in milliseconds
/// * `multiplier` - Exponential backoff multiplier
/// * `jitter_factor` - Jitter factor (0.0-1.0)
///
/// # Examples
/// ```
/// use std::time::Duration;
///
/// let delay = calculate_backoff(0, 1000, 30000, 2.0, 0.1);
/// assert!(delay.as_millis() >= 900); // 1000 +/- 10%
/// assert!(delay.as_millis() <= 1100);
/// ```
pub fn calculate_backoff(
    attempt: u32,
    initial_backoff_ms: u64,
    max_backoff_ms: u64,
    multiplier: f64,
    jitter_factor: f64,
) -> Duration {
    // Calculate exponential backoff
    let exponential_delay = initial_backoff_ms as f64 * multiplier.powi(attempt as i32);

    // Cap at maximum backoff
    let capped_delay = exponential_delay.min(max_backoff_ms as f64);

    // Add jitter to avoid thundering herd
    let jitter_range = capped_delay * jitter_factor;
    let jitter = rand::thread_rng().gen_range(-jitter_range..=jitter_range);

    let final_delay_ms = (capped_delay + jitter).max(0.0) as u64;

    Duration::from_millis(final_delay_ms)
}

/// Check if there's remaining time budget for retries
///
/// # Arguments
/// * `elapsed` - Time elapsed since first attempt
/// * `max_retry_duration_secs` - Maximum total duration for retries
///
/// # Returns
/// `true` if within time budget, `false` if exceeded
pub fn has_time_budget(
    elapsed: Duration,
    max_retry_duration_secs: u64,
) -> bool {
    elapsed < Duration::from_secs(max_retry_duration_secs)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_backoff_increases_exponentially() {
        let delay1 = calculate_backoff(0, 1000, 30000, 2.0, 0.0);
        let delay2 = calculate_backoff(1, 1000, 30000, 2.0, 0.0);
        let delay3 = calculate_backoff(2, 1000, 30000, 2.0, 0.0);

        assert_eq!(delay1.as_millis(), 1000);
        assert_eq!(delay2.as_millis(), 2000);
        assert_eq!(delay3.as_millis(), 4000);
    }

    #[test]
    fn test_backoff_respects_max() {
        let delay = calculate_backoff(10, 1000, 2000, 10.0, 0.0);
        assert!(delay.as_millis() <= 2000);
    }

    #[test]
    fn test_jitter_adds_randomness() {
        let delays: Vec<_> = (0..20)
            .map(|_| calculate_backoff(0, 1000, 30000, 2.0, 0.5))
            .collect();

        // With jitter, delays should vary
        let min_delay = *delays.iter().min().unwrap();
        let max_delay = *delays.iter().max().unwrap();

        // Should have some variation (not all the same)
        assert!(max_delay > min_delay);

        // Should be within reasonable bounds (1000 +/- 500)
        assert!(min_delay.as_millis() >= 500);
        assert!(max_delay.as_millis() <= 1500);
    }

    #[test]
    fn test_no_jitter() {
        let delays: Vec<_> = (0..10)
            .map(|_| calculate_backoff(0, 1000, 30000, 2.0, 0.0))
            .collect();

        // Without jitter, all delays should be exactly 1000ms
        for delay in delays {
            assert_eq!(delay.as_millis(), 1000);
        }
    }

    #[test]
    fn test_time_budget() {
        assert!(has_time_budget(Duration::from_secs(5), 10));
        assert!(!has_time_budget(Duration::from_secs(15), 10));
        assert!(!has_time_budget(Duration::from_secs(10), 10));
    }

    #[test]
    fn test_backoff_with_small_jitter() {
        let delay = calculate_backoff(0, 1000, 30000, 2.0, 0.1);
        // Should be close to 1000ms (1000 +/- 100)
        assert!(delay.as_millis() >= 900);
        assert!(delay.as_millis() <= 1100);
    }
}
