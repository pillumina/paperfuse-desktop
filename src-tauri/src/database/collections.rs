#![allow(dead_code)]

use crate::models::collection::{Collection, CollectionWithPaperCount, CreateCollection, UpdateCollection};
use sqlx::{SqlitePool, Row};
use chrono::Utc;

pub struct CollectionRepository {
    pool: sqlx::SqlitePool,
}

impl CollectionRepository {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    /// Create a new collection
    pub async fn create(&self, collection: CreateCollection) -> Result<Collection, String> {
        let id = uuid::Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();

        let result = sqlx::query(
            "INSERT INTO collections (id, name, description, color, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?)"
        )
        .bind(&id)
        .bind(&collection.name)
        .bind(&collection.description)
        .bind(&collection.color)
        .bind(&now)
        .bind(&now)
        .execute(&self.pool)
        .await
        .map_err(|e| e.to_string())?;

        if result.rows_affected() == 0 {
            return Err("Failed to create collection".to_string());
        }

        self.get_by_id(&id).await
    }

    /// Get all collections with paper counts
    pub async fn get_all(&self) -> Result<Vec<CollectionWithPaperCount>, String> {
        let rows = sqlx::query(
            "SELECT c.*,
                    (SELECT COUNT(*) FROM collection_papers WHERE collection_id = c.id) as paper_count
             FROM collections c
             ORDER BY c.updated_at DESC"
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| e.to_string())?;

        rows.into_iter()
            .map(|row| -> Result<CollectionWithPaperCount, String> {
                Ok(CollectionWithPaperCount {
                    id: row.try_get("id").map_err(|e| e.to_string())?,
                    name: row.try_get("name").map_err(|e| e.to_string())?,
                    description: row.try_get("description").map_err(|e| e.to_string())?,
                    color: row.try_get("color").map_err(|e| e.to_string())?,
                    created_at: row.try_get("created_at").map_err(|e| e.to_string())?,
                    updated_at: row.try_get("updated_at").map_err(|e| e.to_string())?,
                    paper_count: row.try_get("paper_count").map_err(|e| e.to_string())?,
                })
            })
            .collect()
    }

    /// Get collection by ID
    pub async fn get_by_id(&self, id: &str) -> Result<Collection, String> {
        let collection = sqlx::query_as::<_, Collection>(
            "SELECT * FROM collections WHERE id = ?"
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| format!("Collection not found: {}", id))?;

        Ok(collection)
    }

    /// Update collection
    pub async fn update(&self, id: &str, updates: UpdateCollection) -> Result<Collection, String> {
        let now = Utc::now().to_rfc3339();

        // Build dynamic update query
        let mut query = String::from("UPDATE collections SET updated_at = ?");

        if updates.name.is_some() {
            query.push_str(", name = ?");
        }
        if updates.description.is_some() {
            query.push_str(", description = ?");
        }
        if updates.color.is_some() {
            query.push_str(", color = ?");
        }

        query.push_str(" WHERE id = ?");

        let mut q = sqlx::query(&query).bind(&now);

        if let Some(name) = &updates.name {
            q = q.bind(name);
        }
        if let Some(description) = &updates.description {
            q = q.bind(description);
        }
        if let Some(color) = &updates.color {
            q = q.bind(color);
        }

        q = q.bind(id);

        let result = q.execute(&self.pool).await.map_err(|e| e.to_string())?;

        if result.rows_affected() == 0 {
            return Err(format!("Collection not found: {}", id));
        }

        self.get_by_id(id).await
    }

    /// Delete collection
    pub async fn delete(&self, id: &str) -> Result<(), String> {
        let result = sqlx::query("DELETE FROM collections WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await
            .map_err(|e| e.to_string())?;

        if result.rows_affected() == 0 {
            return Err(format!("Collection not found: {}", id));
        }

        Ok(())
    }

    /// Add paper to collection
    pub async fn add_paper(&self, collection_id: &str, paper_id: &str) -> Result<(), String> {
        let now = Utc::now().to_rfc3339();

        sqlx::query(
            "INSERT OR IGNORE INTO collection_papers (collection_id, paper_id, added_at)
             VALUES (?, ?, ?)"
        )
        .bind(collection_id)
        .bind(paper_id)
        .bind(&now)
        .execute(&self.pool)
        .await
        .map_err(|e| e.to_string())?;

        Ok(())
    }

    /// Remove paper from collection
    pub async fn remove_paper(&self, collection_id: &str, paper_id: &str) -> Result<(), String> {
        let result = sqlx::query(
            "DELETE FROM collection_papers
             WHERE collection_id = ? AND paper_id = ?"
        )
        .bind(collection_id)
        .bind(paper_id)
        .execute(&self.pool)
        .await
        .map_err(|e| e.to_string())?;

        if result.rows_affected() == 0 {
            return Err("Paper not found in collection".to_string());
        }

        Ok(())
    }

    /// Get papers in a collection
    pub async fn get_papers(&self, collection_id: &str, limit: i32) -> Result<Vec<crate::models::paper::Paper>, String> {
        use crate::database::papers::PaperRepository;

        let rows = sqlx::query(
            "SELECT p.*
             FROM papers p
             INNER JOIN collection_papers cp ON p.id = cp.paper_id
             WHERE cp.collection_id = ?
             ORDER BY cp.added_at DESC
             LIMIT ?"
        )
        .bind(collection_id)
        .bind(limit)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| e.to_string())?;

        // Manually map rows to Paper objects
        let mut papers = Vec::new();
        for row in rows {
            match PaperRepository::row_to_paper(row) {
                Ok(paper) => papers.push(paper),
                Err(e) => return Err(format!("Failed to map paper: {}", e)),
            }
        }

        Ok(papers)
    }

    /// Check if paper is in collection
    pub async fn has_paper(&self, collection_id: &str, paper_id: &str) -> Result<bool, String> {
        let result = sqlx::query(
            "SELECT COUNT(*) as count FROM collection_papers
             WHERE collection_id = ? AND paper_id = ?"
        )
        .bind(collection_id)
        .bind(paper_id)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| e.to_string())?;

        let count: i64 = result.try_get("count").unwrap_or(0);
        Ok(count > 0)
    }

    /// Get collections for a paper
    pub async fn get_for_paper(&self, paper_id: &str) -> Result<Vec<Collection>, String> {
        let collections = sqlx::query_as::<_, Collection>(
            "SELECT c.*
             FROM collections c
             INNER JOIN collection_papers cp ON c.id = cp.collection_id
             WHERE cp.paper_id = ?
             ORDER BY c.name"
        )
        .bind(paper_id)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| e.to_string())?;

        Ok(collections)
    }
}
