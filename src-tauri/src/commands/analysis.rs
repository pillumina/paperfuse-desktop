//! Manual paper analysis commands
//!
//! This module provides commands for manually analyzing papers,
//! either individually or in batches, with support for different
//! analysis modes (standard vs full).

use crate::arxiv::{fetch_papers, FetchOptions};
use crate::database::PaperRepository;
use crate::llm::{LlmClient, StandardAnalysisResult, FullAnalysisResult};
use crate::models::{Paper, LLMProvider};
use crate::analysis::AnalysisDepth;
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
    #[allow(non_snake_case)]
    analysisLanguage: Option<String>,
) -> Result<Paper, String> {
    // Use provided language or default to Chinese
    let analysis_language = analysisLanguage.as_deref().unwrap_or("zh");
    eprintln!("[analyze_paper] ENTRY - Received parameters:");
    eprintln!("  paperId: {:?}", paperId);
    eprintln!("  analysisMode: {:?}", analysisMode);
    eprintln!("  analysisLanguage: {:?}", analysisLanguage);
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

    // Get topics and analysis config from settings
    let topics = settings.topics.clone();
    let analysis_config = settings.analysis_config.unwrap_or_default();

    // Fix basic blocks mode - they should always be Both
    let analysis_config = fix_basic_blocks_mode(analysis_config);

    eprintln!("[analyze_paper] Using analysis config with {} blocks", analysis_config.blocks.len());

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

    // Determine analysis depth
    let depth = match analysis_mode.as_str() {
        "full" => AnalysisDepth::Full,
        "standard" | _ => AnalysisDepth::Standard,
    };

    // Build modular prompt using new system
    let prompt = crate::analysis::build_analysis_prompt(
        &paper.title,
        &entry.summary,
        &topics,
        latex_content.as_deref(),
        &analysis_language,
        &analysis_config,
        depth,
    );

    eprintln!("[analyze_paper] Generated modular prompt ({} chars)", prompt.chars().count());

    // Send request to LLM
    let response = client
        .send_chat_request(&prompt, depth.as_str())
        .await
        .map_err(|e| {
            eprintln!("[analyze_paper] LLM request failed: {}", e);
            e.to_string()
        })?;

    eprintln!("[analyze_paper] Raw response from LLM ({} chars): {}", response.len(), &response.chars().take(500).collect::<String>());

    // Clean the response (remove markdown code blocks)
    let cleaned_response = client.clean_response(&response);
    if response != cleaned_response {
        eprintln!("[analyze_paper] Cleaned markdown blocks from response");
    }

    // Fix common JSON formatting errors
    let fixed_response = client.fix_json_formatting(&cleaned_response);
    if cleaned_response != fixed_response {
        eprintln!("[analyze_paper] Applied JSON formatting fixes");
    }

    eprintln!("[analyze_paper] Fixed response ({} chars): {}", fixed_response.len(), &fixed_response.chars().take(500).collect::<String>());

    // Parse the JSON response based on depth
    match depth {
        AnalysisDepth::Full => {
            eprintln!("[analyze_paper] Attempting to parse as FullAnalysisResult...");
            let result: crate::llm::FullAnalysisResult = serde_json::from_str(&fixed_response)
                .map_err(|e| {
                    eprintln!("[analyze_paper] ===== PARSE ERROR =====");
                    eprintln!("[analyze_paper] Error: {}", e);
                    eprintln!("[analyze_paper] Response length: {}", fixed_response.len());
                    eprintln!("[analyze_paper] First 2000 chars:\n{}", &fixed_response.chars().take(2000).collect::<String>());
                    if fixed_response.len() > 2000 {
                        eprintln!("[analyze_paper] Last 500 chars:\n{}", &fixed_response.chars().skip(fixed_response.len().saturating_sub(500)).collect::<String>());
                    }
                    eprintln!("[analyze_paper] ===== END PARSE ERROR =====");
                    format!("Failed to parse full analysis result: {}", e)
                })?;

            eprintln!("[analyze_paper] Successfully parsed FullAnalysisResult");
            // Update paper with analysis results
            update_paper_with_full_analysis(&mut paper, result);
            paper.analysis_incomplete = latex_content.is_none();
        }
        AnalysisDepth::Standard => {
            eprintln!("[analyze_paper] Attempting to parse as StandardAnalysisResult...");
            let result: crate::llm::StandardAnalysisResult = serde_json::from_str(&fixed_response)
                .map_err(|e| {
                    eprintln!("[analyze_paper] ===== PARSE ERROR =====");
                    eprintln!("[analyze_paper] Error: {}", e);
                    eprintln!("[analyze_paper] Response length: {}", fixed_response.len());
                    eprintln!("[analyze_paper] First 2000 chars:\n{}", &fixed_response.chars().take(2000).collect::<String>());
                    if fixed_response.len() > 2000 {
                        eprintln!("[analyze_paper] Last 500 chars:\n{}", &fixed_response.chars().skip(fixed_response.len().saturating_sub(500)).collect::<String>());
                    }
                    eprintln!("[analyze_paper] ===== END PARSE ERROR =====");
                    format!("Failed to parse standard analysis result: {}", e)
                })?;

            eprintln!("[analyze_paper] Successfully parsed StandardAnalysisResult");
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
    #[allow(non_snake_case)]
    analysisLanguage: Option<String>,
) -> Result<BatchAnalysisResult, String> {
    // Use provided language or default to Chinese
    let analysis_language = analysisLanguage.as_deref().unwrap_or("zh");
    eprintln!("[batch_analyze_papers] ENTRY - Received parameters:");
    eprintln!("  paperIds: {:?}", paperIds);
    eprintln!("  analysisMode: {:?}", analysisMode);
    eprintln!("  analysisLanguage: {:?}", analysisLanguage);
    eprintln!("  analysis_language: {}", analysis_language);

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

        match analyze_paper(pool.clone(), paper_id.clone(), analysis_mode.clone(), analysisLanguage.clone()).await {
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

    // Update related_papers if provided
    if !result.related_papers.is_empty() {
        paper.related_papers = Some(result.related_papers.into_iter().map(|rp| crate::models::RelatedPaper {
            arxiv_id: rp.arxiv_id,
            title: rp.title,
            relationship: match rp.relationship {
                crate::llm::PaperRelationship::BuildsOn => crate::models::PaperRelationship::BuildsOn,
                crate::llm::PaperRelationship::ImprovesUpon => crate::models::PaperRelationship::ImprovesUpon,
                crate::llm::PaperRelationship::CompetingWith => crate::models::PaperRelationship::CompetingWith,
                crate::llm::PaperRelationship::CitedBy => crate::models::PaperRelationship::CitedBy,
                crate::llm::PaperRelationship::SimilarTo => crate::models::PaperRelationship::SimilarTo,
            },
            relevance_score: rp.relevance_score,
            reason: rp.reason,
        }).collect());
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
        related_papers: result.related_papers,
    });

    // Then add full-mode specific fields
    paper.experiment_completeness_score = Some(result.experiment_completeness_score);
    paper.experiment_completeness_reason = Some(result.experiment_completeness_reason);
    paper.algorithm_flowchart = result.algorithm_flowchart;
    paper.time_complexity = result.time_complexity;
    paper.space_complexity = result.space_complexity;
}

/// Ensure basic blocks (ai_summary, topics) always have mode=Both
fn fix_basic_blocks_mode(config: crate::analysis::UserAnalysisConfig) -> crate::analysis::UserAnalysisConfig {
    use crate::analysis::BlockRunMode;

    let blocks = config.blocks.into_iter().map(|mut block| {
        // Basic blocks should always have mode=Both
        if is_basic_block(&block.block_id) {
            if block.mode != BlockRunMode::Both {
                eprintln!("[fix_basic_blocks_mode] Correcting mode for basic block '{}' from {:?} to Both",
                    block.block_id, block.mode);
                block.mode = BlockRunMode::Both;
            }
        }
        block
    }).collect();

    crate::analysis::UserAnalysisConfig { blocks }
}

/// Check if a block ID is a basic block
fn is_basic_block(block_id: &str) -> bool {
    matches!(block_id, "ai_summary" | "topics")
}
