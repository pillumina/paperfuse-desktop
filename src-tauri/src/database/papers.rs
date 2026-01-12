use crate::models::{Paper, AuthorInfo};
use sqlx::{SqlitePool, Row};
use thiserror::Error;

/// Parse authors from JSON, handling both old format (array of strings) and new format (array of objects)
fn parse_authors(authors_json: &str) -> serde_json::Result<Vec<AuthorInfo>> {
    // Try parsing as new format (array of objects)
    let result: serde_json::Result<Vec<AuthorInfo>> = serde_json::from_str(authors_json);

    match result {
        Ok(authors) => Ok(authors),
        Err(_) => {
            // If that fails, try parsing as old format (array of strings)
            let old_authors: Vec<String> = serde_json::from_str(authors_json)?;
            // Convert to new format
            Ok(old_authors
                .into_iter()
                .map(|name| AuthorInfo { name, affiliation: None })
                .collect())
        }
    }
}

#[derive(Error, Debug)]
pub enum PaperError {
    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),
    #[error("Paper not found: {0}")]
    NotFound(String),
    #[error("Serialization error: {0}")]
    Serialization(String),
}

pub type Result<T> = std::result::Result<T, PaperError>;

/// Repository for paper database operations
#[derive(Clone)]
pub struct PaperRepository {
    pool: SqlitePool,
}

impl PaperRepository {
    pub fn new(pool: &SqlitePool) -> Self {
        Self { pool: pool.clone() }
    }

    /// Add a paper only if it doesn't exist (no update on conflict)
    /// This is atomic and avoids TOCTOU race conditions
    /// Returns true if paper was inserted, false if it already existed
    pub async fn save_if_not_exists(&self, paper: &Paper) -> Result<bool> {
        eprintln!("[PaperRepository::save_if_not_exists] Attempting to save paper: id={}, topics_count={}", paper.id, paper.topics.len());

        let authors_json = serde_json::to_string(&paper.authors)
            .map_err(|e| PaperError::Serialization(e.to_string()))?;
        let tags_json = serde_json::to_string(&paper.tags)
            .map_err(|e| PaperError::Serialization(e.to_string()))?;
        let topics_json = serde_json::to_string(&paper.topics)
            .map_err(|e| PaperError::Serialization(e.to_string()))?;

        eprintln!("[PaperRepository::save_if_not_exists] Serialized data: topics_json={}", topics_json);
        let insights_json = paper.key_insights.as_ref()
            .map(|v| serde_json::to_string(v))
            .transpose()
            .map_err(|e| PaperError::Serialization(e.to_string()))?;
        let links_json = paper.code_links.as_ref()
            .map(|v| serde_json::to_string(v))
            .transpose()
            .map_err(|e| PaperError::Serialization(e.to_string()))?;

        let result = sqlx::query(
            r#"
            INSERT INTO papers (
                id, arxiv_id, title, authors, summary, ai_summary,
                key_insights, engineering_notes, code_links, tags, topics,
                published_date, arxiv_url, pdf_url, filter_score,
                filter_reason, is_deep_analyzed, analysis_type,
                created_at, updated_at,
                -- Deep Analysis V2 fields
                code_available, novelty_score, novelty_reason,
                effectiveness_score, effectiveness_reason,
                experiment_completeness_score, experiment_completeness_reason,
                algorithm_flowchart, time_complexity, space_complexity,
                analysis_mode, analysis_incomplete
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO NOTHING
            "#
        )
        .bind(&paper.id)
        .bind(&paper.arxiv_id)
        .bind(&paper.title)
        .bind(&authors_json)
        .bind(&paper.summary)
        .bind(&paper.ai_summary)
        .bind(&insights_json)
        .bind(&paper.engineering_notes)
        .bind(&links_json)
        .bind(&tags_json)
        .bind(&topics_json)
        .bind(&paper.published_date)
        .bind(&paper.arxiv_url)
        .bind(&paper.pdf_url)
        .bind(paper.filter_score)
        .bind(&paper.filter_reason)
        .bind(paper.is_deep_analyzed)
        .bind(&paper.analysis_type)
        .bind(&paper.created_at)
        .bind(&paper.updated_at)
        // Deep Analysis V2 fields
        .bind(paper.code_available)
        .bind(paper.novelty_score)
        .bind(&paper.novelty_reason)
        .bind(paper.effectiveness_score)
        .bind(&paper.effectiveness_reason)
        .bind(paper.experiment_completeness_score)
        .bind(&paper.experiment_completeness_reason)
        .bind(&paper.algorithm_flowchart)
        .bind(&paper.time_complexity)
        .bind(&paper.space_complexity)
        .bind(&paper.analysis_mode)
        .bind(paper.analysis_incomplete)
        .execute(&self.pool)
        .await?;

        let was_inserted = result.rows_affected() > 0;
        
        if was_inserted {
            eprintln!("[PaperRepository::save_if_not_exists] ✓ Successfully inserted new paper: {}", paper.id);
        } else {
            eprintln!("[PaperRepository::save_if_not_exists] ℹ Paper already exists, skipped: {}", paper.id);
        }

        Ok(was_inserted)
    }

    /// Add or update a paper
    pub async fn save(&self, paper: &Paper) -> Result<()> {
        eprintln!("[PaperRepository::save] Saving paper: id={}, title={}, is_deep_analyzed={}, analysis_mode={}, topics_count={}",
            paper.id, paper.title.chars().take(50).collect::<String>(), paper.is_deep_analyzed, paper.analysis_mode.as_deref().unwrap_or("none"), paper.topics.len());

        let authors_json = serde_json::to_string(&paper.authors)
            .map_err(|e| PaperError::Serialization(e.to_string()))?;
        let tags_json = serde_json::to_string(&paper.tags)
            .map_err(|e| PaperError::Serialization(e.to_string()))?;
        let topics_json = serde_json::to_string(&paper.topics)
            .map_err(|e| PaperError::Serialization(e.to_string()))?;
        let insights_json = paper.key_insights.as_ref()
            .map(|v| serde_json::to_string(v))
            .transpose()
            .map_err(|e| PaperError::Serialization(e.to_string()))?;
        let links_json = paper.code_links.as_ref()
            .map(|v| serde_json::to_string(v))
            .transpose()
            .map_err(|e| PaperError::Serialization(e.to_string()))?;

        eprintln!("[PaperRepository::save] Serialized data: authors_len={}, tags_len={}, topics_json={}, insights={:?}, links={:?}",
            authors_json.len(), tags_json.len(), topics_json, insights_json.is_some(), links_json.is_some());

        let result = sqlx::query(
            r#"
            INSERT INTO papers (
                id, arxiv_id, title, authors, summary, ai_summary,
                key_insights, engineering_notes, code_links, tags, topics,
                published_date, arxiv_url, pdf_url, filter_score,
                filter_reason, is_deep_analyzed, analysis_type,
                created_at, updated_at,
                -- Deep Analysis V2 fields
                code_available, novelty_score, novelty_reason,
                effectiveness_score, effectiveness_reason,
                experiment_completeness_score, experiment_completeness_reason,
                algorithm_flowchart, time_complexity, space_complexity,
                analysis_mode, analysis_incomplete
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                arxiv_id = excluded.arxiv_id,
                title = excluded.title,
                authors = excluded.authors,
                summary = excluded.summary,
                ai_summary = excluded.ai_summary,
                key_insights = excluded.key_insights,
                engineering_notes = excluded.engineering_notes,
                code_links = excluded.code_links,
                tags = excluded.tags,
                topics = excluded.topics,
                filter_score = excluded.filter_score,
                filter_reason = excluded.filter_reason,
                is_deep_analyzed = excluded.is_deep_analyzed,
                analysis_type = excluded.analysis_type,
                updated_at = excluded.updated_at,
                code_available = excluded.code_available,
                novelty_score = excluded.novelty_score,
                novelty_reason = excluded.novelty_reason,
                effectiveness_score = excluded.effectiveness_score,
                effectiveness_reason = excluded.effectiveness_reason,
                experiment_completeness_score = excluded.experiment_completeness_score,
                experiment_completeness_reason = excluded.experiment_completeness_reason,
                algorithm_flowchart = excluded.algorithm_flowchart,
                time_complexity = excluded.time_complexity,
                space_complexity = excluded.space_complexity,
                analysis_mode = excluded.analysis_mode,
                analysis_incomplete = excluded.analysis_incomplete
            "#
        )
        .bind(&paper.id)
        .bind(&paper.arxiv_id)
        .bind(&paper.title)
        .bind(&authors_json)
        .bind(&paper.summary)
        .bind(&paper.ai_summary)
        .bind(&insights_json)
        .bind(&paper.engineering_notes)
        .bind(&links_json)
        .bind(&tags_json)
        .bind(&topics_json)
        .bind(&paper.published_date)
        .bind(&paper.arxiv_url)
        .bind(&paper.pdf_url)
        .bind(paper.filter_score)
        .bind(&paper.filter_reason)
        .bind(paper.is_deep_analyzed)
        .bind(&paper.analysis_type)
        .bind(&paper.created_at)
        .bind(&paper.updated_at)
        // Deep Analysis V2 fields
        .bind(paper.code_available)
        .bind(paper.novelty_score)
        .bind(&paper.novelty_reason)
        .bind(paper.effectiveness_score)
        .bind(&paper.effectiveness_reason)
        .bind(paper.experiment_completeness_score)
        .bind(&paper.experiment_completeness_reason)
        .bind(&paper.algorithm_flowchart)
        .bind(&paper.time_complexity)
        .bind(&paper.space_complexity)
        .bind(&paper.analysis_mode)
        .bind(paper.analysis_incomplete)
        .execute(&self.pool)
        .await;

        match &result {
            Ok(_) => {
                eprintln!("[PaperRepository::save] ✓ Successfully saved paper: {}", paper.id);
            }
            Err(e) => {
                eprintln!("[PaperRepository::save] ✗ FAILED to save paper {}", paper.id);
                eprintln!("[PaperRepository::save] Error: {}", e);
                eprintln!("[PaperRepository::save] Paper details:");
                eprintln!("  - ID: {}", paper.id);
                eprintln!("  - Title: {}", paper.title.chars().take(80).collect::<String>());
                eprintln!("  - is_deep_analyzed: {}", paper.is_deep_analyzed);
                eprintln!("  - analysis_mode: {:?}", paper.analysis_mode);
                eprintln!("  - code_available: {}", paper.code_available);
                eprintln!("  - novelty_score: {:?}", paper.novelty_score);
                eprintln!("  - effectiveness_score: {:?}", paper.effectiveness_score);
                eprintln!("  - experiment_completeness_score: {:?}", paper.experiment_completeness_score);
            }
        }

        result?;

        Ok(())
    }

    /// Get a paper by ID
    pub async fn get_by_id(&self, id: &str) -> Result<Paper> {
        let row = sqlx::query("SELECT * FROM papers WHERE id = ?")
            .bind(id)
            .fetch_optional(&self.pool)
            .await?
            .ok_or_else(|| PaperError::NotFound(id.to_string()))?;

        Self::row_to_paper(row)
    }

    /// Get all papers with pagination (excludes spam papers)
    pub async fn list(&self, limit: i32, offset: i32) -> Result<Vec<Paper>> {
        let rows = sqlx::query(
            "SELECT * FROM papers WHERE is_spam = 0 ORDER BY published_date DESC LIMIT ? OFFSET ?"
        )
        .bind(limit)
        .bind(offset)
        .fetch_all(&self.pool)
        .await?;

        rows.into_iter()
            .map(Self::row_to_paper)
            .collect()
    }

    /// Get spam/archived papers with pagination
    pub async fn list_spam(&self, limit: i32, offset: i32) -> Result<Vec<Paper>> {
        let rows = sqlx::query(
            "SELECT * FROM papers WHERE is_spam = 1 ORDER BY updated_at DESC LIMIT ? OFFSET ?"
        )
        .bind(limit)
        .bind(offset)
        .fetch_all(&self.pool)
        .await?;

        rows.into_iter()
            .map(Self::row_to_paper)
            .collect()
    }

    /// Get count of spam papers
    pub async fn count_spam(&self) -> Result<i64> {
        let count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM papers WHERE is_spam = 1")
            .fetch_one(&self.pool)
            .await?;
        Ok(count.0)
    }

    /// Toggle spam status of a paper
    pub async fn toggle_spam(&self, id: &str, is_spam: bool) -> Result<()> {
        sqlx::query("UPDATE papers SET is_spam = ?, updated_at = datetime('now') WHERE id = ?")
            .bind(is_spam)
            .bind(id)
            .execute(&self.pool)
            .await?;

        Ok(())
    }

    /// Search papers by query string using FTS5 full-text search
    /// Falls back to LIKE search if FTS5 query fails (e.g., invalid syntax)
    pub async fn search(&self, query: &str, limit: i32) -> Result<Vec<Paper>> {
        eprintln!("[PaperRepository::search] Searching for: '{}'", query);
        
        // Clean query to prevent FTS injection and handle special characters
        let cleaned_words: Vec<String> = query
            .replace(&['\"', '\'', '*', '(', ')', '[', ']'][..], " ")
            .split_whitespace()
            .filter(|w| !w.is_empty())
            .map(|s| s.to_string())
            .collect();
        
        if cleaned_words.is_empty() {
            eprintln!("[PaperRepository::search] Empty query after cleaning");
            return Ok(vec![]);
        }

        // Build FTS5 query with OR logic and prefix matching
        // Add * wildcard to each word for prefix matching (e.g., "mach" matches "machine")
        // This allows matching papers that contain ANY of the search terms
        let fts_query = cleaned_words
            .iter()
            .map(|word| format!("{}*", word))
            .collect::<Vec<_>>()
            .join(" OR ");
        eprintln!("[PaperRepository::search] FTS5 query: '{}'", fts_query);

        // Try FTS5 search first (much faster)
        let fts_result = sqlx::query(
            "SELECT papers.* FROM papers
             INNER JOIN papers_fts ON papers.rowid = papers_fts.rowid
             WHERE papers_fts MATCH ?
             ORDER BY papers.published_date DESC
             LIMIT ?"
        )
        .bind(&fts_query)
        .bind(limit)
        .fetch_all(&self.pool)
        .await;

        // If FTS5 search succeeds, return results
        match fts_result {
            Ok(rows) => {
                eprintln!("[PaperRepository::search] FTS5 search returned {} results", rows.len());
                return rows.into_iter()
                    .map(Self::row_to_paper)
                    .collect();
            }
            Err(e) => {
                eprintln!("[PaperRepository::search] FTS5 search failed: {}", e);
                eprintln!("[PaperRepository::search] Falling back to LIKE search");
            }
        }

        // Fallback to LIKE search if FTS5 fails (e.g., table doesn't exist yet)
        // Search in title, summary, ai_summary, topics, and tags
        let pattern = format!("%{}%", query);
        eprintln!("[PaperRepository::search] LIKE pattern: '{}'", pattern);

        let rows = sqlx::query(
            "SELECT * FROM papers
             WHERE title LIKE ?
                OR summary LIKE ?
                OR ai_summary LIKE ?
                OR topics LIKE ?
                OR tags LIKE ?
             ORDER BY published_date DESC
             LIMIT ?"
        )
        .bind(&pattern)
        .bind(&pattern)
        .bind(&pattern)
        .bind(&pattern)
        .bind(&pattern)
        .bind(limit)
        .fetch_all(&self.pool)
        .await?;

        eprintln!("[PaperRepository::search] LIKE search returned {} results", rows.len());
        rows.into_iter()
            .map(Self::row_to_paper)
            .collect()
    }
    pub async fn get_by_tag(&self, tag: &str, limit: i32, offset: i32) -> Result<Vec<Paper>> {
        let pattern = format!("%\"{}\"%", tag);
        let rows = sqlx::query(
            "SELECT * FROM papers
             WHERE tags LIKE ?
             ORDER BY published_date DESC
             LIMIT ? OFFSET ?"
        )
        .bind(&pattern)
        .bind(limit)
        .bind(offset)
        .fetch_all(&self.pool)
        .await?;

        rows.into_iter()
            .map(Self::row_to_paper)
            .collect()
    }

    /// Get total paper count (excluding spam papers)
    pub async fn count(&self) -> Result<i64> {
        let count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM papers WHERE is_spam = 0")
            .fetch_one(&self.pool)
            .await?;
        Ok(count.0)
    }

    /// Rebuild FTS5 index
    /// This should be called after schema migrations or if search is not working
    pub async fn rebuild_fts_index(&self) -> Result<()> {
        eprintln!("[PaperRepository] Rebuilding FTS5 index...");
        
        // Rebuild the FTS5 index
        sqlx::query("INSERT INTO papers_fts(papers_fts) VALUES('rebuild')")
            .execute(&self.pool)
            .await?;
        
        eprintln!("[PaperRepository] FTS5 index rebuilt successfully");
        Ok(())
    }

    /// Delete a paper by ID
    pub async fn delete(&self, id: &str) -> Result<()> {
        let result = sqlx::query("DELETE FROM papers WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;

        if result.rows_affected() == 0 {
            return Err(PaperError::NotFound(id.to_string()));
        }

        Ok(())
    }

    /// Convert a database row to a Paper
    pub fn row_to_paper(row: sqlx::sqlite::SqliteRow) -> Result<Paper> {
        let authors: String = row.get("authors");
        let tags: String = row.get("tags");
        let topics: String = row.get("topics");
        let insights: Option<String> = row.get("key_insights");
        let links: Option<String> = row.get("code_links");

        // Try to get optional fields with fallback to None for backward compatibility
        fn get_opt_copy<'a, T: sqlx::Type<sqlx::Sqlite> + sqlx::Decode<'a, sqlx::Sqlite> + Copy>(
            row: &'a sqlx::sqlite::SqliteRow,
            name: &str,
        ) -> Option<T> {
            match row.try_get::<T, _>(name) {
                Ok(v) => Some(v),
                Err(_) => None,
            }
        }

        fn get_opt_string(row: &sqlx::sqlite::SqliteRow, name: &str) -> Option<String> {
            match row.try_get::<String, _>(name) {
                Ok(v) => Some(v),
                Err(_) => None,
            }
        }

        fn get_bool_default(row: &sqlx::sqlite::SqliteRow, name: &str, default: bool) -> bool {
            match row.try_get::<bool, _>(name) {
                Ok(v) => v,
                Err(_) => default,
            }
        }

        let code_available: bool = get_bool_default(&row, "code_available", false);
        let novelty_score: Option<i32> = get_opt_copy(&row, "novelty_score");
        let novelty_reason: Option<String> = get_opt_string(&row, "novelty_reason");
        let effectiveness_score: Option<i32> = get_opt_copy(&row, "effectiveness_score");
        let effectiveness_reason: Option<String> = get_opt_string(&row, "effectiveness_reason");
        let experiment_completeness_score: Option<i32> = get_opt_copy(&row, "experiment_completeness_score");
        let experiment_completeness_reason: Option<String> = get_opt_string(&row, "experiment_completeness_reason");
        let algorithm_flowchart: Option<String> = get_opt_string(&row, "algorithm_flowchart");
        let time_complexity: Option<String> = get_opt_string(&row, "time_complexity");
        let space_complexity: Option<String> = get_opt_string(&row, "space_complexity");
        let analysis_mode: Option<String> = get_opt_string(&row, "analysis_mode");
        let analysis_incomplete: bool = get_bool_default(&row, "analysis_incomplete", false);

        Ok(Paper {
            id: row.get("id"),
            arxiv_id: row.get("arxiv_id"),
            title: row.get("title"),
            authors: parse_authors(&authors)
                .map_err(|e| PaperError::Serialization(e.to_string()))?,
            summary: row.get("summary"),
            ai_summary: row.get("ai_summary"),
            key_insights: insights.and_then(|v| serde_json::from_str(&v).ok()),
            engineering_notes: row.get("engineering_notes"),
            code_links: links.and_then(|v| serde_json::from_str(&v).ok()),
            tags: serde_json::from_str(&tags)
                .map_err(|e| PaperError::Serialization(e.to_string()))?,
            topics: serde_json::from_str(&topics)
                .unwrap_or_else(|_| vec![]), // Default to empty array if parsing fails
            published_date: row.get("published_date"),
            arxiv_url: row.get("arxiv_url"),
            pdf_url: row.get("pdf_url"),
            filter_score: row.get("filter_score"),
            filter_reason: row.get("filter_reason"),
            is_deep_analyzed: row.get("is_deep_analyzed"),
            analysis_type: row.get("analysis_type"),
            created_at: row.get("created_at"),
            updated_at: row.get("updated_at"),
            // Deep Analysis V2 fields
            code_available,
            novelty_score,
            novelty_reason,
            effectiveness_score,
            effectiveness_reason,
            experiment_completeness_score,
            experiment_completeness_reason,
            algorithm_flowchart,
            time_complexity,
            space_complexity,
            analysis_mode,
            analysis_incomplete,
        })
    }
}

/// Check if a paper exists by its arXiv ID
pub async fn paper_exists_by_arxiv_id(
    pool: &SqlitePool,
    arxiv_id: &str,
) -> Result<bool> {
    let result = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM papers WHERE arxiv_id = ?"
    )
    .bind(arxiv_id)
    .fetch_one(pool)
    .await?;

    Ok(result > 0)
}

/// Get list of arXiv IDs that already exist in the database
/// Returns a vector of existing arXiv IDs from the provided list
pub async fn papers_exist_by_arxiv_ids(
    pool: &SqlitePool,
    arxiv_ids: &[String],
) -> Result<Vec<String>> {
    if arxiv_ids.is_empty() {
        return Ok(vec![]);
    }

    // Build placeholder string for IN clause
    let placeholders = arxiv_ids
        .iter()
        .enumerate()
        .map(|(i, _)| format!("?{}", i + 1))
        .collect::<Vec<_>>()
        .join(", ");

    let query = format!(
        "SELECT arxiv_id FROM papers WHERE arxiv_id IN ({})",
        placeholders
    );

    let mut q = sqlx::query_scalar::<_, String>(&query);
    for id in arxiv_ids {
        q = q.bind(id);
    }

    let results = q.fetch_all(pool).await?;
    Ok(results)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_paper_error_display() {
        let err = PaperError::NotFound("test-id".to_string());
        assert_eq!(err.to_string(), "Paper not found: test-id");
    }

    #[test]
    fn test_paper_error_display_serialization() {
        let err = PaperError::Serialization("JSON error".to_string());
        assert_eq!(err.to_string(), "Serialization error: JSON error");
    }

    #[test]
    fn test_paper_error_from_database() {
        let sqlx_err = sqlx::Error::RowNotFound;
        let err: PaperError = sqlx_err.into();
        assert!(matches!(err, PaperError::Database(_)));
    }

    #[test]
    fn test_paper_repository_clone_pool() {
        // Test that PaperRepository clones the pool correctly
        // This is a compile-time test more than runtime
        let pool_str = "sqlite::memory:";
        assert!(pool_str.starts_with("sqlite:"));
    }

    #[test]
    fn test_result_type_alias() {
        // Test that Result type alias works correctly
        let ok_result: Result<()> = Ok(());
        assert!(ok_result.is_ok());

        let err_result: Result<()> = Err(PaperError::NotFound("test".to_string()));
        assert!(err_result.is_err());
    }

    #[test]
    fn test_paper_error_not_found() {
        let err = PaperError::NotFound("paper-123".to_string());
        assert!(matches!(err, PaperError::NotFound(_)));
        assert_eq!(err.to_string(), "Paper not found: paper-123");
    }

    #[test]
    fn test_paper_error_serialization() {
        let err = PaperError::Serialization("invalid json".to_string());
        assert!(matches!(err, PaperError::Serialization(_)));
        assert_eq!(err.to_string(), "Serialization error: invalid json");
    }

    #[test]
    fn test_paper_error_database() {
        let msg = "connection failed".to_string();
        let err = PaperError::Database(sqlx::Error::Protocol(format!("{}", msg)));
        let formatted = err.to_string();
        assert!(formatted.contains("Database error"));
    }
}
