//! Classification cache for avoiding redundant LLM API calls
//!
//! Stores classification results keyed by (arxiv_id, topics_hash).
//! When topics configuration changes, old cache entries become invalid.

use crate::llm::ClassificationResult;
use crate::models::{TopicConfig, compute_topics_hash};
use sqlx::{SqlitePool, Row};
use thiserror::Error;
use chrono::Utc;

#[derive(Error, Debug)]
pub enum CacheError {
    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),
    #[error("Serialization error: {0}")]
    Serialization(String),
}

pub type Result<T> = std::result::Result<T, CacheError>;

/// Repository for classification cache operations
pub struct ClassificationCacheRepository {
    pool: SqlitePool,
}

impl ClassificationCacheRepository {
    pub fn new(pool: &SqlitePool) -> Self {
        Self { pool: pool.clone() }
    }

    /// Get cached classification for a paper with specific topics configuration
    pub async fn get(
        &self,
        arxiv_id: &str,
        topics: &[TopicConfig],
    ) -> Result<Option<ClassificationResult>> {
        let topics_hash = compute_topics_hash(topics);

        let row = sqlx::query(
            "SELECT classification_result FROM classification_cache
             WHERE arxiv_id = ? AND topics_hash = ?"
        )
        .bind(arxiv_id)
        .bind(&topics_hash)
        .fetch_optional(&self.pool)
        .await?;

        if let Some(row) = row {
            let result_json: String = row.get("classification_result");
            let result: ClassificationResult = serde_json::from_str(&result_json)
                .map_err(|e| CacheError::Serialization(e.to_string()))?;
            Ok(Some(result))
        } else {
            Ok(None)
        }
    }

    /// Save classification result to cache
    pub async fn save(
        &self,
        arxiv_id: &str,
        topics: &[TopicConfig],
        result: &ClassificationResult,
    ) -> Result<()> {
        let topics_hash = compute_topics_hash(topics);
        let result_json = serde_json::to_string(result)
            .map_err(|e| CacheError::Serialization(e.to_string()))?;
        let now = Utc::now().format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string();

        sqlx::query(
            "INSERT INTO classification_cache (arxiv_id, topics_hash, classification_result, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?)
             ON CONFLICT(arxiv_id, topics_hash) DO UPDATE SET
                classification_result = excluded.classification_result,
                updated_at = excluded.updated_at"
        )
        .bind(arxiv_id)
        .bind(&topics_hash)
        .bind(&result_json)
        .bind(&now)
        .bind(&now)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    /// Clear all cache for a specific topics hash (when topics change)
    pub async fn clear_for_topics(&self, topics: &[TopicConfig]) -> Result<u64> {
        let topics_hash = compute_topics_hash(topics);

        let result = sqlx::query("DELETE FROM classification_cache WHERE topics_hash = ?")
            .bind(&topics_hash)
            .execute(&self.pool)
            .await?;

        Ok(result.rows_affected())
    }

    /// Clear all cache (when topics significantly change)
    pub async fn clear_all(&self) -> Result<u64> {
        let result = sqlx::query("DELETE FROM classification_cache")
            .execute(&self.pool)
            .await?;

        Ok(result.rows_affected())
    }

    /// Get cache statistics
    pub async fn get_stats(&self) -> Result<CacheStats> {
        let row = sqlx::query(
            "SELECT
                COUNT(*) as total_entries,
                COUNT(DISTINCT arxiv_id) as unique_papers,
                COUNT(DISTINCT topics_hash) as unique_configs,
                MAX(created_at) as oldest_entry,
                MAX(updated_at) as newest_entry
            FROM classification_cache"
        )
        .fetch_one(&self.pool)
        .await?;

        Ok(CacheStats {
            total_entries: row.get("total_entries"),
            unique_papers: row.get("unique_papers"),
            unique_configs: row.get("unique_configs"),
            oldest_entry: row.get("oldest_entry"),
            newest_entry: row.get("newest_entry"),
        })
    }
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct CacheStats {
    pub total_entries: i64,
    pub unique_papers: i64,
    pub unique_configs: i64,
    pub oldest_entry: Option<String>,
    pub newest_entry: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    // Note: These tests would require a database connection to run
    // They're included as documentation of the intended behavior
}
