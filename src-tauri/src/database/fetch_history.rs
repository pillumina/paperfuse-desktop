#![allow(dead_code)]

use sqlx::{SqlitePool, Row};
use thiserror::Error;
use serde::{Deserialize, Serialize};

#[derive(Error, Debug)]
pub enum FetchHistoryError {
    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),
    #[error("Serialization error: {0}")]
    Serialization(String),
}

pub type Result<T> = std::result::Result<T, FetchHistoryError>;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FetchHistoryEntry {
    pub id: String,
    pub started_at: String,
    pub completed_at: Option<String>,
    pub status: String,
    pub papers_fetched: i32,
    pub papers_analyzed: i32,
    pub papers_saved: i32,
    pub papers_filtered: i32,
    pub llm_provider: Option<String>,
    pub max_papers: Option<i32>,
    pub error_message: Option<String>,
    pub papers: Option<Vec<PaperSummary>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaperSummary {
    pub id: String,
    pub title: String,
    pub arxiv_id: String,
}

#[derive(Clone)]
pub struct FetchHistoryRepository {
    pool: SqlitePool,
}

impl FetchHistoryRepository {
    pub fn new(pool: &SqlitePool) -> Self {
        Self { pool: pool.clone() }
    }

    /// Create a new fetch history entry
    pub async fn create(&self, entry: &FetchHistoryEntry) -> Result<()> {
        let papers_json = entry.papers.as_ref()
            .map(|p| serde_json::to_string(p))
            .transpose()
            .map_err(|e| FetchHistoryError::Serialization(e.to_string()))?;

        sqlx::query(
            r#"
            INSERT INTO fetch_history (
                id, started_at, completed_at, status,
                papers_fetched, papers_analyzed, papers_saved, papers_filtered,
                llm_provider, max_papers, error_message, papers
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#
        )
        .bind(&entry.id)
        .bind(&entry.started_at)
        .bind(&entry.completed_at)
        .bind(&entry.status)
        .bind(entry.papers_fetched)
        .bind(entry.papers_analyzed)
        .bind(entry.papers_saved)
        .bind(entry.papers_filtered)
        .bind(&entry.llm_provider)
        .bind(entry.max_papers)
        .bind(&entry.error_message)
        .bind(papers_json)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    /// Update fetch history entry (on completion/failure)
    pub async fn update(
        &self,
        id: &str,
        completed_at: &str,
        status: &str,
        papers_fetched: i32,
        papers_analyzed: i32,
        papers_saved: i32,
        papers_filtered: i32,
        error_message: Option<&str>,
        papers: Option<Vec<PaperSummary>>,
    ) -> Result<()> {
        let papers_json = papers.as_ref()
            .map(|p| serde_json::to_string(p))
            .transpose()
            .map_err(|e| FetchHistoryError::Serialization(e.to_string()))?;

        sqlx::query(
            r#"
            UPDATE fetch_history
            SET completed_at = ?, status = ?,
                papers_fetched = ?, papers_analyzed = ?, papers_saved = ?, papers_filtered = ?,
                error_message = ?, papers = ?
            WHERE id = ?
            "#
        )
        .bind(completed_at)
        .bind(status)
        .bind(papers_fetched)
        .bind(papers_analyzed)
        .bind(papers_saved)
        .bind(papers_filtered)
        .bind(error_message)
        .bind(papers_json)
        .bind(id)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    /// Get all fetch history entries, ordered by started_at DESC
    pub async fn get_all(&self, limit: Option<i32>) -> Result<Vec<FetchHistoryEntry>> {
        let limit = limit.unwrap_or(50);

        let rows = sqlx::query(
            r#"
            SELECT id, started_at, completed_at, status,
                   papers_fetched, papers_analyzed, papers_saved, papers_filtered,
                   llm_provider, max_papers, error_message, papers
            FROM fetch_history
            ORDER BY started_at DESC
            LIMIT ?
            "#
        )
        .bind(limit)
        .fetch_all(&self.pool)
        .await?;

        rows.iter().map(|row| {
            let papers_json: Option<String> = row.try_get("papers")?;
            let papers = match papers_json {
                Some(json) => {
                    if json.trim().is_empty() {
                        None
                    } else {
                        Some(serde_json::from_str(&json)
                            .map_err(|e| FetchHistoryError::Serialization(e.to_string()))?)
                    }
                },
                None => None,
            };

            Ok(FetchHistoryEntry {
                id: row.try_get("id")?,
                started_at: row.try_get("started_at")?,
                completed_at: row.try_get("completed_at")?,
                status: row.try_get("status")?,
                papers_fetched: row.try_get("papers_fetched")?,
                papers_analyzed: row.try_get("papers_analyzed")?,
                papers_saved: row.try_get("papers_saved")?,
                papers_filtered: row.try_get("papers_filtered")?,
                llm_provider: row.try_get("llm_provider")?,
                max_papers: row.try_get("max_papers")?,
                error_message: row.try_get("error_message")?,
                papers,
            })
        }).collect()
    }

    /// Get recent fetch history (last N entries)
    pub async fn get_recent(&self, limit: i32) -> Result<Vec<FetchHistoryEntry>> {
        self.get_all(Some(limit)).await
    }

    /// Delete a fetch history entry by ID
    pub async fn delete(&self, id: &str) -> Result<()> {
        sqlx::query("DELETE FROM fetch_history WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;

        Ok(())
    }
}
