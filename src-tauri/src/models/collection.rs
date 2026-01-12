use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Collection {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub color: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct CollectionWithPaperCount {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub color: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub paper_count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateCollection {
    pub name: String,
    pub description: Option<String>,
    pub color: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateCollection {
    pub name: Option<String>,
    pub description: Option<String>,
    pub color: Option<String>,
}
