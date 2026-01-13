//! Paper fetch pipeline - orchestrates ArXiv fetching, LLM classification, and database storage

pub mod queue;

use crate::arxiv::{self, ArxivEntry, FetchOptions as ArxivFetchOptions};
use crate::analysis::{AnalysisDepth, UserAnalysisConfig};
use crate::database::{PaperRepository, FetchHistoryRepository, FetchHistoryEntry, PaperSummary, SettingsRepository};
use crate::llm::{self, LlmClient, LlmError, RelevanceResult};
use crate::models::{FetchOptions, FetchStatus, Paper, TopicConfig};
use queue::{TaskQueue, QueuedTask};
use sqlx::SqlitePool;
use std::sync::Arc;
use thiserror::Error;
use tokio::sync::Mutex;
use tokio_util::sync::CancellationToken;
use uuid::Uuid;

/// Errors that can occur during fetch operations
#[derive(Debug, Error)]
pub enum FetchError {
    #[error("ArXiv API error: {0}")]
    ArxivError(#[from] arxiv::ArxivError),

    #[error("LLM rate limit exceeded. Please try again later")]
    LlmRateLimitError,

    #[error("LLM authentication failed. Please check your API key")]
    LlmAuthError,

    #[error("Network error: {0}")]
    NetworkError(String),

    #[error("Database error: {0}")]
    DatabaseError(String),

    #[error("Cancelled by user")]
    Cancelled,

    #[error("LLM error: {0}")]
    LlmError(llm::LlmError),
}

impl FetchError {
    /// Get the error type for frontend display
    pub fn error_type(&self) -> &'static str {
        match self {
            FetchError::ArxivError(_) => "arxiv",
            FetchError::LlmRateLimitError => "llm_rate_limit",
            FetchError::LlmAuthError => "llm_auth",
            FetchError::NetworkError(_) => "network",
            FetchError::DatabaseError(_) => "database",
            FetchError::Cancelled => "cancelled",
            FetchError::LlmError(_) => "llm",
        }
    }

    /// Check if the error is retryable
    pub fn is_retryable(&self) -> bool {
        match self {
            FetchError::ArxivError(_) => true,
            FetchError::LlmRateLimitError => true,
            FetchError::NetworkError(_) => true,
            FetchError::LlmError(_) => true,
            FetchError::LlmAuthError => false,
            FetchError::DatabaseError(_) => false,
            FetchError::Cancelled => false,
        }
    }
}

// Convert LlmError to FetchError with classification
impl From<LlmError> for FetchError {
    fn from(err: LlmError) -> Self {
        match &err {
            LlmError::ApiError(msg) => {
                // Check for rate limit errors (HTTP 429)
                if msg.contains("429") || msg.to_lowercase().contains("rate limit") {
                    return FetchError::LlmRateLimitError;
                }
                // Check for auth errors (HTTP 401, 403)
                if msg.contains("401") || msg.contains("403") ||
                   msg.to_lowercase().contains("unauthorized") ||
                   msg.to_lowercase().contains("forbidden") ||
                   msg.to_lowercase().contains("invalid api key") {
                    return FetchError::LlmAuthError;
                }
                // Check for network errors
                if msg.to_lowercase().contains("connection") ||
                   msg.to_lowercase().contains("timeout") ||
                   msg.to_lowercase().contains("network") {
                    return FetchError::NetworkError(msg.clone());
                }
                FetchError::LlmError(err)
            }
            LlmError::RequestError(e) => {
                // Classify request errors as network errors
                FetchError::NetworkError(e.to_string())
            }
            _ => FetchError::LlmError(err),
        }
    }
}

/// Result of a fetch operation
#[derive(Debug, Clone)]
pub struct FetchResult {
    pub papers_fetched: usize,
    pub papers_analyzed: usize,
    pub papers_saved: usize,
    pub papers_filtered: usize,
    pub papers_cache_hits: usize,
    pub papers_duplicates: usize,
    pub errors: Vec<String>,
    pub saved_papers: Vec<crate::database::PaperSummary>,
}

/// Result of processing a single paper
#[derive(Debug, Clone)]
struct ProcessedPaperResult {
    analyzed: bool,
    saved: bool,
    filtered: bool,
    cache_hit: bool,
    duplicate: bool,
    paper_summary: Option<PaperSummary>,
}

/// Result of relevance analysis with cache information
#[derive(Debug, Clone)]
struct RelevanceAnalysisWithCache {
    result: RelevanceResult,
    from_cache: bool,
}

/// Helper to create idle fetch status
fn idle_status() -> FetchStatus {
    FetchStatus {
        status: "idle".to_string(),
        progress: 0.0,
        current_step: String::new(),
        papers_found: 0,
        papers_analyzed: 0,
        papers_saved: 0,
        papers_filtered: 0,
        papers_duplicates: 0,
        papers_cache_hits: 0,
        errors: vec![],
        queue_size: 0,
        active_tasks: 0,
        completed_tasks: 0,
        failed_tasks: 0,
        async_mode: false,
    }
}

/// RAII guard for fetch state management
/// Ensures is_fetching flag is always reset, even if the task panics
struct FetchGuard {
    is_fetching: Arc<Mutex<bool>>,
    cancellation_token: Arc<Mutex<Option<CancellationToken>>>,
}

impl FetchGuard {
    /// Create a new fetch guard, returns error if already fetching
    async fn new(
        is_fetching: Arc<Mutex<bool>>,
        cancellation_token: Arc<Mutex<Option<CancellationToken>>>,
    ) -> Result<Self, FetchError> {
        // Acquire lock and check/set state in a scope to release the lock
        {
            let mut fetching = is_fetching.lock().await;
            if *fetching {
                return Err(FetchError::DatabaseError("Already fetching".to_string()));
            }
            *fetching = true;
            eprintln!("[FetchGuard] Acquired fetch lock");
        }
        
        Ok(Self {
            is_fetching,
            cancellation_token,
        })
    }
}

impl Drop for FetchGuard {
    fn drop(&mut self) {
        // Use blocking lock in Drop since we're in sync context
        // This ensures cleanup happens even if the async task panics
        if let Ok(mut fetching) = self.is_fetching.try_lock() {
            *fetching = false;
            eprintln!("[FetchGuard] Released fetch lock (via Drop)");
        }
        
        if let Ok(mut token_guard) = self.cancellation_token.try_lock() {
            *token_guard = None;
            eprintln!("[FetchGuard] Cleared cancellation token (via Drop)");
        }
    }
}

/// Manages the state and execution of paper fetching
pub struct FetchManager {
    pool: SqlitePool,
    is_fetching: Arc<Mutex<bool>>,
    current_status: Arc<Mutex<FetchStatus>>,
    cancellation_token: Arc<Mutex<Option<CancellationToken>>>,
}

impl FetchManager {
    pub fn new(pool: SqlitePool) -> Self {
        Self {
            pool,
            is_fetching: Arc::new(Mutex::new(false)),
            current_status: Arc::new(Mutex::new(idle_status())),
            cancellation_token: Arc::new(Mutex::new(None)),
        }
    }

    /// Check if a fetch is currently in progress
    pub async fn is_fetching(&self) -> bool {
        *self.is_fetching.lock().await
    }

    /// Get the current fetch status
    pub async fn get_status(&self) -> FetchStatus {
        self.current_status.lock().await.clone()
    }

    /// Cancel the current fetch operation
    pub async fn cancel_fetch(&self) -> Result<(), FetchError> {
        let mut token_guard = self.cancellation_token.lock().await;
        if let Some(token) = token_guard.take() {
            token.cancel();
            Ok(())
        } else {
            Err(FetchError::DatabaseError("No fetch in progress".to_string()))
        }
    }

    /// Start a fetch operation
    pub async fn fetch_papers(
        &self,
        options: FetchOptions,
        topics: Vec<TopicConfig>,
        event_emitter: Option<Arc<dyn Fn(FetchStatus) + Send + Sync>>,
    ) -> Result<FetchResult, FetchError> {
        // Create RAII guard - will automatically release lock on drop (even if panic occurs)
        let _guard = FetchGuard::new(
            self.is_fetching.clone(),
            self.cancellation_token.clone(),
        )
        .await?;

        // Create cancellation token for this fetch
        let token = CancellationToken::new();
        {
            let mut token_guard = self.cancellation_token.lock().await;
            *token_guard = Some(token.clone());
        }

        // Reset status
        {
            let mut status = self.current_status.lock().await;
            *status = FetchStatus {
                status: "starting".to_string(),
                progress: 0.0,
                current_step: "Initializing fetch...".to_string(),
                papers_found: 0,
                papers_analyzed: 0,
                papers_saved: 0,
                papers_filtered: 0,
                papers_duplicates: 0,
                papers_cache_hits: 0,
                errors: vec![],
                queue_size: 0,
                active_tasks: 0,
                completed_tasks: 0,
                failed_tasks: 0,
                async_mode: false,
            };
        }

        // Create fetch history entry
        let fetch_id = Uuid::new_v4().to_string();
        let started_at = chrono::Utc::now().to_rfc3339();
        let history_repo = FetchHistoryRepository::new(&self.pool);

        let initial_entry = FetchHistoryEntry {
            id: fetch_id.clone(),
            started_at: started_at.clone(),
            completed_at: None,
            status: "running".to_string(),
            papers_fetched: 0,
            papers_analyzed: 0,
            papers_saved: 0,
            papers_filtered: 0,
            llm_provider: Some(format!("{:?}", options.llm_provider)),
            max_papers: Some(options.max_papers as i32),
            error_message: None,
            papers: None,
        };

        // Ignore creation errors (don't break fetch on history write failure)
        if let Err(e) = history_repo.create(&initial_entry).await {
            eprintln!("[fetch_papers] Failed to create fetch history entry: {}", e);
        }

        // Execute fetch - guard will automatically clean up when this function returns
        // (either normally or via panic/early return)
        eprintln!("[fetch_papers] About to call do_fetch");
        let result = self
            .do_fetch(options, topics, event_emitter, token.clone())
            .await;

        eprintln!("[fetch_papers] do_fetch returned with result: {:?}", result);

        // Update fetch history entry with completion status
        let completed_at = chrono::Utc::now().to_rfc3339();
        match &result {
            Ok(fetch_result) => {
                if let Err(e) = history_repo.update(
                    &fetch_id,
                    &completed_at,
                    "completed",
                    fetch_result.papers_fetched as i32,
                    fetch_result.papers_analyzed as i32,
                    fetch_result.papers_saved as i32,
                    fetch_result.papers_filtered as i32,
                    None,
                    Some(fetch_result.saved_papers.clone()),
                ).await {
                    eprintln!("[fetch_papers] Failed to update fetch history entry: {}", e);
                }
            }
            Err(e) => {
                if let Err(e) = history_repo.update(
                    &fetch_id,
                    &completed_at,
                    "failed",
                    0,
                    0,
                    0,
                    0,
                    Some(&e.to_string()),
                    None,
                ).await {
                    eprintln!("[fetch_papers] Failed to update fetch history entry on error: {}", e);
                }
            }
        }

        // Guard's Drop will automatically clean up is_fetching and cancellation_token
        result
    }

    /// Process papers concurrently using worker tasks
    async fn process_papers_async(
        &self,
        entries: &[ArxivEntry],
        repo: &PaperRepository,
        llm_client: Option<&LlmClient>,
        topics: &[TopicConfig],
        options: &FetchOptions,
        latex_download_path: Option<String>,
        max_concurrent: usize,
        event_emitter: &Option<Arc<dyn Fn(FetchStatus) + Send + Sync>>,
        cancel_token: &CancellationToken,
    ) -> Result<FetchResult, FetchError> {
        eprintln!("[process_papers_async] Starting async processing with {} max concurrent workers", max_concurrent);

        // Create task queue
        let queue = TaskQueue::new(max_concurrent, entries.len());

        // Queue all papers
        for (i, entry) in entries.iter().enumerate() {
            let task = QueuedTask {
                index: i,
                entry: entry.clone(),
            };
            queue.queue(task).await.map_err(|e| FetchError::DatabaseError(format!("Failed to queue task: {}", e)))?;
        }

        eprintln!("[process_papers_async] All {} tasks queued", entries.len());

        // Shared result state (thread-safe)
        let result = Arc::new(Mutex::new(FetchResult {
            papers_fetched: entries.len(),
            papers_analyzed: 0,
            papers_saved: 0,
            papers_filtered: 0,
            papers_cache_hits: 0,
            papers_duplicates: 0,
            errors: vec![],
            saved_papers: vec![],
        }));

        // Spawn worker tasks
        let mut workers = Vec::new();
        let pool_clone = self.pool.clone();
        let total_papers_count = entries.len();
        for worker_id in 0..max_concurrent {
            let queue_clone = queue.clone();
            let result_clone = result.clone();
            let repo_clone = repo.clone();
            let llm_client_clone = llm_client.cloned();
            let topics_vec = topics.to_vec();
            let options_clone = options.clone();
            let latex_download_path_owned = latex_download_path.as_ref().map(|s| s.clone());
            let event_emitter_owned = event_emitter.as_ref().map(|emitter| Arc::clone(emitter));
            let cancel_token_clone = cancel_token.clone();
            let current_status = self.current_status.clone();
            let pool_clone_worker = pool_clone.clone();

            let worker = tokio::spawn(async move {
                Self::worker_task(
                    worker_id,
                    queue_clone,
                    result_clone,
                    repo_clone,
                    llm_client_clone,
                    topics_vec,
                    options_clone,
                    latex_download_path_owned,
                    event_emitter_owned,
                    cancel_token_clone,
                    current_status,
                    total_papers_count,
                    pool_clone_worker,
                ).await
            });

            workers.push(worker);
        }

        // Wait for all workers to complete
        eprintln!("[process_papers_async] About to wait for {} workers to complete", workers.len());
        let mut final_result = FetchResult {
            papers_fetched: entries.len(),
            papers_analyzed: 0,
            papers_saved: 0,
            papers_filtered: 0,
            papers_cache_hits: 0,
            papers_duplicates: 0,
            errors: vec![],
            saved_papers: vec![],
        };

        for (i, worker) in workers.into_iter().enumerate() {
            eprintln!("[process_papers_async] Waiting for worker {} to complete...", i);
            match worker.await {
                Ok(worker_result) => {
                    eprintln!("[process_papers_async] Worker {} completed: analyzed={}, saved={}, filtered={}",
                        i, worker_result.papers_analyzed, worker_result.papers_saved, worker_result.papers_filtered);
                    // Merge worker results
                    final_result.papers_analyzed += worker_result.papers_analyzed;
                    final_result.papers_saved += worker_result.papers_saved;
                    final_result.papers_filtered += worker_result.papers_filtered;
                    final_result.papers_cache_hits += worker_result.papers_cache_hits;
                    final_result.papers_duplicates += worker_result.papers_duplicates;
                    final_result.errors.extend(worker_result.errors);
                    final_result.saved_papers.extend(worker_result.saved_papers);
                }
                Err(e) => {
                    let error_msg = format!("Worker task failed: {}", e);
                    eprintln!("[process_papers_async] {}", error_msg);
                    final_result.errors.push(error_msg);
                }
            }
        }
        eprintln!("[process_papers_async] All workers completed, returning final result");

        eprintln!("[process_papers_async] Completed: {} analyzed, {} saved, {} filtered, {} errors",
            final_result.papers_analyzed, final_result.papers_saved, final_result.papers_filtered, final_result.errors.len());

        Ok(final_result)
    }

    /// Worker task that processes papers from the queue
    async fn worker_task(
        worker_id: usize,
        queue: TaskQueue,
        result: Arc<Mutex<FetchResult>>,
        repo: PaperRepository,
        llm_client: Option<LlmClient>,
        topics: Vec<TopicConfig>,
        options: FetchOptions,
        latex_download_path: Option<String>,
        event_emitter: Option<Arc<dyn Fn(FetchStatus) + Send + Sync>>,
        cancel_token: CancellationToken,
        current_status: Arc<Mutex<FetchStatus>>,
        total_papers: usize,
        pool: SqlitePool,
    ) -> FetchResult {
        eprintln!("[worker_{}] Starting worker task", worker_id);

        let mut local_result = FetchResult {
            papers_fetched: 0,
            papers_analyzed: 0,
            papers_saved: 0,
            papers_filtered: 0,
            papers_cache_hits: 0,
            papers_duplicates: 0,
            errors: vec![],
            saved_papers: vec![],
        };

        eprintln!("[worker_{}] Entering main loop", worker_id);

        // Process tasks until queue is empty
        loop {
            eprintln!("[worker_{}] Loop iteration start", worker_id);

            // Check for cancellation
            if cancel_token.is_cancelled() {
                eprintln!("[worker_{}] Cancelled", worker_id);
                break;
            }

            eprintln!("[worker_{}] About to call queue.next_task()", worker_id);

            // Get next task from queue
            match queue.next_task().await {
                Some((task, _permit)) => {
                    eprintln!("[worker_{}] Got task {}", worker_id, task.index);
                    // Check for cancellation again before processing
                    if cancel_token.is_cancelled() {
                        eprintln!("[worker_{}] Cancelled before processing task", worker_id);
                        break;
                    }

                    // Update status with active tasks count
                    {
                        let result_guard = result.lock().await;
                        // Count processed papers (saved + filtered + duplicates)
                        // Note: cache_hits is an attribute, not a separate category!
                        let total_processed = result_guard.papers_saved
                            + result_guard.papers_filtered
                            + result_guard.papers_duplicates;

                        let mut status = current_status.lock().await;

                        // Update all counters
                        status.papers_found = total_papers;
                        status.papers_analyzed = result_guard.papers_analyzed;
                        status.papers_saved = result_guard.papers_saved;
                        status.papers_filtered = result_guard.papers_filtered;
                        status.papers_cache_hits = result_guard.papers_cache_hits;
                        status.papers_duplicates = result_guard.papers_duplicates;
                        status.completed_tasks = total_processed;

                        // Active tasks = total - completed (what's left to do)
                        // We can also calculate this as: permits in use = total - available_permits
                        let permits_in_use = total_papers.saturating_sub(queue.available_permits().await);
                        status.active_tasks = permits_in_use.saturating_sub(total_processed);

                        // Queue size = what's left to pick up
                        status.queue_size = total_papers.saturating_sub(total_processed).saturating_sub(status.active_tasks);
                        status.async_mode = true;

                        // Calculate progress based on total processed (clamped to 0.9 max)
                        let progress_ratio = (total_processed as f32 / total_papers as f32).min(0.9);
                        status.progress = 0.1 + progress_ratio * 0.8;

                        // Create detailed step message
                        let skip_summary = vec![
                            if result_guard.papers_duplicates > 0 {
                                Some(format!("{} duplicates", result_guard.papers_duplicates))
                            } else {
                                None
                            },
                            if result_guard.papers_cache_hits > 0 {
                                Some(format!("{} cached", result_guard.papers_cache_hits))
                            } else {
                                None
                            },
                        ].into_iter().flatten().collect::<Vec<_>>().join(", ");

                        status.current_step = if skip_summary.is_empty() {
                            format!("Analyzing {}/{} ({} workers active)", total_processed, total_papers, status.active_tasks)
                        } else {
                            format!("Analyzing {}/{} ({} workers active, {})", total_processed, total_papers, status.active_tasks, skip_summary)
                        };

                        if let Some(ref emitter) = event_emitter {
                            emitter(status.clone());
                        }
                    }

                    // Process the paper using the existing process_paper method
                    // We need to adapt this to work without &self
                    match Self::process_paper_async(
                        &repo,
                        llm_client.as_ref(),
                        &task.entry,
                        &topics,
                        &options,
                        latex_download_path.as_deref(),
                        &pool,
                        worker_id,
                    ).await {
                        Ok(processed) => {
                            if processed.analyzed {
                                local_result.papers_analyzed += 1;
                            }
                            if processed.saved {
                                local_result.papers_saved += 1;
                            }
                            if processed.filtered {
                                local_result.papers_filtered += 1;
                            }
                            if processed.cache_hit {
                                local_result.papers_cache_hits += 1;
                            }
                            if processed.duplicate {
                                local_result.papers_duplicates += 1;
                            }

                            // Collect paper summary if saved
                            if let Some(ref summary) = processed.paper_summary {
                                local_result.saved_papers.push(summary.clone());
                            }

                            // Update shared result
                            {
                                let mut result_guard = result.lock().await;
                                if processed.analyzed {
                                    result_guard.papers_analyzed += 1;
                                }
                                if processed.saved {
                                    result_guard.papers_saved += 1;
                                }
                                if processed.filtered {
                                    result_guard.papers_filtered += 1;
                                }
                                if processed.cache_hit {
                                    result_guard.papers_cache_hits += 1;
                                }
                                if processed.duplicate {
                                    result_guard.papers_duplicates += 1;
                                }

                                // Collect paper summary if saved
                                if let Some(ref summary) = processed.paper_summary {
                                    result_guard.saved_papers.push(summary.clone());
                                }
                            }

                            // Update progress with all counters
                            {
                                let result_guard = result.lock().await;
                                // Count processed papers (saved + filtered + duplicates)
                                // Note: cache_hits is an attribute, not a separate category!
                                let total_processed = result_guard.papers_saved
                                    + result_guard.papers_filtered
                                    + result_guard.papers_duplicates;

                                let mut status = current_status.lock().await;

                                // Update all counters
                                status.papers_found = total_papers;
                                status.papers_analyzed = result_guard.papers_analyzed;
                                status.papers_saved = result_guard.papers_saved;
                                status.papers_filtered = result_guard.papers_filtered;
                                status.papers_cache_hits = result_guard.papers_cache_hits;
                                status.papers_duplicates = result_guard.papers_duplicates;
                                status.completed_tasks = total_processed;

                                // Active tasks = permits in use - completed
                                let permits_in_use = total_papers.saturating_sub(queue.available_permits().await);
                                status.active_tasks = permits_in_use.saturating_sub(total_processed);
                                status.queue_size = total_papers.saturating_sub(total_processed).saturating_sub(status.active_tasks);
                                status.async_mode = true;

                                // Calculate progress based on total processed (clamped to 0.9 max)
                                let progress_ratio = (total_processed as f32 / total_papers as f32).min(0.9);
                                status.progress = 0.1 + progress_ratio * 0.8;

                                // Create detailed step message
                                let skip_summary = vec![
                                    if result_guard.papers_duplicates > 0 {
                                        Some(format!("{} duplicates", result_guard.papers_duplicates))
                                    } else {
                                        None
                                    },
                                    if result_guard.papers_cache_hits > 0 {
                                        Some(format!("{} cached", result_guard.papers_cache_hits))
                                    } else {
                                        None
                                    },
                                ].into_iter().flatten().collect::<Vec<_>>().join(", ");

                                status.current_step = if skip_summary.is_empty() {
                                    format!("Analyzed {}/{} ({} workers active)", total_processed, total_papers, status.active_tasks)
                                } else {
                                    format!("Analyzed {}/{} ({} workers active, {})", total_processed, total_papers, status.active_tasks, skip_summary)
                                };

                                if let Some(ref emitter) = event_emitter {
                                    emitter(status.clone());
                                }
                            }
                        }
                        Err(e) => {
                            let error_msg = format!("Worker {} failed to process '{}': {}", worker_id, task.entry.title, e);
                            eprintln!("[worker_{}] {}", worker_id, error_msg);
                            local_result.errors.push(error_msg.clone());

                            // Update failed count
                            {
                                let mut result_guard = result.lock().await;
                                result_guard.errors.push(error_msg);
                            }
                        }
                    }
                }
                None => {
                    // Queue is empty
                    eprintln!("[worker_{}] Queue empty, exiting", worker_id);
                    break;
                }
            }
        }

        local_result
    }

    /// Process a single paper asynchronously (shared between sync and async modes)
    async fn process_paper_async(
        repo: &PaperRepository,
        llm_client: Option<&LlmClient>,
        entry: &ArxivEntry,
        topics: &[TopicConfig],
        options: &FetchOptions,
        latex_download_path: Option<&str>,
        pool: &SqlitePool,
        worker_id: usize,
    ) -> Result<ProcessedPaperResult, FetchError> {
        let arxiv_id = entry.get_arxiv_id();

        // Check if paper already exists
        if let Ok(_) = repo.get_by_id(&arxiv_id).await {
            eprintln!("[process_paper_async][worker_{}] Paper {} already exists, skipping", worker_id, arxiv_id);
            return Ok(ProcessedPaperResult {
                analyzed: false,
                saved: false,
                filtered: false,
                cache_hit: false,
                duplicate: true,
                paper_summary: None,
            });
        }

        // Convert to paper
        let arxiv_paper = entry.to_arxiv_paper()?;
        let mut paper = Paper::from_arxiv(arxiv_paper);

        // Match topics
        let matched_topics: Vec<String> = topics.iter()
            .filter(|topic| {
                let topic_categories = topic.arxiv_categories.as_deref().unwrap_or(&[]);
                entry.categories.iter().any(|cat| topic_categories.contains(&cat.term))
            })
            .map(|topic| topic.key.clone())
            .collect();

        paper.topics = matched_topics;

        // LLM analysis (if available)
        let mut analyzed = false;
        let filtered = false;
        let mut cache_hit = false;

        if let Some(client) = llm_client {
            let language = options.language.as_deref().unwrap_or("en");

            // Relevance analysis
            let relevance_result = Self::perform_relevance_analysis_for_paper(
                client,
                pool,
                &arxiv_id,
                &entry.title,
                &entry.summary,
                topics,
                language,
            ).await?;

            // Check cache hit
            cache_hit = relevance_result.from_cache;

            // Check relevance threshold - skip filtering in fetch-by-ID mode
            // since user explicitly requested these papers
            if !options.fetch_by_id && relevance_result.result.score < options.min_relevance {
                return Ok(ProcessedPaperResult {
                    analyzed: true,
                    saved: false,
                    filtered: true,
                    cache_hit,
                    duplicate: false,
                    paper_summary: None,
                });
            }

            analyzed = true;

            // Update paper with relevance data
            paper.tags = relevance_result.result.suggested_tags;
            paper.filter_score = Some(relevance_result.result.score);
            paper.filter_reason = Some(relevance_result.result.reason);

            // Update topics based on LLM suggestions
            if !relevance_result.result.suggested_topics.is_empty() {
                paper.topics = relevance_result.result.suggested_topics;
            }

            // Deep analysis (if enabled)
            if options.deep_analysis {
                let threshold = options.deep_analysis_threshold.unwrap_or(0);
                if relevance_result.result.score >= threshold {
                    Self::perform_deep_analysis_for_paper(
                        client,
                        &mut paper,
                        entry,
                        topics,
                        options,
                        latex_download_path,
                    ).await?;
                }
            }
        }

        // Save to database
        let was_inserted = repo.save_if_not_exists(&paper)
            .await
            .map_err(|e| FetchError::DatabaseError(e.to_string()))?;

        // Create paper summary if saved
        let paper_summary = if was_inserted {
            Some(PaperSummary {
                id: paper.id.clone(),
                title: paper.title.clone(),
                arxiv_id: paper.arxiv_id.clone(),
            })
        } else {
            None
        };

        Ok(ProcessedPaperResult {
            analyzed,
            saved: was_inserted,
            filtered,
            cache_hit,
            duplicate: false,
            paper_summary,
        })
    }

    /// Perform relevance analysis for a paper
    async fn perform_relevance_analysis_for_paper(
        client: &LlmClient,
        pool: &SqlitePool,
        arxiv_id: &str,
        title: &str,
        summary: &str,
        topics: &[TopicConfig],
        language: &str,
    ) -> Result<RelevanceAnalysisWithCache, FetchError> {
        use crate::database::ClassificationCacheRepository;

        // Check cache first
        let cache_repo = ClassificationCacheRepository::new(pool);
        if let Ok(Some(cached_result)) = cache_repo.get(arxiv_id, topics).await {
            eprintln!("[perform_relevance_analysis_for_paper] Cache hit for {}: using cached relevance", arxiv_id);
            return Ok(RelevanceAnalysisWithCache {
                result: RelevanceResult {
                    score: cached_result.score,
                    reason: cached_result.reason,
                    suggested_tags: cached_result.suggested_tags,
                    suggested_topics: cached_result.suggested_topics,
                },
                from_cache: true,
            });
        }

        // Call LLM for relevance analysis
        eprintln!("[perform_relevance_analysis_for_paper] Cache miss for {}: calling LLM API", arxiv_id);
        let result = client.analyze_relevance(title, summary, topics, language).await?;

        // Save to cache
        let legacy_result = crate::llm::ClassificationResult {
            is_relevant: result.score >= 60,
            score: result.score,
            reason: result.reason.clone(),
            suggested_tags: result.suggested_tags.clone(),
            suggested_topics: result.suggested_topics.clone(),
        };

        if let Err(e) = cache_repo.save(arxiv_id, topics, &legacy_result).await {
            eprintln!("[perform_relevance_analysis_for_paper] Failed to save to cache: {}", e);
        }

        Ok(RelevanceAnalysisWithCache {
            result,
            from_cache: false,
        })
    }

    /// Perform deep analysis for a paper
    async fn perform_deep_analysis_for_paper(
        client: &LlmClient,
        paper: &mut Paper,
        entry: &ArxivEntry,
        topics: &[TopicConfig],
        options: &FetchOptions,
        latex_download_path: Option<&str>,
    ) -> Result<(), FetchError> {
        use std::path::Path;

        let analysis_mode = options.analysis_mode.as_deref().unwrap_or("standard");
        let language = options.language.as_deref().unwrap_or("en");

        // Download LaTeX if path is configured
        let latex_result = if let Some(download_path) = latex_download_path {
            let path = Path::new(download_path);
            Some(entry.download_latex_source(path).await
                .map_err(|e| FetchError::NetworkError(format!("LaTeX download failed: {}", e))))
        } else {
            eprintln!("[perform_deep_analysis_for_paper] No LaTeX download path configured");
            None
        };

        match analysis_mode {
            "full" => {
                // Full mode analysis
                Self::perform_full_analysis_impl(client, paper, entry, topics, latex_result, language).await?;
            }
            "standard" | _ => {
                // Standard mode analysis
                Self::perform_standard_analysis_impl(client, paper, entry, topics, latex_result, language).await?;
            }
        }

        Ok(())
    }

    /// Perform Full mode analysis (shared implementation for both sync and async)
    async fn perform_full_analysis_impl(
        client: &LlmClient,
        paper: &mut Paper,
        entry: &ArxivEntry,
        topics: &[TopicConfig],
        latex_result: Option<Result<String, FetchError>>,
        language: &str,
    ) -> Result<(), FetchError> {
        let latex_content = match latex_result {
            Some(Ok(latex_path)) => {
                // LaTeX downloaded successfully
                match std::fs::read_to_string(&latex_path) {
                    Ok(content) => {
                        eprintln!("[perform_full_analysis_impl] LaTeX downloaded ({} bytes)", content.len());
                        Some(content)
                    }
                    Err(e) => {
                        eprintln!("[perform_full_analysis_impl] Failed to read LaTeX file: {}", e);
                        None
                    }
                }
            }
            Some(Err(e)) => {
                eprintln!("[perform_full_analysis_impl] Failed to download LaTeX: {}", e);
                None
            }
            None => None
        };

        // Full mode requires LaTeX - mark as incomplete if not available
        let content = match latex_content {
            Some(latex) => latex,
            None => {
                eprintln!("[perform_full_analysis_impl] No LaTeX available, marking as incomplete");
                paper.analysis_incomplete = true;
                return Ok(());
            }
        };

        // Limit content to 50000 characters to avoid token limits
        let content_limited = content.chars().take(50000).collect::<String>();
        eprintln!("[perform_full_analysis_impl] Content limited to {} chars", content_limited.len());

        // Perform Full analysis
        let analysis = client.analyze_full(
            &entry.title,
            &entry.summary,
            topics,
            &content_limited,
            language
        ).await?;

        // Update paper with Full analysis results
        paper.ai_summary = Some(analysis.ai_summary);
        paper.key_insights = Some(analysis.key_insights);
        paper.novelty_score = Some(analysis.novelty_score);
        paper.novelty_reason = Some(analysis.novelty_reason);
        paper.effectiveness_score = Some(analysis.effectiveness_score);
        paper.effectiveness_reason = Some(analysis.effectiveness_reason);
        paper.experiment_completeness_score = Some(analysis.experiment_completeness_score);
        paper.experiment_completeness_reason = Some(analysis.experiment_completeness_reason);
        paper.algorithm_flowchart = analysis.algorithm_flowchart;
        paper.time_complexity = analysis.time_complexity;
        paper.space_complexity = analysis.space_complexity;
        paper.code_available = analysis.code_available;
        paper.code_links = if analysis.code_links.is_empty() {
            None
        } else {
            Some(analysis.code_links)
        };
        // Fallback: if code_links exist but LLM incorrectly set code_available=false, correct it
        if paper.code_links.is_some() && !paper.code_available {
            eprintln!("[perform_full_analysis_impl] LLM returned code_links but code_available=false, correcting to true for {}", paper.id);
            paper.code_available = true;
        }
        paper.engineering_notes = Some(analysis.engineering_notes);

        // Update tags (only suggested_tags, not suggested_topics)
        paper.tags = analysis.suggested_tags;

        // Update topics if LLM provided suggestions
        if !analysis.suggested_topics.is_empty() {
            eprintln!("[perform_full_analysis_impl] Updating topics from LLM suggestions: {:?}", analysis.suggested_topics);
            paper.topics = analysis.suggested_topics;
        }

        paper.analysis_mode = Some("full".to_string());
        paper.is_deep_analyzed = true;

        eprintln!("[perform_full_analysis_impl] Full analysis complete for {}", paper.id);
        Ok(())
    }

    /// Perform standard mode analysis (shared implementation)
    async fn perform_standard_analysis_impl(
        client: &LlmClient,
        paper: &mut Paper,
        entry: &ArxivEntry,
        topics: &[TopicConfig],
        latex_result: Option<Result<String, FetchError>>,
        language: &str,
    ) -> Result<(), FetchError> {
        use crate::latex_parser::extract_intro_conclusion;

        let latex_content = match latex_result {
            Some(Ok(latex_path)) => {
                // LaTeX downloaded successfully
                match std::fs::read_to_string(&latex_path) {
                    Ok(content) => {
                        eprintln!("[perform_standard_analysis_impl] LaTeX downloaded ({} bytes), extracting intro+conclusion", content.len());
                        Some(extract_intro_conclusion(&content))
                    }
                    Err(e) => {
                        eprintln!("[perform_standard_analysis_impl] Failed to read LaTeX file: {}, falling back to abstract", e);
                        None
                    }
                }
            }
            Some(Err(e)) => {
                eprintln!("[perform_standard_analysis_impl] Failed to download LaTeX: {}, falling back to abstract", e);
                None
            }
            None => None
        };

        // If LaTeX extraction failed, use abstract
        let content = latex_content.as_deref().unwrap_or(&entry.summary);
        let is_fallback = latex_content.is_none();

        if is_fallback {
            eprintln!("[perform_standard_analysis_impl] Using abstract as fallback content");
        }

        // Perform Standard analysis
        let analysis = client.analyze_standard(
            &entry.title,
            &entry.summary,
            topics,
            content,
            language
        ).await?;

        // Update paper with Standard analysis results
        paper.ai_summary = Some(analysis.ai_summary);
        paper.key_insights = Some(analysis.key_insights);
        paper.novelty_score = Some(analysis.novelty_score);
        paper.novelty_reason = Some(analysis.novelty_reason);
        paper.effectiveness_score = Some(analysis.effectiveness_score);
        paper.effectiveness_reason = Some(analysis.effectiveness_reason);
        paper.code_available = analysis.code_available;
        paper.code_links = if analysis.code_links.is_empty() {
            None
        } else {
            Some(analysis.code_links)
        };

        Ok(())
    }

    /// Internal fetch implementation
    async fn do_fetch(
        &self,
        options: FetchOptions,
        topics: Vec<TopicConfig>,
        event_emitter: Option<Arc<dyn Fn(FetchStatus) + Send + Sync>>,
        cancel_token: CancellationToken,
    ) -> Result<FetchResult, FetchError> {
        eprintln!("[FetchManager] Starting fetch with options: {:?}", options);
        eprintln!("[FetchManager] Topics ({} items): {:?}", topics.len(), topics);

        // Step 1: Fetch from ArXiv
        self.update_status(
            "fetching",
            0.05,
            "Connecting to ArXiv...",
            0,
            0,
            0,
            0,
            0,
            0,
            &event_emitter,
        )
        .await;

        // Check for cancellation
        if cancel_token.is_cancelled() {
            eprintln!("[FetchManager] Fetch cancelled before starting");
            return Err(FetchError::Cancelled);
        }

        // In fetch-by-ID mode, check for duplicates before fetching
        let existing_ids = if options.fetch_by_id {
            if let Some(ids) = &options.arxiv_ids {
                crate::database::papers::papers_exist_by_arxiv_ids(&self.pool, ids)
                    .await
                    .map_err(|e| FetchError::DatabaseError(format!("Failed to check existing papers: {}", e)))?
            } else {
                vec![]
            }
        } else {
            vec![]
        };

        // Warn about existing papers
        if !existing_ids.is_empty() {
            eprintln!("[FetchManager] {} papers already exist, will be skipped: {:?}",
                existing_ids.len(), existing_ids);
            self.update_status(
                "fetched",
                0.05,
                &format!("{} papers already exist, will skip", existing_ids.len()),
                existing_ids.len(),
                0,
                0,
                0,
                0,
                0,
                &event_emitter,
            )
            .await;
        }

        let arxiv_options = ArxivFetchOptions {
            categories: options.categories.clone(),
            max_results: options.max_papers as usize,
            days_back: options.days_back.map(|d| d as u32),
            date_from: options.date_from.as_ref().map(|d| d.replace("-", "")),
            date_to: options.date_to.as_ref().map(|d| d.replace("-", "")),
            fetch_by_id: options.fetch_by_id,
            arxiv_ids: options.arxiv_ids.clone(),
        };

        eprintln!("[FetchManager] Fetching from ArXiv with options: {:?}", arxiv_options);

        let entries = match arxiv::fetch_papers(&arxiv_options).await {
            Ok(e) => {
                eprintln!("[FetchManager] Fetched {} entries from ArXiv", e.len());
                e
            }
            Err(e) => {
                eprintln!("[FetchManager] Failed to fetch from ArXiv: {}", e);
                return Err(FetchError::from(e));
            }
        };

        self.update_status(
            "fetched",
            0.1,
            &format!("Fetched {} papers from ArXiv", entries.len()),
            entries.len(),
            0,
            0,
            0,
            0,
            0,
            &event_emitter,
        )
        .await;

        if entries.is_empty() {
            return Ok(FetchResult {
                papers_fetched: 0,
                papers_analyzed: 0,
                papers_saved: 0,
                papers_filtered: 0,
                papers_cache_hits: 0,
                papers_duplicates: 0,
                errors: vec![],
                saved_papers: vec![],
            });
        }

        // Step 2: Initialize LLM client (optional - if no API key, skip LLM analysis)
        let llm_client_result = LlmClient::new(
            options.llm_provider.clone(),
            options.api_key.clone(),
            options.quick_model.clone(),
            options.deep_model.clone(),
        );
        let has_llm = llm_client_result.is_ok();
        let mut llm_client = llm_client_result.ok();

        if !has_llm {
            // No API key configured - will save papers without LLM analysis
            self.update_status(
                "fetching",
                0.15,
                "No API key configured - saving papers without AI analysis",
                entries.len(),
                0,
                0,
                0,
                0,
                0,
                &event_emitter,
            )
            .await;
        }

        // Step 3: Get settings (for retry config and LaTeX path)
        let settings_repo = crate::database::SettingsRepository::new(&self.pool);
        let settings = settings_repo.get_all().await;

        // Apply retry configuration if LLM client was created successfully
        if llm_client.is_some() {
            if let Ok(ref settings) = settings {
                if let Some(retry_config) = &settings.retry_config {
                    eprintln!("[FetchManager] Applying retry config to LLM client");
                    llm_client = Some(llm_client.unwrap().with_retry_config(retry_config.clone()));
                }
            }
        }

        // Step 4: Process each paper
        let mut result = FetchResult {
            papers_fetched: entries.len(),
            papers_analyzed: 0,
            papers_saved: 0,
            papers_filtered: 0,
            papers_cache_hits: 0,
            papers_duplicates: 0,
            errors: vec![],
            saved_papers: vec![],
        };

        let repo = PaperRepository::new(&self.pool);

        // Track actual work items (excluding duplicates that are skipped instantly)
        let mut actual_processed = 0; // Count of papers that actually required work

        // Get LaTeX download path from settings, or use default path
        let latex_download_path = match &settings {
            Ok(settings) => {
                if let Some(path) = &settings.latex_download_path {
                    eprintln!("[FetchManager] Using configured LaTeX download path: {}", path);
                    Some(path.clone())
                } else {
                    // Use default path: ~/Documents/PaperFuse/latex
                    let default_path = dirs::home_dir()
                        .map(|home| home.join("Documents").join("PaperFuse").join("latex"));
                    if let Some(ref path) = default_path {
                        // Create directory if it doesn't exist
                        if let Err(e) = std::fs::create_dir_all(path) {
                            eprintln!("[FetchManager] Failed to create default LaTeX directory: {}. LaTeX download disabled.", e);
                            None
                        } else {
                            let path_str = path.to_string_lossy().to_string();
                            eprintln!("[FetchManager] Using default LaTeX download path: {}", path_str);
                            Some(path_str)
                        }
                    } else {
                        eprintln!("[FetchManager] Failed to determine home directory. LaTeX download disabled.");
                        None
                    }
                }
            }
            Err(e) => {
                eprintln!("[FetchManager] Failed to get settings: {}. LaTeX download disabled.", e);
                None
            }
        };

        // Check if we should use async processing
        let is_async = options.async_mode.as_deref() == Some("async") && has_llm;

        if is_async {
            // Async mode: process papers concurrently
            let max_concurrent = options.max_concurrent.unwrap_or(1);
            eprintln!("[FetchManager] Starting async processing with {} concurrent workers", max_concurrent);

            result = self.process_papers_async(
                &entries,
                &repo,
                llm_client.as_ref(),
                &topics,
                &options,
                latex_download_path,
                max_concurrent,
                &event_emitter,
                &cancel_token,
            ).await?;

            eprintln!("[FetchManager] Async processing completed. Analyzed: {}, Saved: {}, Filtered: {}, Duplicates: {}",
                result.papers_analyzed, result.papers_saved, result.papers_filtered, result.papers_duplicates);

        } else {
            // Sync mode: process papers sequentially (existing behavior)
            for entry in entries.iter() {
                // Check for cancellation before processing each paper
                if cancel_token.is_cancelled() {
                    return Err(FetchError::Cancelled);
                }

                // Calculate effective total for progress percentage
                let effective_total = entries.len().saturating_sub(result.papers_duplicates);
                let effective_total = effective_total.max(1);

                // Create skip summary for display
                let skip_summary = vec![
                    if result.papers_duplicates > 0 {
                        Some(format!("{} duplicates", result.papers_duplicates))
                    } else {
                        None
                    },
                    if result.papers_cache_hits > 0 {
                        Some(format!("{} cached", result.papers_cache_hits))
                    } else {
                        None
                    },
                ].into_iter().flatten().collect::<Vec<_>>().join(", ");

                let step_name = if has_llm {
                    if skip_summary.is_empty() {
                        format!("Analyzing {}/{}: {}", actual_processed, entries.len(), entry.title)
                    } else {
                        format!("Analyzing {}/{} ({}): {}", actual_processed, entries.len(), skip_summary, entry.title)
                    }
                } else {
                    if skip_summary.is_empty() {
                        format!("Saving {}/{}: {}", actual_processed, entries.len(), entry.title)
                    } else {
                        format!("Saving {}/{} ({}): {}", actual_processed, entries.len(), skip_summary, entry.title)
                    }
                };

                // Calculate initial progress for this paper (clamped to 0.9 max for the 0.8 multiplier)
                let progress = if effective_total > 0 {
                    let progress_ratio = (actual_processed as f32 / effective_total as f32).min(0.9);
                    0.1 + progress_ratio * 0.8
                } else {
                    0.1
                };

                // Show initial status for this paper
                self.update_status(
                    "processing",
                    progress,
                    &step_name,
                    entries.len(),
                    result.papers_analyzed,
                    result.papers_saved,
                    result.papers_filtered,
                    result.papers_cache_hits,
                    result.papers_duplicates,
                    &event_emitter,
                )
                .await;

                // Process the paper (with or without LLM analysis)
                let current_duplicates = result.papers_duplicates;
                match self
                    .process_paper(&repo, llm_client.as_ref(), entry, &topics, &options, &mut result, has_llm, latex_download_path.as_deref())
                    .await
                {
                    Ok(_) => {
                        // Only increment actual_processed if this wasn't a duplicate
                        if result.papers_duplicates == current_duplicates {
                            // This paper required actual work (not a duplicate)
                            actual_processed += 1;
                        }

                        if has_llm {
                            result.papers_analyzed += 1;
                        }

                        // Calculate progress based on actual work done
                        // Progress percentage uses effective_total (actual work)
                        // But display messages use total_found for consistency
                        let effective_total = entries.len().saturating_sub(result.papers_duplicates);
                        let effective_total = effective_total.max(1); // Avoid division by zero

                        // Calculate progress (clamped to 0.9 max for the 0.8 multiplier)
                        let progress = if effective_total > 0 {
                            let progress_ratio = (actual_processed as f32 / effective_total as f32).min(0.9);
                            0.1 + progress_ratio * 0.8
                        } else {
                            0.1
                        };

                        // Show progress with total count (always shows X/10)
                        // Add summary of skips in parentheses
                        let skip_summary = vec![
                            if result.papers_duplicates > 0 {
                                Some(format!("{} duplicates", result.papers_duplicates))
                            } else {
                                None
                            },
                            if result.papers_cache_hits > 0 {
                                Some(format!("{} cached", result.papers_cache_hits))
                            } else {
                                None
                            },
                        ].into_iter().flatten().collect::<Vec<_>>().join(", ");

                        let complete_step = if has_llm {
                            if skip_summary.is_empty() {
                                format!("Analyzed {}/{}: {}", actual_processed, entries.len(), entry.title)
                            } else {
                                format!("Analyzed {}/{} ({}): {}", actual_processed, entries.len(), skip_summary, entry.title)
                            }
                        } else {
                            if skip_summary.is_empty() {
                                format!("Saved {}/{}: {}", actual_processed, entries.len(), entry.title)
                            } else {
                                format!("Saved {}/{} ({}): {}", actual_processed, entries.len(), skip_summary, entry.title)
                            }
                        };

                        self.update_status(
                            "processing",
                            progress,
                            &complete_step,
                            entries.len(),
                            result.papers_analyzed,
                            result.papers_saved,
                            result.papers_filtered,
                            result.papers_cache_hits,
                            result.papers_duplicates,
                            &event_emitter,
                        )
                        .await;
                    }
                    Err(e) => {
                        let error_msg = format!("Failed to process '{}': {}", entry.title, e);
                        result.errors.push(error_msg.clone());
                        eprintln!("{}", error_msg);
                    }
                }
            }
        }

        // Step 4: Complete
        eprintln!("[FetchManager] About to send completed status. Saved: {} papers", result.papers_saved);
        self.update_status(
            "completed",
            1.0,
            &format!(
                "Completed! Saved {} papers",
                result.papers_saved
            ),
            result.papers_fetched,
            result.papers_analyzed,
            result.papers_saved,
            result.papers_filtered,
            result.papers_cache_hits,
            result.papers_duplicates,
            &event_emitter,
        )
        .await;
        eprintln!("[FetchManager] Completed status sent successfully");

        Ok(result)
    }

    /// Process a single paper
    async fn process_paper(
        &self,
        repo: &PaperRepository,
        llm_client: Option<&LlmClient>,
        entry: &ArxivEntry,
        topics: &[TopicConfig],
        options: &FetchOptions,
        result: &mut FetchResult,
        has_llm: bool,
        latex_download_path: Option<&str>,
    ) -> Result<(), FetchError> {
        let arxiv_id = entry.get_arxiv_id();

        // Check if paper already exists (by arxiv_id)
        // This avoids re-analyzing papers that were already processed
        if let Ok(_) = repo.get_by_id(&arxiv_id).await {
            eprintln!("[process_paper] Paper {} already exists in database, skipping analysis", arxiv_id);
            result.papers_duplicates += 1;
            return Ok(());
        }

        // Convert to paper
        let arxiv_paper = entry.to_arxiv_paper()?;
        let mut paper = Paper::from_arxiv(arxiv_paper);

        // Determine which topics this paper belongs to based on fetch configuration
        // A paper belongs to a topic if its categories match the topic's ArXiv categories
        let paper_categories: Vec<&str> = entry.categories.iter().map(|c| c.term.as_str()).collect();
        eprintln!("[process_paper] Paper categories: {:?}", paper_categories);
        eprintln!("[process_paper] Configured topics count: {}", topics.len());

        let matched_topics: Vec<String> = topics.iter()
            .filter(|topic| {
                // Check if entry categories intersect with topic's ArXiv categories
                let topic_categories = topic.arxiv_categories.as_deref().unwrap_or(&[]);
                let matches = entry.categories.iter().any(|cat| topic_categories.contains(&cat.term));
                if matches {
                    eprintln!("[process_paper] Topic '{}' matched! Paper has category that matches topic's ArXiv categories: {:?}", topic.key, topic_categories);
                }
                matches
            })
            .map(|topic| topic.key.clone())
            .collect();

        eprintln!("[process_paper] Matched topics for {}: {:?}", arxiv_id, matched_topics);
        paper.topics = matched_topics;

        // If LLM is available, perform two-phase analysis
        if has_llm {
            if let Some(client) = llm_client {
                let language = options.language.as_deref().unwrap_or("en");

                // ========== PHASE 1: RELEVANCE ANALYSIS (always performed) ==========
                let relevance = self.perform_relevance_analysis(
                    client,
                    &arxiv_id,
                    &entry.title,
                    &entry.summary,
                    topics,
                    result,
                    language,
                ).await?;

                // Check if paper meets relevance threshold
                if relevance.score < options.min_relevance {
                    eprintln!("[process_paper] Paper {} (score: {}) below relevance threshold ({}), filtering",
                        arxiv_id, relevance.score, options.min_relevance);
                    result.papers_filtered += 1;
                    return Ok(());
                }

                // Update paper with relevance data
                paper.tags = relevance.suggested_tags;
                paper.filter_score = Some(relevance.score);
                paper.filter_reason = Some(relevance.reason);

                // Update topics based on LLM suggestions (if available)
                // LLM suggested topics can be more accurate than ArXiv category matching
                if !relevance.suggested_topics.is_empty() {
                    eprintln!("[process_paper] Updating topics based on LLM suggestions: {:?}", relevance.suggested_topics);
                    paper.topics = relevance.suggested_topics;
                }

                // ========== PHASE 2: DEEP ANALYSIS (conditional) ==========
                if options.deep_analysis {
                    let threshold = options.deep_analysis_threshold.unwrap_or(0);
                    if relevance.score >= threshold {
                        eprintln!("[process_paper] Paper {} (score: {}) meets deep analysis threshold ({}), performing {} analysis",
                            arxiv_id, relevance.score, threshold,
                            options.analysis_mode.as_deref().unwrap_or("standard"));

                        self.perform_deep_analysis(
                            client,
                            &mut paper,
                            entry,
                            topics,
                            options,
                            latex_download_path
                        ).await?;
                    } else {
                        eprintln!("[process_paper] Paper {} (score: {}) below deep analysis threshold ({}), skipping deep analysis",
                            arxiv_id, relevance.score, threshold);
                    }
                }
            }
        } else {
            // No LLM - save all papers without filtering or scores
            eprintln!("[process_paper] No LLM available, saving paper {} without analysis", arxiv_id);
            paper.tags = vec![];
            paper.filter_score = None;
            paper.filter_reason = None;
        }

        // Save to database (atomic insert, skip if already exists)
        // This avoids TOCTOU race conditions
        let was_inserted = repo.save_if_not_exists(&paper)
            .await
            .map_err(|e| FetchError::DatabaseError(e.to_string()))?;

        if was_inserted {
            result.papers_saved += 1;
            // Add paper summary to track saved papers
            result.saved_papers.push(PaperSummary {
                id: paper.id.clone(),
                title: paper.title.clone(),
                arxiv_id: paper.arxiv_id.clone(),
            });
        } else {
            eprintln!("[process_paper] Paper {} already exists in database, skipped", arxiv_id);
        }

        Ok(())
    }

    /// Perform Phase 1 relevance analysis
    async fn perform_relevance_analysis(
        &self,
        client: &LlmClient,
        arxiv_id: &str,
        title: &str,
        summary: &str,
        topics: &[TopicConfig],
        result: &mut FetchResult,
        language: &str,
    ) -> Result<RelevanceResult, FetchError> {
        use crate::database::ClassificationCacheRepository;

        // Check cache first
        let cache_repo = ClassificationCacheRepository::new(&self.pool);
        if let Ok(Some(cached_result)) = cache_repo.get(arxiv_id, topics).await {
            eprintln!("[perform_relevance_analysis] Cache hit for {}: using cached relevance", arxiv_id);
            result.papers_cache_hits += 1;
            // Convert cached ClassificationResult to RelevanceResult
            return Ok(RelevanceResult {
                score: cached_result.score,
                reason: cached_result.reason,
                suggested_tags: cached_result.suggested_tags,
                suggested_topics: cached_result.suggested_topics,
            });
        }

        // Call LLM for relevance analysis
        eprintln!("[perform_relevance_analysis] Cache miss for {}: calling LLM API", arxiv_id);
        let result = client.analyze_relevance(title, summary, topics, language).await?;

        // Save to cache (reuse ClassificationResult structure for cache compatibility)
        let legacy_result = crate::llm::ClassificationResult {
            is_relevant: result.score >= 60, // arbitrary threshold for cache
            score: result.score,
            reason: result.reason.clone(),
            suggested_tags: result.suggested_tags.clone(),
            suggested_topics: result.suggested_topics.clone(),
        };

        if let Err(e) = cache_repo.save(arxiv_id, topics, &legacy_result).await {
            eprintln!("[perform_relevance_analysis] Failed to save to cache: {}", e);
        }

        Ok(result)
    }

    /// Perform Phase 2 deep analysis
    async fn perform_deep_analysis(
        &self,
        client: &LlmClient,
        paper: &mut Paper,
        entry: &ArxivEntry,
        topics: &[TopicConfig],
        options: &FetchOptions,
        latex_download_path: Option<&str>,
    ) -> Result<(), FetchError> {
        use std::path::Path;

        let analysis_mode = options.analysis_mode.as_deref().unwrap_or("standard");
        let language = options.language.as_deref().unwrap_or("en");

        // Download LaTeX if path is configured
        let latex_result = if let Some(download_path) = latex_download_path {
            let path = Path::new(download_path);
            Some(entry.download_latex_source(path).await
                .map_err(|e| FetchError::NetworkError(format!("LaTeX download failed: {}", e))))
        } else {
            eprintln!("[perform_deep_analysis] No LaTeX download path configured");
            None
        };

        match analysis_mode {
            "full" => {
                // Full mode analysis
                self.perform_full_analysis(client, paper, entry, topics, latex_result, language).await?;
            }
            "standard" | _ => {
                // Standard mode analysis
                self.perform_standard_analysis(client, paper, entry, topics, latex_result, language).await?;
            }
        }

        Ok(())
    }

    /// Perform Standard mode analysis (Introduction + Conclusion)
    async fn perform_standard_analysis(
        &self,
        client: &LlmClient,
        paper: &mut Paper,
        entry: &ArxivEntry,
        topics: &[TopicConfig],
        latex_result: Option<Result<String, FetchError>>,
        language: &str,
    ) -> Result<(), FetchError> {
        use crate::latex_parser::extract_intro_conclusion;

        let latex_content = match latex_result {
            Some(Ok(latex_path)) => {
                // LaTeX downloaded successfully
                match std::fs::read_to_string(&latex_path) {
                    Ok(content) => {
                        eprintln!("[perform_standard_analysis] LaTeX downloaded ({} bytes), extracting intro+conclusion", content.len());
                        Some(extract_intro_conclusion(&content))
                    }
                    Err(e) => {
                        eprintln!("[perform_standard_analysis] Failed to read LaTeX file: {}, falling back to abstract", e);
                        None
                    }
                }
            }
            Some(Err(e)) => {
                eprintln!("[perform_standard_analysis] Failed to download LaTeX: {}, falling back to abstract", e);
                None
            }
            None => None
        };

        // If LaTeX extraction failed, use abstract
        let content = latex_content.as_deref().unwrap_or(&entry.summary);
        let is_fallback = latex_content.is_none();

        if is_fallback {
            eprintln!("[perform_standard_analysis] Using abstract as fallback content");
        }

        // Perform Standard analysis
        let analysis = client.analyze_standard(
            &entry.title,
            &entry.summary,
            topics,
            content,
            language
        ).await?;

        // Update paper with Standard analysis results
        paper.ai_summary = Some(analysis.ai_summary);
        paper.key_insights = Some(analysis.key_insights);
        paper.novelty_score = Some(analysis.novelty_score);
        paper.novelty_reason = Some(analysis.novelty_reason);
        paper.effectiveness_score = Some(analysis.effectiveness_score);
        paper.effectiveness_reason = Some(analysis.effectiveness_reason);
        paper.code_available = analysis.code_available;
        paper.code_links = if analysis.code_links.is_empty() {
            None
        } else {
            Some(analysis.code_links)
        };
        // Fallback: if code_links exist but LLM incorrectly set code_available=false, correct it
        if paper.code_links.is_some() && !paper.code_available {
            eprintln!("[perform_standard_analysis] LLM returned code_links but code_available=false, correcting to true for {}", paper.id);
            paper.code_available = true;
        }
        paper.engineering_notes = Some(analysis.engineering_notes);

        // Update tags (only suggested_tags, not suggested_topics)
        paper.tags = analysis.suggested_tags;

        // Update topics if LLM provided suggestions
        if !analysis.suggested_topics.is_empty() {
            eprintln!("[perform_standard_analysis] Updating topics from LLM suggestions: {:?}", analysis.suggested_topics);
            paper.topics = analysis.suggested_topics;
        }

        paper.analysis_mode = Some("standard".to_string());
        paper.is_deep_analyzed = true;
        paper.analysis_incomplete = is_fallback;

        eprintln!("[perform_standard_analysis] Standard analysis complete for {}", paper.id);
        eprintln!("  - topics: {:?}", paper.topics);
        eprintln!("  - tags: {:?}", paper.tags);
        Ok(())
    }

    /// Perform Full mode analysis (full paper content)
    async fn perform_full_analysis(
        &self,
        client: &LlmClient,
        paper: &mut Paper,
        entry: &ArxivEntry,
        topics: &[TopicConfig],
        latex_result: Option<Result<String, FetchError>>,
        language: &str,
    ) -> Result<(), FetchError> {
        let latex_content = match latex_result {
            Some(Ok(latex_path)) => {
                // LaTeX downloaded successfully
                match std::fs::read_to_string(&latex_path) {
                    Ok(content) => {
                        eprintln!("[perform_full_analysis] LaTeX downloaded ({} bytes)", content.len());
                        Some(content)
                    }
                    Err(e) => {
                        eprintln!("[perform_full_analysis] Failed to read LaTeX file: {}", e);
                        None
                    }
                }
            }
            Some(Err(e)) => {
                eprintln!("[perform_full_analysis] Failed to download LaTeX: {}", e);
                None
            }
            None => None
        };

        // Full mode requires LaTeX - mark as incomplete if not available
        let content = match latex_content {
            Some(latex) => latex,
            None => {
                eprintln!("[perform_full_analysis] No LaTeX available, marking as incomplete");
                paper.analysis_incomplete = true;
                return Ok(());
            }
        };

        // Perform Full analysis
        let analysis = client.analyze_full(
            &entry.title,
            &entry.summary,
            topics,
            &content,
            language
        ).await?;

        // Update paper with Full analysis results
        paper.ai_summary = Some(analysis.ai_summary);
        paper.key_insights = Some(analysis.key_insights);
        paper.novelty_score = Some(analysis.novelty_score);
        paper.novelty_reason = Some(analysis.novelty_reason);
        paper.effectiveness_score = Some(analysis.effectiveness_score);
        paper.effectiveness_reason = Some(analysis.effectiveness_reason);
        paper.experiment_completeness_score = Some(analysis.experiment_completeness_score);
        paper.experiment_completeness_reason = Some(analysis.experiment_completeness_reason);
        paper.algorithm_flowchart = analysis.algorithm_flowchart;
        paper.time_complexity = analysis.time_complexity;
        paper.space_complexity = analysis.space_complexity;
        paper.code_available = analysis.code_available;
        paper.code_links = if analysis.code_links.is_empty() {
            None
        } else {
            Some(analysis.code_links)
        };
        // Fallback: if code_links exist but LLM incorrectly set code_available=false, correct it
        if paper.code_links.is_some() && !paper.code_available {
            eprintln!("[perform_full_analysis] LLM returned code_links but code_available=false, correcting to true for {}", paper.id);
            paper.code_available = true;
        }
        paper.engineering_notes = Some(analysis.engineering_notes);

        // Update tags (only suggested_tags, not suggested_topics)
        paper.tags = analysis.suggested_tags;

        // Update topics if LLM provided suggestions
        if !analysis.suggested_topics.is_empty() {
            eprintln!("[perform_full_analysis] Updating topics from LLM suggestions: {:?}", analysis.suggested_topics);
            paper.topics = analysis.suggested_topics;
        }

        paper.analysis_mode = Some("full".to_string());
        paper.is_deep_analyzed = true;

        eprintln!("[perform_full_analysis] Full analysis complete for {}", paper.id);
        eprintln!("[perform_full_analysis] Paper state before save:");
        eprintln!("  - topics: {:?}", paper.topics);
        eprintln!("  - tags: {:?}", paper.tags);
        eprintln!("  - ai_summary: {} chars", paper.ai_summary.as_ref().map_or(0, |s| s.len()));
        eprintln!("  - key_insights: {:?}", paper.key_insights.as_ref().map(|v| v.len()));
        eprintln!("  - novelty_score: {:?}", paper.novelty_score);
        eprintln!("  - effectiveness_score: {:?}", paper.effectiveness_score);
        eprintln!("  - experiment_completeness_score: {:?}", paper.experiment_completeness_score);
        eprintln!("  - code_available: {}", paper.code_available);
        eprintln!("  - analysis_mode: {:?}", paper.analysis_mode);
        eprintln!("  - is_deep_analyzed: {}", paper.is_deep_analyzed);

        Ok(())
    }

    /// Update fetch status and emit event
    async fn update_status(
        &self,
        status: &str,
        progress: f32,
        step: &str,
        found: usize,
        analyzed: usize,
        saved: usize,
        filtered: usize,
        cache_hits: usize,
        duplicates: usize,
        event_emitter: &Option<Arc<dyn Fn(FetchStatus) + Send + Sync>>,
    ) {
        let new_status = FetchStatus {
            status: status.to_string(),
            progress,
            current_step: step.to_string(),
            papers_found: found,
            papers_analyzed: analyzed,
            papers_saved: saved,
            papers_filtered: filtered,
            papers_duplicates: duplicates,
            papers_cache_hits: cache_hits,
            errors: vec![],
            queue_size: 0,
            active_tasks: 0,
            completed_tasks: 0,
            failed_tasks: 0,
            async_mode: false,
        };

        // Update internal status
        *self.current_status.lock().await = new_status.clone();

        // Emit event if callback provided
        if let Some(emitter) = event_emitter {
            emitter(new_status);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_fetch_result_default() {
        let result = FetchResult {
            papers_fetched: 0,
            papers_analyzed: 0,
            papers_saved: 0,
            papers_filtered: 0,
            papers_cache_hits: 0,
            papers_duplicates: 0,
            errors: vec![],
            saved_papers: vec![],
        };

        assert_eq!(result.papers_fetched, 0);
        assert_eq!(result.errors.len(), 0);
    }

    #[test]
    fn test_idle_status() {
        let status = idle_status();
        assert_eq!(status.status, "idle");
        assert_eq!(status.progress, 0.0);
    }

    #[test]
    fn test_fetch_error_type_arxiv() {
        let err = FetchError::ArxivError(arxiv::ArxivError::ParseError("test".to_string()));
        assert_eq!(err.error_type(), "arxiv");
    }

    #[test]
    fn test_fetch_error_type_rate_limit() {
        let err = FetchError::LlmRateLimitError;
        assert_eq!(err.error_type(), "llm_rate_limit");
    }

    #[test]
    fn test_fetch_error_type_auth() {
        let err = FetchError::LlmAuthError;
        assert_eq!(err.error_type(), "llm_auth");
    }

    #[test]
    fn test_fetch_error_type_network() {
        let err = FetchError::NetworkError("test error".to_string());
        assert_eq!(err.error_type(), "network");
    }

    #[test]
    fn test_fetch_error_type_database() {
        let err = FetchError::DatabaseError("test error".to_string());
        assert_eq!(err.error_type(), "database");
    }

    #[test]
    fn test_fetch_error_type_cancelled() {
        let err = FetchError::Cancelled;
        assert_eq!(err.error_type(), "cancelled");
    }

    #[test]
    fn test_fetch_error_type_llm() {
        let err = FetchError::LlmError(llm::LlmError::NoApiKey);
        assert_eq!(err.error_type(), "llm");
    }

    #[test]
    fn test_fetch_error_is_retryable_arxiv() {
        let err = FetchError::ArxivError(arxiv::ArxivError::ParseError("test".to_string()));
        assert!(err.is_retryable());
    }

    #[test]
    fn test_fetch_error_is_retryable_rate_limit() {
        let err = FetchError::LlmRateLimitError;
        assert!(err.is_retryable());
    }

    #[test]
    fn test_fetch_error_is_retryable_auth() {
        let err = FetchError::LlmAuthError;
        assert!(!err.is_retryable());
    }

    #[test]
    fn test_fetch_error_is_retryable_network() {
        let err = FetchError::NetworkError("test error".to_string());
        assert!(err.is_retryable());
    }

    #[test]
    fn test_fetch_error_is_retryable_database() {
        let err = FetchError::DatabaseError("test error".to_string());
        assert!(!err.is_retryable());
    }

    #[test]
    fn test_fetch_error_is_retryable_cancelled() {
        let err = FetchError::Cancelled;
        assert!(!err.is_retryable());
    }

    #[test]
    fn test_fetch_error_from_llm_rate_limit() {
        let llm_err = llm::LlmError::ApiError("HTTP 429 rate limit exceeded".to_string());
        let fetch_err: FetchError = llm_err.into();
        assert!(matches!(fetch_err, FetchError::LlmRateLimitError));
    }

    #[test]
    fn test_fetch_error_from_llm_auth_401() {
        let llm_err = llm::LlmError::ApiError("HTTP 401 unauthorized".to_string());
        let fetch_err: FetchError = llm_err.into();
        assert!(matches!(fetch_err, FetchError::LlmAuthError));
    }

    #[test]
    fn test_fetch_error_from_llm_auth_403() {
        let llm_err = llm::LlmError::ApiError("HTTP 403 forbidden".to_string());
        let fetch_err: FetchError = llm_err.into();
        assert!(matches!(fetch_err, FetchError::LlmAuthError));
    }

    #[test]
    fn test_fetch_error_from_llm_network() {
        let llm_err = llm::LlmError::ApiError("connection timeout".to_string());
        let fetch_err: FetchError = llm_err.into();
        // This should be classified as a network error
        assert!(matches!(fetch_err, FetchError::NetworkError(_)));
    }

    #[test]
    fn test_fetch_error_from_llm_api_error() {
        let llm_err = llm::LlmError::ApiError("some other error".to_string());
        let fetch_err: FetchError = llm_err.into();
        assert!(matches!(fetch_err, FetchError::LlmError(_)));
    }

    #[test]
    fn test_fetch_result_with_values() {
        let result = FetchResult {
            papers_fetched: 10,
            papers_analyzed: 8,
            papers_saved: 5,
            papers_filtered: 3,
            papers_cache_hits: 1,
            papers_duplicates: 1,
            errors: vec!["error 1".to_string()],
            saved_papers: vec![],
        };

        assert_eq!(result.papers_fetched, 10);
        assert_eq!(result.papers_analyzed, 8);
        assert_eq!(result.papers_saved, 5);
        assert_eq!(result.papers_filtered, 3);
        assert_eq!(result.errors.len(), 1);
    }
}
