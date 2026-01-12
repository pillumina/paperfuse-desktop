use crate::database::{SettingsRepository, ClassificationCacheRepository};
use crate::models::Settings;
use crate::database::classification_cache::CacheStats;
use sqlx::SqlitePool;
use tauri::State;

/// Get all settings
#[tauri::command]
pub async fn get_settings(
    pool: State<'_, SqlitePool>,
) -> Result<Settings, String> {
    let repo = SettingsRepository::new(pool.inner());
    repo.get_all().await
        .map_err(|e| e.to_string())
}

/// Save all settings
#[tauri::command]
pub async fn save_settings(
    pool: State<'_, SqlitePool>,
    settings: Settings,
) -> Result<(), String> {
    println!("[save_settings] Received settings from frontend: provider={:?}, has_glm_key={}, has_claude_key={}",
        settings.llm_provider,
        settings.glm_api_key.is_some(),
        settings.claude_api_key.is_some()
    );

    // Get the old settings to check if topics have changed
    let repo = SettingsRepository::new(pool.inner());
    let old_settings = repo.get_all().await;

    // Save the new settings
    repo.save_all(&settings)
        .await
        .map_err(|e| e.to_string())?;

    // Clear classification cache if topics have changed
    if let Ok(old) = old_settings {
        // Check if topics have changed by comparing the hashes
        use crate::models::compute_topics_hash;
        let old_hash = compute_topics_hash(&old.topics);
        let new_hash = compute_topics_hash(&settings.topics);

        if old_hash != new_hash {
            println!("[save_settings] Topics configuration changed (old_hash={}, new_hash={}), clearing classification cache", old_hash, new_hash);
            let cache_repo = ClassificationCacheRepository::new(pool.inner());
            match cache_repo.clear_all().await {
                Ok(count) => {
                    println!("[save_settings] Cleared {} cache entries", count);
                }
                Err(e) => {
                    eprintln!("[save_settings] Failed to clear cache: {}", e);
                }
            }
        }
    }

    Ok(())
}

/// Get a single setting value
#[tauri::command]
pub async fn get_setting(
    pool: State<'_, SqlitePool>,
    key: String,
) -> Result<Option<String>, String> {
    let repo = SettingsRepository::new(pool.inner());
    repo.get(&key).await
        .map_err(|e| e.to_string())
}

/// Set a single setting value
#[tauri::command]
pub async fn set_setting(
    pool: State<'_, SqlitePool>,
    key: String,
    value: String,
) -> Result<(), String> {
    let repo = SettingsRepository::new(pool.inner());
    repo.set(&key, &value).await
        .map_err(|e| e.to_string())
}

/// Get classification cache statistics
#[tauri::command]
pub async fn get_cache_stats(
    pool: State<'_, SqlitePool>,
) -> Result<CacheStats, String> {
    eprintln!("[get_cache_stats] Fetching cache statistics...");
    let cache_repo = ClassificationCacheRepository::new(pool.inner());
    let result = cache_repo.get_stats().await;

    match &result {
        Ok(stats) => {
            eprintln!("[get_cache_stats] Cache stats: {} total entries, {} unique papers, {} unique configs",
                stats.total_entries, stats.unique_papers, stats.unique_configs);
        }
        Err(e) => {
            eprintln!("[get_cache_stats] Failed to fetch cache stats: {}", e);
        }
    }

    result.map_err(|e| e.to_string())
}

/// Clear all classification cache
#[tauri::command]
pub async fn clear_cache(
    pool: State<'_, SqlitePool>,
) -> Result<u64, String> {
    eprintln!("[clear_cache] Clearing all classification cache...");
    let cache_repo = ClassificationCacheRepository::new(pool.inner());
    let result = cache_repo.clear_all().await;

    match &result {
        Ok(count) => {
            eprintln!("[clear_cache] Successfully cleared {} cache entries", count);
        }
        Err(e) => {
            eprintln!("[clear_cache] Failed to clear cache: {}", e);
        }
    }

    result.map_err(|e| e.to_string())
}
