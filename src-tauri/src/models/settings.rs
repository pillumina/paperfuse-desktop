use serde::{Deserialize, Serialize};

/// Retry configuration for LLM API calls
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RetryConfig {
    /// Maximum number of retry attempts (default: 3)
    pub max_retries: u32,

    /// Maximum total duration for retries in seconds (default: 300)
    pub max_retry_duration_secs: u64,

    /// Initial backoff delay in milliseconds (default: 1000)
    pub initial_backoff_ms: u64,

    /// Maximum backoff delay in milliseconds (default: 30000)
    pub max_backoff_ms: u64,

    /// Backoff multiplier for exponential increase (default: 2.0)
    pub backoff_multiplier: f64,

    /// Jitter factor to add randomness, 0.0-1.0 (default: 0.1)
    pub jitter_factor: f64,

    /// Request timeout in seconds (default: 120)
    pub request_timeout_secs: u64,

    /// Enable retry for rate limit errors (default: true)
    pub retry_on_rate_limit: bool,

    /// Enable retry for server errors (5xx) (default: true)
    pub retry_on_server_error: bool,

    /// Enable retry for network errors (default: true)
    pub retry_on_network_error: bool,
}

impl Default for RetryConfig {
    fn default() -> Self {
        Self {
            max_retries: 3,
            max_retry_duration_secs: 300,
            initial_backoff_ms: 1000,
            max_backoff_ms: 30000,
            backoff_multiplier: 2.0,
            jitter_factor: 0.1,
            request_timeout_secs: 120,
            retry_on_rate_limit: true,
            retry_on_server_error: true,
            retry_on_network_error: true,
        }
    }
}

/// Application settings
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    pub llm_provider: LLMProvider,
    pub glm_api_key: Option<String>,
    pub claude_api_key: Option<String>,
    pub glm_quick_model: Option<String>,
    pub glm_deep_model: Option<String>,
    pub claude_quick_model: Option<String>,
    pub claude_deep_model: Option<String>,
    pub topics: Vec<TopicConfig>,
    pub schedule_enabled: bool,
    pub schedule_frequency: ScheduleFrequency,
    pub schedule_time: Option<String>,
    pub schedule_week_days: Option<Vec<i32>>,
    #[serde(default)]
    pub arxiv_categories: Option<Vec<String>>,
    #[serde(default)]
    pub latex_download_path: Option<String>,
    #[serde(default)]
    pub deep_analysis_mode: Option<String>,
    #[serde(default)]
    pub retry_config: Option<RetryConfig>,
    /// Async analysis mode: "sync" or "async" (default: "sync")
    #[serde(default)]
    pub async_analysis_mode: Option<String>,
    /// Maximum concurrent analyses in async mode (1-5, default: 1)
    #[serde(default)]
    pub max_concurrent_analyses: Option<usize>,
}

/// LLM provider
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum LLMProvider {
    Glm,
    Claude,
}

/// Schedule frequency
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum ScheduleFrequency {
    Daily,
    Weekly,
}

/// Compute a hash of topics configuration for cache invalidation
pub fn compute_topics_hash(topics: &[TopicConfig]) -> String {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};

    // Create a deterministic representation of topics
    let mut hasher = DefaultHasher::new();

    // Sort topics by key to ensure consistent ordering
    let mut sorted_topics = topics.to_vec();
    sorted_topics.sort_by(|a, b| a.key.cmp(&b.key));

    for topic in sorted_topics {
        topic.key.hash(&mut hasher);
        topic.label.hash(&mut hasher);
        topic.description.hash(&mut hasher);

        // Hash keywords if present
        if let Some(ref keywords) = topic.keywords {
            for keyword in keywords {
                keyword.hash(&mut hasher);
            }
        }

        // Hash arxiv categories if present
        if let Some(ref categories) = topic.arxiv_categories {
            for category in categories {
                category.hash(&mut hasher);
            }
        }
    }

    format!("{:x}", hasher.finish())
}

/// Topic configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TopicConfig {
    #[serde(alias = "id")]
    pub key: String,
    #[serde(alias = "name")]
    pub label: String,
    #[serde(default)]
    pub description: String,
    pub color: String,
    #[serde(default)]
    pub enabled: bool, // Whether this topic is active/enabled (defaults to true)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub arxiv_categories: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_papers_per_day: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub deep_analysis_count: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub quick_score_threshold: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub keywords: Option<Vec<String>>,
}

/// Fetch options
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FetchOptions {
    pub api_key: String,
    pub llm_provider: LLMProvider,
    pub quick_model: Option<String>,
    pub deep_model: Option<String>,
    pub categories: Vec<String>,
    pub max_papers: i32,
    pub days_back: Option<i32>,
    pub date_from: Option<String>,  // Custom start date in YYYY-MM-DD format
    pub date_to: Option<String>,    // Custom end date in YYYY-MM-DD format
    pub min_relevance: i32,
    pub deep_analysis: bool,
    #[serde(default = "default_deep_analysis_threshold")]
    pub deep_analysis_threshold: Option<i32>,
    /// Analysis mode for deep analysis: 'standard' or 'full'
    #[serde(default = "default_analysis_mode")]
    pub analysis_mode: Option<String>,
    /// Async mode: "sync" or "async" (default: "sync")
    #[serde(default)]
    pub async_mode: Option<String>,
    /// Maximum concurrent analyses in async mode (1-5, default: 1)
    #[serde(default)]
    pub max_concurrent: Option<usize>,
    /// Response language: "en" or "zh" (default: "en")
    #[serde(default = "default_language")]
    pub language: Option<String>,
    /// Fetch by ID mode: fetch specific papers by arXiv ID instead of category search
    #[serde(default)]
    pub fetch_by_id: bool,
    /// List of arXiv IDs for fetch-by-ID mode
    #[serde(skip_serializing_if = "Option::is_none")]
    pub arxiv_ids: Option<Vec<String>>,
}

/// Default value for deep_analysis_threshold (70/100 on 0-100 scale)
fn default_deep_analysis_threshold() -> Option<i32> {
    Some(70)
}

/// Default value for analysis_mode ('standard')
fn default_analysis_mode() -> Option<String> {
    Some("standard".to_string())
}

/// Default value for language ('en')
fn default_language() -> Option<String> {
    Some("en".to_string())
}

/// Fetch result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FetchResult {
    pub total_fetched: i32,
    pub passed_filter: i32,
    pub analyzed: i32,
    pub deep_analyzed: i32,
    pub stored: i32,
    pub by_tag: std::collections::HashMap<String, i32>,
    pub duration_seconds: i32,
}

/// Fetch status (for progress tracking)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FetchStatus {
    pub status: String,
    pub progress: f32,
    pub current_step: String,
    pub papers_found: usize,
    pub papers_analyzed: usize,
    pub papers_saved: usize,
    pub papers_filtered: usize,
    /// Number of papers that were already in the database (duplicates)
    #[serde(default)]
    pub papers_duplicates: usize,
    /// Number of papers that used cached relevance results
    #[serde(default)]
    pub papers_cache_hits: usize,
    #[serde(default)]
    pub errors: Vec<String>,
    /// Async mode specific fields (only used when async_mode is true)
    #[serde(default)]
    pub queue_size: usize,
    #[serde(default)]
    pub active_tasks: usize,
    #[serde(default)]
    pub completed_tasks: usize,
    #[serde(default)]
    pub failed_tasks: usize,
    #[serde(default)]
    pub async_mode: bool,
}

/// Fetch status state
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum FetchStatusState {
    Idle,
    Fetching,
    Filtering,
    Analyzing,
    Completed,
    Error,
}

/// Schedule run status for tracking execution history
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum ScheduleRunStatus {
    Pending,
    Running,
    Completed,
    Failed,
}

/// Schedule status for tracking scheduler state
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScheduleStatus {
    pub enabled: bool,
    pub next_run_time: Option<String>,
    pub last_run_time: Option<String>,
    pub last_run_status: Option<ScheduleRunStatus>,
    pub consecutive_failures: i32,
}

/// Schedule run record for execution history
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScheduleRun {
    pub id: String,
    pub started_at: String,
    pub completed_at: Option<String>,
    pub status: ScheduleRunStatus,
    pub papers_fetched: i32,
    pub papers_saved: i32,
    pub error_message: Option<String>,
}

impl Default for Settings {
    fn default() -> Self {
        Settings {
            llm_provider: LLMProvider::Glm,
            glm_api_key: None,
            claude_api_key: None,
            glm_quick_model: Some("glm-4.5-flash".to_string()),
            glm_deep_model: Some("glm-4.7".to_string()),
            claude_quick_model: Some("claude-haiku".to_string()),
            claude_deep_model: Some("claude-sonnet".to_string()),
            topics: vec![],
            schedule_enabled: false,
            schedule_frequency: ScheduleFrequency::Daily,
            schedule_time: None,
            schedule_week_days: None,
            arxiv_categories: None,
            latex_download_path: None,
            deep_analysis_mode: None,
            retry_config: None,
            async_analysis_mode: Some("sync".to_string()),
            max_concurrent_analyses: Some(1),
        }
    }
}

impl Default for ScheduleStatus {
    fn default() -> Self {
        ScheduleStatus {
            enabled: false,
            next_run_time: None,
            last_run_time: None,
            last_run_status: None,
            consecutive_failures: 0,
        }
    }
}

impl Default for ScheduleRunStatus {
    fn default() -> Self {
        ScheduleRunStatus::Pending
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_compute_topics_hash() {
        let topics1 = vec![
            TopicConfig {
                key: "rl".to_string(),
                label: "Reinforcement Learning".to_string(),
                description: "RL".to_string(),
                color: "bg-purple".to_string(),
                arxiv_categories: Some(vec!["cs.AI".to_string()]),
                max_papers_per_day: Some(10),
                deep_analysis_count: None,
                quick_score_threshold: None,
                keywords: Some(vec!["reinforcement".to_string()]),
            },
        ];

        let topics2 = vec![
            TopicConfig {
                key: "rl".to_string(),
                label: "Reinforcement Learning".to_string(),
                description: "RL".to_string(),
                color: "bg-purple".to_string(),
                arxiv_categories: Some(vec!["cs.AI".to_string()]),
                max_papers_per_day: Some(10),
                deep_analysis_count: None,
                quick_score_threshold: None,
                keywords: Some(vec!["reinforcement".to_string()]),
            },
        ];

        // Same topics should produce same hash
        let hash1 = compute_topics_hash(&topics1);
        let hash2 = compute_topics_hash(&topics2);
        assert_eq!(hash1, hash2);

        // Different topics should produce different hash
        let mut topics3 = topics1.clone();
        topics3[0].description = "Different".to_string();
        let hash3 = compute_topics_hash(&topics3);
        assert_ne!(hash1, hash3);
    }

    #[test]
    fn test_settings_default() {
        let settings = Settings::default();
        assert_eq!(settings.llm_provider, LLMProvider::Glm);
        assert!(settings.topics.is_empty());
        assert!(!settings.schedule_enabled);
    }

    #[test]
    fn test_serialize_fetch_status() {
        let status = FetchStatus {
            status: "analyzing".to_string(),
            progress: 0.5,
            current_step: "Analyzing paper 5/10".to_string(),
            papers_found: 0,
            papers_analyzed: 0,
            papers_saved: 0,
            papers_filtered: 0,
            papers_duplicates: 0,
            papers_cache_hits: 0,
            errors: vec![],
        };

        let json = serde_json::to_string(&status).unwrap();
        assert!(json.contains("analyzing"));

        let deserialized: FetchStatus = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.status, "analyzing");
    }

    #[test]
    fn test_serialize_settings() {
        let settings = Settings::default();
        let json = serde_json::to_string(&settings).unwrap();
        assert!(json.contains("\"glm\""));
    }

    #[test]
    fn test_schedule_status_default() {
        let status = ScheduleStatus::default();
        assert!(!status.enabled);
        assert!(status.next_run_time.is_none());
        assert!(status.last_run_time.is_none());
        assert_eq!(status.consecutive_failures, 0);
    }

    #[test]
    fn test_schedule_run_status_default() {
        let status = ScheduleRunStatus::default();
        assert_eq!(status, ScheduleRunStatus::Pending);
    }

    #[test]
    fn test_serialize_schedule_run() {
        let run = ScheduleRun {
            id: "test-id".to_string(),
            started_at: "2025-01-01T10:00:00Z".to_string(),
            completed_at: Some("2025-01-01T10:05:00Z".to_string()),
            status: ScheduleRunStatus::Completed,
            papers_fetched: 10,
            papers_saved: 5,
            error_message: None,
        };

        let json = serde_json::to_string(&run).unwrap();
        assert!(json.contains("\"test-id\""));
        assert!(json.contains("\"completed\""));

        let deserialized: ScheduleRun = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.id, "test-id");
        assert_eq!(deserialized.papers_fetched, 10);
        assert_eq!(deserialized.status, ScheduleRunStatus::Completed);
    }

    #[test]
    fn test_calculate_next_run_daily() {
        use chrono::{Utc, Timelike, Duration};

        let now = Utc::now();
        let target_hour = 9;
        let target_minute = 0;

        // If current time is before target time, next run is today
        let current_hour = now.hour();
        let next_run = if current_hour < target_hour {
            Some(now.with_hour(target_hour).unwrap()
                .with_minute(target_minute).unwrap()
                .with_second(0).unwrap()
                .to_rfc3339())
        } else {
            Some((now + Duration::days(1))
                .with_hour(target_hour).unwrap()
                .with_minute(target_minute).unwrap()
                .with_second(0).unwrap()
                .to_rfc3339())
        };

        assert!(next_run.is_some());
    }
}
