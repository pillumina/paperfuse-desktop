//! LLM Response Cache
//!
//! Caches LLM responses to disk to avoid re-calling the API on retry.
//! When LLM analysis succeeds but parsing/saving fails, the cached response
//! can be reused on retry without making another API call.

use crate::llm::LlmError;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

/// Cached LLM response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CachedLlmResponse {
    /// Paper ID
    pub paper_id: String,
    /// Analysis mode (standard/full)
    pub analysis_mode: String,
    /// Raw LLM response
    pub raw_response: String,
    /// Prompt hash (for validation - ensures cache matches the prompt)
    pub prompt_hash: String,
    /// Timestamp when cached
    pub cached_at: i64,
    /// LLM provider used
    pub provider: String,
    /// Model used
    pub model: Option<String>,
}

/// LLM response cache manager
pub struct LlmCache {
    cache_dir: PathBuf,
}

impl LlmCache {
    /// Create a new cache manager
    pub fn new() -> Result<Self, LlmError> {
        // Get cache directory: ~/.paperfuse-desktop/cache/llm
        let mut cache_dir = dirs::home_dir()
            .ok_or_else(|| LlmError::ParseError("Cannot find home directory".to_string()))?;

        cache_dir.push(".paperfuse-desktop");
        cache_dir.push("cache");
        cache_dir.push("llm");

        // Create directory if it doesn't exist
        fs::create_dir_all(&cache_dir)
            .map_err(|e| LlmError::ParseError(format!("Failed to create cache directory: {}", e)))?;

        Ok(Self { cache_dir })
    }

    /// Get cache file path for a paper
    fn cache_file_path(&self, paper_id: &str, mode: &str) -> PathBuf {
        self.cache_dir.join(format!("{}_{}.json", paper_id, mode))
    }

    /// Save LLM response to cache
    pub fn save(
        &self,
        paper_id: &str,
        mode: &str,
        raw_response: &str,
        prompt: &str,
        provider: &str,
        model: Option<&str>,
    ) -> Result<(), LlmError> {
        use std::time::{SystemTime, UNIX_EPOCH};

        let cached = CachedLlmResponse {
            paper_id: paper_id.to_string(),
            analysis_mode: mode.to_string(),
            raw_response: raw_response.to_string(),
            prompt_hash: Self::hash_prompt(prompt),
            cached_at: SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .map(|d| d.as_secs() as i64)
                .unwrap_or(0),
            provider: provider.to_string(),
            model: model.map(|s| s.to_string()),
        };

        let cache_path = self.cache_file_path(paper_id, mode);
        let json = serde_json::to_string_pretty(&cached)
            .map_err(|e| LlmError::ParseError(format!("Failed to serialize cache: {}", e)))?;

        fs::write(&cache_path, json)
            .map_err(|e| LlmError::ParseError(format!("Failed to write cache file: {}", e)))?;

        eprintln!("[LlmCache] Saved cached response to: {:?}", cache_path);
        Ok(())
    }

    /// Load LLM response from cache
    pub fn load(
        &self,
        paper_id: &str,
        mode: &str,
        prompt: &str,
    ) -> Result<String, LlmError> {
        let cache_path = self.cache_file_path(paper_id, mode);

        if !cache_path.exists() {
            return Err(LlmError::ParseError("Cache file not found".to_string()));
        }

        let json = fs::read_to_string(&cache_path)
            .map_err(|e| LlmError::ParseError(format!("Failed to read cache file: {}", e)))?;

        let cached: CachedLlmResponse = serde_json::from_str(&json)
            .map_err(|e| LlmError::ParseError(format!("Failed to parse cache file: {}", e)))?;

        // Validate prompt hash to ensure cache is still valid
        let current_hash = Self::hash_prompt(prompt);
        if cached.prompt_hash != current_hash {
            eprintln!("[LlmCache] Prompt hash mismatch, cache invalid");
            return Err(LlmError::ParseError("Cache invalid (prompt changed)".to_string()));
        }

        eprintln!("[LlmCache] Loaded cached response from: {:?} (cached at: {})",
            cache_path, cached.cached_at);
        Ok(cached.raw_response)
    }

    /// Delete cache file for a paper
    pub fn delete(&self, paper_id: &str, mode: &str) -> Result<(), LlmError> {
        let cache_path = self.cache_file_path(paper_id, mode);

        if cache_path.exists() {
            fs::remove_file(&cache_path)
                .map_err(|e| LlmError::ParseError(format!("Failed to delete cache file: {}", e)))?;
            eprintln!("[LlmCache] Deleted cached response: {:?}", cache_path);
        }

        Ok(())
    }

    /// Check if cache exists for a paper
    pub fn exists(&self, paper_id: &str, mode: &str) -> bool {
        self.cache_file_path(paper_id, mode).exists()
    }

    /// Clear all cache files (for cleanup)
    pub fn clear_all(&self) -> Result<(), LlmError> {
        let entries = fs::read_dir(&self.cache_dir)
            .map_err(|e| LlmError::ParseError(format!("Failed to read cache directory: {}", e)))?;

        let mut count = 0;
        for entry in entries {
            if let Ok(entry) = entry {
                let path = entry.path();
                if path.extension().and_then(|s| s.to_str()) == Some("json") {
                    if fs::remove_file(&path).is_ok() {
                        count += 1;
                    }
                }
            }
        }

        eprintln!("[LlmCache] Cleared {} cache files", count);
        Ok(())
    }

    /// Simple hash of prompt for validation
    fn hash_prompt(prompt: &str) -> String {
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};

        let mut hasher = DefaultHasher::new();
        prompt.hash(&mut hasher);
        format!("{:x}", hasher.finish())
    }

    /// Get cache age in seconds
    pub fn cache_age(&self, paper_id: &str, mode: &str) -> Option<i64> {
        let cache_path = self.cache_file_path(paper_id, mode);

        if !cache_path.exists() {
            return None;
        }

        // Read file metadata to get modification time
        fs::metadata(&cache_path).ok()?.modified().ok()
            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|d| {
                let now = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_secs() as i64;
                now - d.as_secs() as i64
            })
    }
}

impl Default for LlmCache {
    fn default() -> Self {
        Self::new().expect("Failed to create LLM cache")
    }
}
