use crate::database::PaperRepository;
use crate::models::Paper;
use sqlx::SqlitePool;
use tauri::State;
use std::collections::HashMap;
use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct TagWithCount {
    pub tag: String,
    pub count: i64,
}

/// Get all papers with pagination
#[tauri::command]
pub async fn get_papers(
    pool: State<'_, SqlitePool>,
    limit: i32,
    offset: i32,
) -> Result<Vec<Paper>, String> {
    println!("[get_papers] Fetching papers with limit={}, offset={}", limit, offset);
    let repo = PaperRepository::new(pool.inner());
    let result = repo.list(limit, offset)
        .await
        .map_err(|e| {
            eprintln!("[get_papers] Error fetching papers: {}", e);
            e.to_string()
        })?;
    println!("[get_papers] Successfully fetched {} papers", result.len());
    Ok(result)
}

/// Get a paper by ID
#[tauri::command]
pub async fn get_paper_by_id(
    pool: State<'_, SqlitePool>,
    id: String,
) -> Result<Option<Paper>, String> {
    let repo = PaperRepository::new(pool.inner());

    match repo.get_by_id(&id).await {
        Ok(paper) => Ok(Some(paper)),
        Err(crate::database::PaperError::NotFound(_)) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

/// Search papers
#[tauri::command]
pub async fn search_papers(
    pool: State<'_, SqlitePool>,
    query: String,
    limit: Option<i32>,
) -> Result<Vec<Paper>, String> {
    let repo = PaperRepository::new(pool.inner());
    repo.search(&query, limit.unwrap_or(20))
        .await
        .map_err(|e| e.to_string())
}

/// Get papers by tag
#[tauri::command]
pub async fn get_papers_by_tag(
    pool: State<'_, SqlitePool>,
    tag: String,
    limit: Option<i32>,
    offset: Option<i32>,
) -> Result<Vec<Paper>, String> {
    let repo = PaperRepository::new(pool.inner());
    repo.get_by_tag(&tag, limit.unwrap_or(20), offset.unwrap_or(0))
        .await
        .map_err(|e| e.to_string())
}

/// Get total paper count
#[tauri::command]
pub async fn get_paper_count(
    pool: State<'_, SqlitePool>,
) -> Result<i64, String> {
    let repo = PaperRepository::new(pool.inner());
    repo.count().await
        .map_err(|e| e.to_string())
}

/// Save a paper
#[tauri::command]
pub async fn save_paper(
    pool: State<'_, SqlitePool>,
    paper: Paper,
) -> Result<(), String> {
    eprintln!("[save_paper] Saving paper: {} (arxiv_id: {})", paper.title, paper.arxiv_id);
    let repo = PaperRepository::new(pool.inner());
    let result = repo.save(&paper).await;

    match &result {
        Ok(_) => eprintln!("[save_paper] Successfully saved paper: {}", paper.arxiv_id),
        Err(e) => eprintln!("[save_paper] Failed to save paper {}: {}", paper.arxiv_id, e),
    }

    result.map_err(|e| e.to_string())
}

/// Delete a paper
#[tauri::command]
pub async fn delete_paper(
    pool: State<'_, SqlitePool>,
    id: String,
) -> Result<(), String> {
    eprintln!("[delete_paper] Deleting paper with id: {}", id);
    let repo = PaperRepository::new(pool.inner());
    let result = repo.delete(&id).await;

    match &result {
        Ok(_) => eprintln!("[delete_paper] Successfully deleted paper: {}", id),
        Err(e) => eprintln!("[delete_paper] Failed to delete paper {}: {}", id, e),
    }

    result.map_err(|e| e.to_string())
}

/// Batch delete papers
#[tauri::command]
pub async fn batch_delete_papers(
    pool: State<'_, SqlitePool>,
    paper_ids: Vec<String>,
) -> Result<u64, String> {
    eprintln!("[batch_delete_papers] Deleting {} papers", paper_ids.len());
    let repo = PaperRepository::new(pool.inner());

    let mut success_count = 0;
    let mut failed_ids = Vec::new();

    for id in &paper_ids {
        match repo.delete(id).await {
            Ok(_) => {
                success_count += 1;
                eprintln!("[batch_delete_papers] Successfully deleted paper: {}", id);
            }
            Err(e) => {
                eprintln!("[batch_delete_papers] Failed to delete paper {}: {}", id, e);
                failed_ids.push(id.clone());
            }
        }
    }

    if !failed_ids.is_empty() {
        eprintln!("[batch_delete_papers] Failed to delete {}/{} papers", failed_ids.len(), paper_ids.len());
    }

    eprintln!("[batch_delete_papers] Batch delete complete: {} successful, {} failed",
        success_count, failed_ids.len());

    Ok(success_count)
}

/// Get all tags with their frequency counts
#[tauri::command]
pub async fn get_tags_with_counts(
    pool: State<'_, SqlitePool>,
    limit: Option<i32>,
) -> Result<Vec<TagWithCount>, String> {
    let repo = PaperRepository::new(pool.inner());

    // Get all papers to count tags
    let papers = repo.list(10000, 0).await
        .map_err(|e| e.to_string())?;

    // Count tag frequencies
    let mut tag_counts: HashMap<String, i64> = HashMap::new();

    for paper in papers {
        for tag in paper.tags {
            *tag_counts.entry(tag).or_insert(0) += 1;
        }
    }

    // Convert to vec and sort by count (descending)
    let mut tags_with_counts: Vec<TagWithCount> = tag_counts
        .into_iter()
        .map(|(tag, count)| TagWithCount { tag, count })
        .collect();

    tags_with_counts.sort_by(|a, b| b.count.cmp(&a.count));

    // Apply limit if specified
    if let Some(limit) = limit {
        tags_with_counts.truncate(limit as usize);
    }

    Ok(tags_with_counts)
}

/// Get spam/archived papers
#[tauri::command]
pub async fn get_spam_papers(
    pool: State<'_, SqlitePool>,
    limit: i32,
    offset: i32,
) -> Result<Vec<crate::models::Paper>, String> {
    let repo = PaperRepository::new(pool.inner());
    repo.list_spam(limit, offset)
        .await
        .map_err(|e| e.to_string())
}

/// Get count of spam papers
#[tauri::command]
pub async fn get_spam_paper_count(
    pool: State<'_, SqlitePool>,
) -> Result<i64, String> {
    let repo = PaperRepository::new(pool.inner());
    repo.count_spam()
        .await
        .map_err(|e| e.to_string())
}

/// Toggle spam status of a paper
#[tauri::command]
pub async fn toggle_paper_spam(
    pool: State<'_, SqlitePool>,
    id: String,
    is_spam: bool,
) -> Result<(), String> {
    let repo = PaperRepository::new(pool.inner());
    repo.toggle_spam(&id, is_spam)
        .await
        .map_err(|e| e.to_string())
}
