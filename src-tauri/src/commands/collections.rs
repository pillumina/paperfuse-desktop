use tauri::State;
use crate::database::CollectionRepository;

/// Create a new collection
#[tauri::command]
pub async fn create_collection(
    pool: State<'_, sqlx::SqlitePool>,
    name: String,
    description: Option<String>,
    color: Option<String>,
) -> Result<crate::models::collection::Collection, String> {
    let repo = CollectionRepository::new(pool.inner().clone());
    let collection = crate::models::collection::CreateCollection {
        name,
        description,
        color,
    };
    repo.create(collection).await
}

/// Get all collections
#[tauri::command]
pub async fn get_collections(
    pool: State<'_, sqlx::SqlitePool>,
) -> Result<Vec<crate::models::collection::CollectionWithPaperCount>, String> {
    let repo = CollectionRepository::new(pool.inner().clone());
    repo.get_all().await
}

/// Get a collection by ID
#[tauri::command]
pub async fn get_collection(
    pool: State<'_, sqlx::SqlitePool>,
    id: String,
) -> Result<crate::models::collection::Collection, String> {
    let repo = CollectionRepository::new(pool.inner().clone());
    repo.get_by_id(&id).await
}

/// Update a collection
#[tauri::command]
pub async fn update_collection(
    pool: State<'_, sqlx::SqlitePool>,
    id: String,
    name: Option<String>,
    description: Option<String>,
    color: Option<String>,
) -> Result<crate::models::collection::Collection, String> {
    let repo = CollectionRepository::new(pool.inner().clone());
    let updates = crate::models::collection::UpdateCollection {
        name,
        description,
        color,
    };
    repo.update(&id, updates).await
}

/// Delete a collection
#[tauri::command]
pub async fn delete_collection(
    pool: State<'_, sqlx::SqlitePool>,
    id: String,
) -> Result<(), String> {
    let repo = CollectionRepository::new(pool.inner().clone());
    repo.delete(&id).await
}

/// Add paper to collection
#[tauri::command]
pub async fn add_paper_to_collection(
    pool: State<'_, sqlx::SqlitePool>,
    collection_id: String,
    paper_id: String,
) -> Result<(), String> {
    let repo = CollectionRepository::new(pool.inner().clone());
    repo.add_paper(&collection_id, &paper_id).await
}

/// Remove paper from collection
#[tauri::command]
pub async fn remove_paper_from_collection(
    pool: State<'_, sqlx::SqlitePool>,
    collection_id: String,
    paper_id: String,
) -> Result<(), String> {
    let repo = CollectionRepository::new(pool.inner().clone());
    repo.remove_paper(&collection_id, &paper_id).await
}

/// Get papers in a collection
#[tauri::command]
pub async fn get_collection_papers(
    pool: State<'_, sqlx::SqlitePool>,
    collection_id: String,
    limit: Option<i32>,
) -> Result<Vec<crate::models::paper::Paper>, String> {
    let repo = CollectionRepository::new(pool.inner().clone());
    repo.get_papers(&collection_id, limit.unwrap_or(100)).await
}

/// Get collections for a paper
#[tauri::command]
pub async fn get_paper_collections(
    pool: State<'_, sqlx::SqlitePool>,
    paper_id: String,
) -> Result<Vec<crate::models::collection::Collection>, String> {
    let repo = CollectionRepository::new(pool.inner().clone());
    repo.get_for_paper(&paper_id).await
}
