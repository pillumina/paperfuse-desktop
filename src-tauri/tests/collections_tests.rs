use tauri_app_lib::{CollectionRepository, Collection, CollectionWithPaperCount, CreateCollection, UpdateCollection};

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::SqlitePool;

    async fn setup_test_db() -> SqlitePool {
        let pool = SqlitePool::connect("sqlite::memory:")
            .await
            .expect("Failed to create in-memory database");

        // Create collections table
        sqlx::query(
            "CREATE TABLE IF NOT EXISTS collections (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                color TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )"
        )
        .execute(&pool)
        .await
        .expect("Failed to create collections table");

        // Create collection_papers table
        sqlx::query(
            "CREATE TABLE IF NOT EXISTS collection_papers (
                collection_id TEXT NOT NULL,
                paper_id TEXT NOT NULL,
                added_at TEXT NOT NULL,
                PRIMARY KEY (collection_id, paper_id)
            )"
        )
        .execute(&pool)
        .await
        .expect("Failed to create collection_papers table");

        pool
    }

    #[tokio::test]
    async fn test_create_collection() {
        let pool = setup_test_db().await;
        let repo = CollectionRepository::new(pool);

        let result: Result<Collection, String> = repo
            .create(CreateCollection {
                name: "Test Collection".to_string(),
                description: Some("Test description".to_string()),
                color: Some("bg-blue-500".to_string()),
            })
            .await;

        assert!(result.is_ok());
        let collection = result.unwrap();
        assert_eq!(collection.name, "Test Collection");
        assert_eq!(collection.description, Some("Test description".to_string()));
        assert_eq!(collection.color, Some("bg-blue-500".to_string()));
    }

    #[tokio::test]
    async fn test_create_collection_without_optional_fields() {
        let pool = setup_test_db().await;
        let repo = CollectionRepository::new(pool);

        let result: Result<Collection, String> = repo
            .create(CreateCollection {
                name: "Simple Collection".to_string(),
                description: None,
                color: None,
            })
            .await;

        assert!(result.is_ok());
        let collection = result.unwrap();
        assert_eq!(collection.name, "Simple Collection");
        assert!(collection.description.is_none());
        assert!(collection.color.is_none());
    }

    #[tokio::test]
    async fn test_get_collection_by_id() {
        let pool = setup_test_db().await;
        let repo = CollectionRepository::new(pool);

        let created: Result<Collection, String> = repo
            .create(CreateCollection {
                name: "Test".to_string(),
                description: None,
                color: None,
            })
            .await;

        let created = created.unwrap();
        let result: Result<Collection, String> = repo.get_by_id(&created.id).await;

        assert!(result.is_ok());
        let collection = result.unwrap();
        assert_eq!(collection.id, created.id);
        assert_eq!(collection.name, "Test");
    }

    #[tokio::test]
    async fn test_get_collection_by_non_existent_id() {
        let pool = setup_test_db().await;
        let repo = CollectionRepository::new(pool);

        let result: Result<Collection, String> = repo.get_by_id("non-existent").await;

        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_get_all_collections() {
        let pool = setup_test_db().await;
        let repo = CollectionRepository::new(pool);

        let _: Result<Collection, String> = repo.create(CreateCollection {
            name: "Collection 1".to_string(),
            description: None,
            color: None,
        })
        .await;

        let _: Result<Collection, String> = repo.create(CreateCollection {
            name: "Collection 2".to_string(),
            description: None,
            color: None,
        })
        .await;

        let result: Result<Vec<CollectionWithPaperCount>, String> = repo.get_all().await;

        assert!(result.is_ok());
        let collections = result.unwrap();
        assert_eq!(collections.len(), 2);
        assert_eq!(collections[0].paper_count, 0);
    }

    #[tokio::test]
    async fn test_update_collection() {
        let pool = setup_test_db().await;
        let repo = CollectionRepository::new(pool);

        let created: Result<Collection, String> = repo
            .create(CreateCollection {
                name: "Original Name".to_string(),
                description: None,
                color: None,
            })
            .await;

        let created = created.unwrap();
        let result: Result<Collection, String> = repo
            .update(
                &created.id,
                UpdateCollection {
                    name: Some("Updated Name".to_string()),
                    description: Some("Updated description".to_string()),
                    color: Some("bg-green-500".to_string()),
                },
            )
            .await;

        assert!(result.is_ok());
        let updated = result.unwrap();
        assert_eq!(updated.name, "Updated Name");
        assert_eq!(updated.description, Some("Updated description".to_string()));
        assert_eq!(updated.color, Some("bg-green-500".to_string()));
    }

    #[tokio::test]
    async fn test_update_collection_only_specified_fields() {
        let pool = setup_test_db().await;
        let repo = CollectionRepository::new(pool);

        let created: Result<Collection, String> = repo
            .create(CreateCollection {
                name: "Test".to_string(),
                description: Some("Original description".to_string()),
                color: Some("bg-blue-500".to_string()),
            })
            .await;

        let created = created.unwrap();
        let result: Result<Collection, String> = repo
            .update(
                &created.id,
                UpdateCollection {
                    name: None,
                    description: Some("New description".to_string()),
                    color: None,
                },
            )
            .await;

        assert!(result.is_ok());
        let updated = result.unwrap();
        assert_eq!(updated.name, "Test");
        assert_eq!(updated.description, Some("New description".to_string()));
        assert_eq!(updated.color, Some("bg-blue-500".to_string()));
    }

    #[tokio::test]
    async fn test_delete_collection() {
        let pool = setup_test_db().await;
        let repo = CollectionRepository::new(pool);

        let created: Result<Collection, String> = repo
            .create(CreateCollection {
                name: "To Delete".to_string(),
                description: None,
                color: None,
            })
            .await;

        let created = created.unwrap();
        let result: Result<(), String> = repo.delete(&created.id).await;

        assert!(result.is_ok());

        // Verify it's deleted
        let get_result: Result<Collection, String> = repo.get_by_id(&created.id).await;
        assert!(get_result.is_err());
    }

    #[tokio::test]
    async fn test_delete_non_existent_collection() {
        let pool = setup_test_db().await;
        let repo = CollectionRepository::new(pool);

        let result: Result<(), String> = repo.delete("non-existent").await;

        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_add_paper_to_collection() {
        let pool = setup_test_db().await;
        let repo = CollectionRepository::new(pool);

        let collection: Result<Collection, String> = repo
            .create(CreateCollection {
                name: "Test".to_string(),
                description: None,
                color: None,
            })
            .await;

        let collection = collection.unwrap();
        let result: Result<(), String> = repo.add_paper(&collection.id, "paper-123").await;

        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_add_paper_to_collection_is_idempotent() {
        let pool = setup_test_db().await;
        let repo = CollectionRepository::new(pool);

        let collection: Result<Collection, String> = repo
            .create(CreateCollection {
                name: "Test".to_string(),
                description: None,
                color: None,
            })
            .await;

        let collection = collection.unwrap();
        let _: Result<(), String> = repo.add_paper(&collection.id, "paper-123").await;
        let result: Result<(), String> = repo.add_paper(&collection.id, "paper-123").await;

        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_remove_paper_from_collection() {
        let pool = setup_test_db().await;
        let repo = CollectionRepository::new(pool);

        let collection: Result<Collection, String> = repo
            .create(CreateCollection {
                name: "Test".to_string(),
                description: None,
                color: None,
            })
            .await;

        let collection = collection.unwrap();
        let _: Result<(), String> = repo.add_paper(&collection.id, "paper-123").await;

        let result: Result<(), String> = repo.remove_paper(&collection.id, "paper-123").await;

        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_remove_paper_not_in_collection() {
        let pool = setup_test_db().await;
        let repo = CollectionRepository::new(pool);

        let collection: Result<Collection, String> = repo
            .create(CreateCollection {
                name: "Test".to_string(),
                description: None,
                color: None,
            })
            .await;

        let collection = collection.unwrap();
        let result: Result<(), String> = repo.remove_paper(&collection.id, "paper-123").await;

        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_has_paper_true() {
        let pool = setup_test_db().await;
        let repo = CollectionRepository::new(pool);

        let collection: Result<Collection, String> = repo
            .create(CreateCollection {
                name: "Test".to_string(),
                description: None,
                color: None,
            })
            .await;

        let collection = collection.unwrap();
        let _: Result<(), String> = repo.add_paper(&collection.id, "paper-123").await;

        let result: Result<bool, String> = repo.has_paper(&collection.id, "paper-123").await;

        assert!(result.is_ok());
        assert!(result.unwrap());
    }

    #[tokio::test]
    async fn test_has_paper_false() {
        let pool = setup_test_db().await;
        let repo = CollectionRepository::new(pool);

        let collection: Result<Collection, String> = repo
            .create(CreateCollection {
                name: "Test".to_string(),
                description: None,
                color: None,
            })
            .await;

        let collection = collection.unwrap();
        let result: Result<bool, String> = repo.has_paper(&collection.id, "paper-123").await;

        assert!(result.is_ok());
        assert!(!result.unwrap());
    }
}
