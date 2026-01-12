//! Manual paper analysis commands
//!
//! This module provides commands for manually analyzing papers,
//! either individually or in batches, with support for different
//! analysis modes (standard vs full).

use crate::arxiv::{fetch_papers, FetchOptions};
use crate::database::PaperRepository;
use crate::llm::{LlmClient, StandardAnalysisResult, FullAnalysisResult};
use crate::models::{Paper, LLMProvider};
use sqlx::SqlitePool;
use tauri::State;

/// Analysis result
#[derive(Debug, Clone, serde::Serialize)]
pub struct BatchAnalysisResult {
    pub successful: usize,
    pub failed: usize,
    pub failed_ids: Vec<String>,
}

/// Analyze a single paper with the specified mode
#[tauri::command]
pub async fn analyze_paper(
    pool: State<'_, SqlitePool>,
    #[allow(non_snake_case)]
    paperId: String,
    #[allow(non_snake_case)]
    analysisMode: String,
) -> Result<Paper, String> {
    // Default to Chinese for now
    let analysis_language = "zh";
    eprintln!("[analyze_paper] ENTRY - Received parameters:");
    eprintln!("  paperId: {:?}", paperId);
    eprintln!("  analysisMode: {:?}", analysisMode);
    eprintln!("  analysis_language: {} (default)", analysis_language);
    eprintln!("[analyze_paper] Starting analysis for paper: {} (mode: {}, language: {})", paperId, analysisMode, analysis_language);

    // Convert to snake_case for internal use
    let paper_id = paperId;
    let analysis_mode = analysisMode;

    // Get paper from database
    let repo = PaperRepository::new(pool.inner());
    let mut paper = repo.get_by_id(&paper_id).await
        .map_err(|e| {
            eprintln!("[analyze_paper] Failed to get paper: {}", e);
            e.to_string()
        })?;

    // Fetch entry from ArXiv to get latest data
    let fetch_options = FetchOptions {
        categories: vec![],
        max_results: 1,
        days_back: None,
        date_from: None,
        date_to: None,
        fetch_by_id: true,
        arxiv_ids: Some(vec![paper.arxiv_id.clone()]),
    };

    let entries = fetch_papers(&fetch_options).await
        .map_err(|e| {
            eprintln!("[analyze_paper] Failed to fetch from ArXiv: {}", e);
            format!("Failed to fetch from ArXiv: {}", e)
        })?;

    let entry = entries.into_iter().next()
        .ok_or_else(|| {
            eprintln!("[analyze_paper] Paper not found on ArXiv: {}", paper.arxiv_id);
            format!("Paper not found on ArXiv: {}", paper.arxiv_id)
        })?;

    // Get settings for LLM configuration
    let settings_repo = crate::database::SettingsRepository::new(pool.inner());
    let settings = settings_repo.get_all().await
        .map_err(|e| {
            eprintln!("[analyze_paper] Failed to get settings: {}", e);
            e.to_string()
        })?;

    // Create LLM client
    let provider = settings.llm_provider;
    let api_key = match provider {
        LLMProvider::Glm => settings.glm_api_key,
        LLMProvider::Claude => settings.claude_api_key,
    }.ok_or_else(|| {
        eprintln!("[analyze_paper] No API key configured");
        "No API key configured".to_string()
    })?;

    let quick_model = settings.glm_quick_model.clone().or(settings.claude_quick_model.clone());
    let deep_model = settings.glm_deep_model.clone().or(settings.claude_deep_model.clone());

    let client = LlmClient::new(
        provider,
        api_key,
        quick_model,
        deep_model,
    ).map_err(|e| {
        eprintln!("[analyze_paper] Failed to create LLM client: {}", e);
        e.to_string()
    })?;

    // Get topics from settings
    let topics = settings.topics.clone();

    // Get LaTeX download path from settings
    let latex_path = settings.latex_download_path.as_deref();

    // Download LaTeX if path is configured
    let latex_content = if let Some(download_path) = latex_path {
        use std::path::Path;
        let path = Path::new(download_path);
        match entry.download_latex_source(path).await {
            Ok(latex_file_path) => {
                match std::fs::read_to_string(&latex_file_path) {
                    Ok(content) => {
                        eprintln!("[analyze_paper] LaTeX downloaded ({} bytes)", content.len());
                        Some(content)
                    }
                    Err(e) => {
                        eprintln!("[analyze_paper] Failed to read LaTeX: {}, falling back to abstract", e);
                        None
                    }
                }
            }
            Err(e) => {
                eprintln!("[analyze_paper] Failed to download LaTeX: {}, falling back to abstract", e);
                None
            }
        }
    } else {
        eprintln!("[analyze_paper] No LaTeX download path configured");
        None
    };

    // Perform analysis based on mode
    match analysis_mode.as_str() {
        "full" => {
            // Full mode: analyze complete LaTeX (or abstract if LaTeX unavailable)
            let content = if let Some(ref latex) = latex_content {
                crate::latex_parser::clean_latex(latex)
            } else {
                eprintln!("[analyze_paper] Full mode: LaTeX not available, using abstract");
                entry.summary.clone()
            };

            let result: FullAnalysisResult = client
                .analyze_full(&paper.title, &entry.summary, &topics, &content, &analysis_language)
                .await
                .map_err(|e| {
                    eprintln!("[analyze_paper] Full analysis failed: {}", e);
                    e.to_string()
                })?;

            // Update paper with analysis results
            update_paper_with_full_analysis(&mut paper, result);
            paper.analysis_incomplete = latex_content.is_none();
        }
        "standard" | _ => {
            // Standard mode: analyze intro + conclusion (or abstract if LaTeX unavailable)
            let content = if let Some(ref latex) = latex_content {
                crate::latex_parser::extract_intro_conclusion(latex)
            } else {
                eprintln!("[analyze_paper] Standard mode: LaTeX not available, using abstract");
                String::new()
            };

            let analysis_content = if content.is_empty() {
                &entry.summary
            } else {
                &content
            };

            let result: StandardAnalysisResult = client
                .analyze_standard(&paper.title, &entry.summary, &topics, analysis_content, &analysis_language)
                .await
                .map_err(|e| {
                    eprintln!("[analyze_paper] Standard analysis failed: {}", e);
                    e.to_string()
                })?;

            // Update paper with analysis results
            update_paper_with_standard_analysis(&mut paper, result);
            paper.analysis_incomplete = latex_content.is_none();
        }
    }

    // Mark as deep analyzed
    paper.is_deep_analyzed = true;
    paper.analysis_mode = Some(analysis_mode.clone());

    // Save updated paper
    repo.save(&paper).await
        .map_err(|e| {
            eprintln!("[analyze_paper] Failed to save paper: {}", e);
            e.to_string()
        })?;

    eprintln!("[analyze_paper] Analysis completed successfully for: {}", paper_id);
    Ok(paper)
}

/// Batch analyze multiple papers
#[tauri::command]
pub async fn batch_analyze_papers(
    pool: State<'_, SqlitePool>,
    #[allow(non_snake_case)]
    paperIds: Vec<String>,
    #[allow(non_snake_case)]
    analysisMode: String,
) -> Result<BatchAnalysisResult, String> {
    // Default to Chinese for now
    let analysis_language = "zh";
    eprintln!("[batch_analyze_papers] ENTRY - Received parameters:");
    eprintln!("  paperIds: {:?}", paperIds);
    eprintln!("  analysisMode: {:?}", analysisMode);
    eprintln!("  analysis_language: {} (default)", analysis_language);

    // Convert to snake_case for internal use
    let paper_ids = paperIds;
    let analysis_mode = analysisMode;

    let total = paper_ids.len();
    let mut successful = 0;
    let mut failed = 0;
    let mut failed_ids = Vec::new();

    for (index, paper_id) in paper_ids.iter().enumerate() {
        eprintln!("[batch_analyze_papers] Processing {}/{}: {}",
            index + 1, total, paper_id);

        match analyze_paper(pool.clone(), paper_id.clone(), analysis_mode.clone()).await {
            Ok(_) => {
                successful += 1;
                eprintln!("[batch_analyze_papers] Successfully analyzed: {}", paper_id);
            }
            Err(e) => {
                failed += 1;
                failed_ids.push(paper_id.clone());
                eprintln!("[batch_analyze_papers] Failed to analyze {}: {}", paper_id, e);
            }
        }
    }

    eprintln!("[batch_analyze_papers] Batch analysis complete: {} successful, {} failed",
        successful, failed);

    Ok(BatchAnalysisResult {
        successful,
        failed,
        failed_ids,
    })
}

/// Update paper with standard analysis results
fn update_paper_with_standard_analysis(paper: &mut Paper, result: StandardAnalysisResult) {
    paper.ai_summary = Some(result.ai_summary);
    paper.key_insights = Some(result.key_insights);
    paper.engineering_notes = Some(result.engineering_notes);
    paper.novelty_score = Some(result.novelty_score);
    paper.novelty_reason = Some(result.novelty_reason);
    paper.effectiveness_score = Some(result.effectiveness_score);
    paper.effectiveness_reason = Some(result.effectiveness_reason);

    // Update code availability
    paper.code_available = result.code_available;
    if !result.code_links.is_empty() {
        paper.code_links = Some(result.code_links);
    }

    // Update tags if provided
    if !result.suggested_tags.is_empty() {
        paper.tags = result.suggested_tags;
    }

    // Update topics if provided
    if !result.suggested_topics.is_empty() {
        paper.topics = result.suggested_topics;
    }
}

/// Update paper with full analysis results
fn update_paper_with_full_analysis(paper: &mut Paper, result: FullAnalysisResult) {
    // First apply all standard fields
    update_paper_with_standard_analysis(paper, StandardAnalysisResult {
        novelty_score: result.novelty_score,
        novelty_reason: result.novelty_reason,
        effectiveness_score: result.effectiveness_score,
        effectiveness_reason: result.effectiveness_reason,
        code_available: result.code_available,
        code_links: result.code_links,
        engineering_notes: result.engineering_notes,
        ai_summary: result.ai_summary,
        key_insights: result.key_insights,
        suggested_tags: result.suggested_tags,
        suggested_topics: result.suggested_topics,
    });

    // Then add full-mode specific fields
    paper.experiment_completeness_score = Some(result.experiment_completeness_score);
    paper.experiment_completeness_reason = Some(result.experiment_completeness_reason);
    paper.algorithm_flowchart = result.algorithm_flowchart;
    paper.time_complexity = result.time_complexity;
    paper.space_complexity = result.space_complexity;
}
