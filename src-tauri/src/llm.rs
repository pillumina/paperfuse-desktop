//! LLM client for paper classification and analysis
//! Supports GLM (ZhipuAI) and Claude (Anthropic) APIs

use crate::models::{LLMProvider, TopicConfig};
use crate::models::settings::RetryConfig;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::pin::Pin;
use std::sync::Arc;
use thiserror::Error;

/// Errors that can occur during LLM operations
#[derive(Debug, Error, Clone)]
pub enum LlmError {
    #[error("HTTP request failed: {0}")]
    RequestError(Arc<reqwest::Error>),

    #[error("API returned error: {0}")]
    ApiError(String),

    #[error("Failed to parse response: {0}")]
    ParseError(String),

    #[error("No API key configured")]
    NoApiKey,

    #[error("Unsupported LLM provider: {0}")]
    UnsupportedProvider(String),
}

impl From<reqwest::Error> for LlmError {
    fn from(err: reqwest::Error) -> Self {
        LlmError::RequestError(Arc::new(err))
    }
}

/// Result of paper classification (DEPRECATED - use RelevanceResult)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClassificationResult {
    pub is_relevant: bool,
    pub score: i32, // 0-100
    pub reason: String,
    pub suggested_tags: Vec<String>,
    pub suggested_topics: Vec<String>,
}

/// Phase 1: Relevance analysis result (always performed)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RelevanceResult {
    pub score: i32,              // 0-100
    pub reason: String,
    pub suggested_tags: Vec<String>,
    pub suggested_topics: Vec<String>,
}

/// Phase 2: Standard mode analysis result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StandardAnalysisResult {
    pub novelty_score: i32,      // 0-10
    pub novelty_reason: String,
    pub effectiveness_score: i32, // 0-10
    pub effectiveness_reason: String,
    pub code_available: bool,
    pub code_links: Vec<String>,
    pub engineering_notes: String, // Engineer-focused
    pub ai_summary: String,
    pub key_insights: Vec<String>,
    pub suggested_tags: Vec<String>,
    pub suggested_topics: Vec<String>,
}

/// Phase 2: Full mode analysis result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FullAnalysisResult {
    // All fields from StandardAnalysisResult
    pub novelty_score: i32,
    pub novelty_reason: String,
    pub effectiveness_score: i32,
    pub effectiveness_reason: String,
    pub code_available: bool,
    pub code_links: Vec<String>,
    pub engineering_notes: String,
    pub ai_summary: String,
    pub key_insights: Vec<String>,
    pub suggested_tags: Vec<String>,
    pub suggested_topics: Vec<String>,

    // Additional fields for full mode
    pub experiment_completeness_score: i32,  // 0-10
    pub experiment_completeness_reason: String,
    pub algorithm_flowchart: Option<String>,  // Mermaid or text description
    pub time_complexity: Option<String>,
    pub space_complexity: Option<String>,
}

/// Result of deep paper analysis (DEPRECATED - use StandardAnalysisResult or FullAnalysisResult)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnalysisResult {
    pub ai_summary: String,
    pub key_insights: Vec<String>,
    pub engineering_notes: Option<String>,
    pub code_links: Vec<String>,
    pub suggested_tags: Vec<String>,
    pub suggested_topics: Vec<String>,
    pub filter_score: i32,
    pub filter_reason: String,
}

/// Chat message for LLM API
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

/// GLM API request
#[derive(Debug, Serialize)]
struct GlmRequest {
    model: String,
    messages: Vec<ChatMessage>,
    temperature: f32,
    max_tokens: i32,
}

/// GLM API response
#[derive(Debug, Deserialize)]
struct GlmResponse {
    choices: Vec<GlmChoice>,
}

#[derive(Debug, Deserialize)]
struct GlmChoice {
    message: ChatMessage,
}

/// Anthropic API request
#[derive(Debug, Serialize)]
struct AnthropicRequest {
    model: String,
    messages: Vec<ChatMessage>,
    max_tokens: i32,
    temperature: f32,
}

/// Anthropic API response
#[derive(Debug, Deserialize)]
struct AnthropicResponse {
    content: Vec<AnthropicContent>,
}

#[derive(Debug, Deserialize)]
struct AnthropicContent {
    text: String,
}

/// LLM client
#[derive(Clone)]
pub struct LlmClient {
    client: Client,
    provider: LLMProvider,
    api_key: String,
    quick_model: String,
    deep_model: String,
    retry_config: Option<RetryConfig>,
}

impl LlmClient {
    pub fn new(
        provider: LLMProvider,
        api_key: String,
        quick_model: Option<String>,
        deep_model: Option<String>,
    ) -> Result<Self, LlmError> {
        if api_key.is_empty() {
            return Err(LlmError::NoApiKey);
        }

        // Set default models based on provider
        let (quick_model, deep_model) = match provider {
            LLMProvider::Glm => (
                quick_model.unwrap_or_else(|| "glm-4-flash".to_string()),
                deep_model.unwrap_or_else(|| "glm-4-plus".to_string()),
            ),
            LLMProvider::Claude => (
                quick_model.unwrap_or_else(|| "claude-3-5-haiku-20241022".to_string()),
                deep_model.unwrap_or_else(|| "claude-3-5-sonnet-20241022".to_string()),
            ),
        };

        Ok(Self {
            client: Client::new(),
            provider,
            api_key,
            quick_model,
            deep_model,
            retry_config: None,
        })
    }

    /// Set retry configuration for this client
    ///
    /// # Arguments
    /// * `config` - Retry configuration to use
    ///
    /// # Returns
    /// Self for chaining
    ///
    /// # Example
    /// ```no_run
    /// # use paperfuse_desktop::models::RetryConfig;
    /// # use paperfuse_desktop::llm::LlmClient;
    /// # use paperfuse_desktop::models::LLMProvider;
    /// let client = LlmClient::new(
    ///     LLMProvider::Glm,
    ///     "api-key".to_string(),
    ///     None,
    ///     None
    /// ).unwrap();
    ///
    /// let config = RetryConfig::default();
    /// client.with_retry_config(config);
    /// ```
    pub fn with_retry_config(mut self, config: RetryConfig) -> Self {
        // Update client with timeout from config
        use std::time::Duration;
        let timeout = Duration::from_secs(config.request_timeout_secs);

        self.client = reqwest::Client::builder()
            .timeout(timeout)
            .build()
            .unwrap_or_else(|_| Client::new());

        self.retry_config = Some(config);
        self
    }

    /// Clean LLM response by removing markdown code blocks
    /// Handles both outer code blocks and nested code blocks within JSON strings
    fn clean_response(&self, response: &str) -> String {
        let mut response = response.trim().to_string();

        // Loop to remove all markdown code blocks (including nested ones)
        loop {
            let original = response.clone();

            // Remove all occurrences of ```language ... ``` patterns
            // This handles: ```mermaid ... ```, ```json ... ```, ``` ... ```
            while let Some(start) = response.find("```") {
                // Find the end of the opening tag (e.g., ```mermaid or ```)
                let after_open_start = start + 3;

                // Find the newline after the opening ```
                let content_start = if let Some(nl_pos) = response[after_open_start..].find('\n') {
                    after_open_start + nl_pos + 1
                } else {
                    // No newline found, just skip the opening ```
                    response = response[..start].to_string() + &response[after_open_start..];
                    continue;
                };

                // Find the closing ```
                if let Some(end) = response[content_start..].find("```") {
                    let content_end = content_start + end;
                    // Remove the code block markers, keep the content
                    response = response[..start].to_string() + &response[content_start..content_end] + &response[content_end + 3..];
                } else {
                    // No closing ``` found, remove opening and continue
                    response = response[..start].to_string() + &response[after_open_start..];
                }
            }

            // If no more changes were made, we're done
            if response == original {
                break;
            }
        }

        response.trim().to_string()
    }

    /// Attempt to fix common JSON formatting errors from LLM responses
    fn fix_json_formatting(&self, json_str: &str) -> String {
        let mut fixed = json_str.to_string();

        // Fix 1: Remove unescaped newlines in string literals
        // Pattern: "text\ntext" should be "text\\ntext"
        // This is tricky to do with regex, so we'll use a heuristic approach
        // Find lines that start with quote and are inside what looks like an array
        let lines: Vec<&str> = fixed.lines().collect();
        let mut result: Vec<String> = Vec::new();
        let mut in_array = false;
        let mut in_string = false;

        for (i, line) in lines.iter().enumerate() {
            let trimmed = line.trim();

            // Check if we're starting/ending an array or string
            if trimmed.contains("[") {
                in_array = true;
            }
            if trimmed.contains("]") {
                in_array = false;
            }

            // If line starts with quote and we're in an array, and previous line didn't end with comma
            // it's likely an unescaped newline
            if trimmed.starts_with('"') && in_array && !in_string {
                if i > 0 {
                    let prev_line = lines[i - 1].trim();
                    // If previous line ends with a quote but no comma, add comma
                    if prev_line.ends_with('"') && !prev_line.ends_with(",") && !prev_line.ends_with("[") {
                        // Add comma to previous line
                        if let Some(last) = result.last_mut() {
                            if !last.ends_with(',') {
                                last.push(',');
                            }
                        }
                    }
                }
            }

            // Track if we're inside a string (simple heuristic)
            if trimmed.starts_with('"') && !trimmed.contains(": ") {
                in_string = !in_string;
            }

            result.push(line.to_string());
        }

        fixed = result.join("\n");

        // Fix 2: Ensure trailing commas are removed (JSON doesn't allow them)
        // This is more complex and might be better handled by serde_json with some leniency
        // For now, we'll rely on serde_json's error message

        fixed
    }

    /// Classify a paper based on title, abstract, and configured topics
    pub async fn classify_paper(
        &self,
        title: &str,
        summary: &str,
        topics: &[TopicConfig],
    ) -> Result<ClassificationResult, LlmError> {
        let prompt = self.build_classification_prompt(title, summary, topics);
        let response = self.send_chat_request(&prompt, "relevance").await?;

        println!("[LLM classify_paper] Raw response from LLM: {}", response);

        // Clean the response (remove markdown code blocks)
        let cleaned_response = self.clean_response(&response);
        if response != cleaned_response {
            println!("[LLM classify_paper] Cleaned response: {}", cleaned_response);
        }

        // Parse the JSON response
        let result: ClassificationResult = serde_json::from_str(&cleaned_response)
            .map_err(|e| LlmError::ParseError(format!("Failed to parse classification result: {}. Raw response: {}", e, response)))?;

        Ok(result)
    }

    /// Perform deep analysis of a paper
    /// If latex_content is provided, will include it for more detailed analysis
    pub async fn analyze_paper(
        &self,
        title: &str,
        summary: &str,
        topics: &[TopicConfig],
        latex_content: Option<&str>,
    ) -> Result<AnalysisResult, LlmError> {
        let prompt = self.build_analysis_prompt(title, summary, topics, latex_content);
        // Use "standard" for legacy analyze_paper (has LaTeX content)
        let analysis_type = if latex_content.is_some() { "standard" } else { "relevance" };
        let response = self.send_chat_request(&prompt, analysis_type).await?;

        println!("[LLM analyze_paper] Raw response from LLM: {}", response);

        // Clean the response (remove markdown code blocks)
        let cleaned_response = self.clean_response(&response);
        if response != cleaned_response {
            println!("[LLM analyze_paper] Cleaned response: {}", cleaned_response);
        }

        // Parse the JSON response
        let result: AnalysisResult = serde_json::from_str(&cleaned_response)
            .map_err(|e| LlmError::ParseError(format!("Failed to parse analysis result: {}. Raw response: {}", e, response)))?;

        Ok(result)
    }

    // ========== Phase 1: Relevance Analysis (always performed) ==========

    /// Analyze paper relevance based on abstract only
    pub async fn analyze_relevance(
        &self,
        title: &str,
        summary: &str,
        topics: &[TopicConfig],
        language: &str,
    ) -> Result<RelevanceResult, LlmError> {
        let prompt = self.build_relevance_prompt(title, summary, topics, language);
        let response = self.send_chat_request(&prompt, "relevance").await?;

        self.log_response_summary("analyze_relevance", &response, "relevance");

        // Clean the response (remove markdown code blocks)
        let cleaned_response = self.clean_response(&response);
        if response != cleaned_response {
            eprintln!("[LLM analyze_relevance] Cleaned markdown blocks from response");
        }

        // Parse the JSON response
        let result: RelevanceResult = serde_json::from_str(&cleaned_response)
            .map_err(|e| {
                eprintln!("[LLM analyze_relevance] JSON parse error: {}", e);
                eprintln!("[LLM analyze_relevance] Attempted to parse: {}", cleaned_response.chars().take(500).collect::<String>());
                LlmError::ParseError(format!("Failed to parse relevance result: {}", e))
            })?;

        Ok(result)
    }

    // ========== Phase 2: Deep Analysis (conditional) ==========

    /// Standard mode analysis: Introduction + Conclusion only
    pub async fn analyze_standard(
        &self,
        title: &str,
        summary: &str,
        topics: &[TopicConfig],
        latex_content: &str,
        language: &str,
    ) -> Result<StandardAnalysisResult, LlmError> {
        // Use latex_parser to extract intro and conclusion
        let intro_conclusion = crate::latex_parser::extract_intro_conclusion(latex_content);
        let prompt = self.build_standard_prompt(title, summary, topics, &intro_conclusion, language);
        let response = self.send_chat_request(&prompt, "standard").await?;

        self.log_response_summary("analyze_standard", &response, "standard");

        // Clean the response (remove markdown code blocks)
        let cleaned_response = self.clean_response(&response);
        if response != cleaned_response {
            eprintln!("[LLM analyze_standard] Cleaned markdown blocks from response");
        }

        // Fix common JSON formatting errors
        let fixed_response = self.fix_json_formatting(&cleaned_response);
        if cleaned_response != fixed_response {
            eprintln!("[LLM analyze_standard] Applied JSON formatting fixes");
        }

        // Parse the JSON response
        let result: StandardAnalysisResult = serde_json::from_str(&fixed_response)
            .map_err(|e| {
                eprintln!("[LLM analyze_standard] JSON parse error: {}", e);
                eprintln!("[LLM analyze_standard] Attempted to parse: {}", fixed_response.chars().take(1000).collect::<String>());
                LlmError::ParseError(format!("Failed to parse standard analysis result: {}", e))
            })?;

        Ok(result)
    }

    /// Full mode analysis: Full paper content
    pub async fn analyze_full(
        &self,
        title: &str,
        summary: &str,
        topics: &[TopicConfig],
        latex_content: &str,
        language: &str,
    ) -> Result<FullAnalysisResult, LlmError> {
        let prompt = self.build_full_prompt(title, summary, topics, latex_content, language);
        let response = self.send_chat_request(&prompt, "full").await?;

        self.log_response_summary("analyze_full", &response, "full");

        // Clean the response (remove markdown code blocks)
        let cleaned_response = self.clean_response(&response);
        if response != cleaned_response {
            eprintln!("[LLM analyze_full] Cleaned markdown blocks from response");
        }

        // Fix common JSON formatting errors
        let fixed_response = self.fix_json_formatting(&cleaned_response);
        if cleaned_response != fixed_response {
            eprintln!("[LLM analyze_full] Applied JSON formatting fixes");
        }

        // Parse the JSON response
        let result: FullAnalysisResult = serde_json::from_str(&fixed_response)
            .map_err(|e| {
                eprintln!("[LLM analyze_full] JSON parse error: {}", e);
                eprintln!("[LLM analyze_full] Attempted to parse: {}", fixed_response.chars().take(1000).collect::<String>());
                LlmError::ParseError(format!("Failed to parse full analysis result: {}", e))
            })?;

        Ok(result)
    }

    /// Build prompt for paper classification
    fn build_classification_prompt(&self, title: &str, summary: &str, topics: &[TopicConfig]) -> String {
        let topics_json = serde_json::to_string(topics).unwrap_or_default();

        format!(
            "You are an AI research paper classifier. Classify the following paper based on the user's research interests.\n\n\
            User Research Topics:\n{}\n\n\
            Paper Title:\n{}\n\n\
            Paper Abstract:\n{}\n\n\
            Instructions:\n\
            1. Analyze if this paper is relevant to the user's research interests.\n\
            2. Rate relevance on a scale of 0-100 (100 = highly relevant).\n\
            3. Provide a brief reason for your classification.\n\
            4. Suggest 3-5 tags describing the paper's key topics.\n\
            5. Suggest which of the user's topics this paper relates to.\n\n\
            Respond ONLY with a JSON object in this exact format:\n\
            {{\n\
              \"is_relevant\": true/false,\n\
              \"score\": 0-100,\n\
              \"reason\": \"brief explanation\",\n\
              \"suggested_tags\": [\"tag1\", \"tag2\", \"tag3\"],\n\
              \"suggested_topics\": [\"topic_name1\", \"topic_name2\"]\n\
            }}",
            topics_json, title, summary
        )
    }

    /// Build prompt for deep paper analysis
    /// If latex_content is provided, will include it for more detailed analysis
    fn build_analysis_prompt(&self, title: &str, summary: &str, topics: &[TopicConfig], latex_content: Option<&str>) -> String {
        let topics_json = serde_json::to_string(topics).unwrap_or_default();

        match latex_content {
            Some(latex) => {
                // Full analysis with LaTeX content
                format!(
                    "You are an AI research assistant. Analyze the following paper in depth with full LaTeX source.\n\n\
                    User Research Topics:\n{}\n\n\
                    Paper Title:\n{}\n\n\
                    Paper Abstract:\n{}\n\n\
                    LaTeX Source (first 10000 chars):\n{}\n\n\
                    Instructions:\n\
                    1. Provide a comprehensive 2-3 sentence summary of the paper.\n\
                    2. Extract 5-7 key insights or contributions from the full text.\n\
                    3. Identify detailed engineering insights, algorithms, and practical applications.\n\
                    4. Extract key formulas and algorithms described in the paper.\n\
                    5. Extract any GitHub links or code references mentioned.\n\
                    6. Suggest relevant tags for categorization.\n\
                    7. Suggest which of the user's topics this paper relates to.\n\
                    8. Rate the paper's relevance (0-100) and explain why.\n\n\
                    Respond ONLY with a JSON object in this exact format:\n\
                    {{\n\
                      \"ai_summary\": \"2-3 sentence comprehensive summary\",\n\
                      \"key_insights\": [\"insight1\", \"insight2\", \"insight3\", \"insight4\", \"insight5\"],\n\
                      \"engineering_notes\": \"detailed engineering insights, algorithms, formulas\",\n\
                      \"code_links\": [\"url1\", \"url2\"],\n\
                      \"suggested_tags\": [\"tag1\", \"tag2\", \"tag3\", \"tag4\"],\n\
                      \"suggested_topics\": [\"topic_name1\", \"topic_name2\"],\n\
                      \"filter_score\": 0-100,\n\
                      \"filter_reason\": \"explanation of relevance score\"\n\
                    }}",
                    topics_json, title, summary, latex.chars().take(10000).collect::<String>()
                )
            }
            None => {
                // Quick analysis without LaTeX
                format!(
                    "You are an AI research assistant. Analyze the following paper based on abstract.\n\n\
                    User Research Topics:\n{}\n\n\
                    Paper Title:\n{}\n\n\
                    Paper Abstract:\n{}\n\n\
                    Instructions:\n\
                    1. Provide a concise 2-3 sentence summary of the paper.\n\
                    2. Extract 3-5 key insights or contributions.\n\
                    3. Identify any engineering insights or practical applications.\n\
                    4. Extract any GitHub links or code references mentioned.\n\
                    5. Suggest relevant tags for categorization.\n\
                    6. Suggest which of the user's topics this paper relates to.\n\
                    7. Rate the paper's relevance (0-100) and explain why.\n\n\
                    Respond ONLY with a JSON object in this exact format:\n\
                    {{\n\
                      \"ai_summary\": \"2-3 sentence summary\",\n\
                      \"key_insights\": [\"insight1\", \"insight2\", \"insight3\"],\n\
                      \"engineering_notes\": \"engineering insights or null\",\n\
                      \"code_links\": [\"url1\", \"url2\"],\n\
                      \"suggested_tags\": [\"tag1\", \"tag2\", \"tag3\"],\n\
                      \"suggested_topics\": [\"topic_name1\", \"topic_name2\"],\n\
                      \"filter_score\": 0-100,\n\
                      \"filter_reason\": \"explanation of relevance score\"\n\
                    }}",
                    topics_json, title, summary
                )
            }
        }
    }

    // ========== New Prompt Builders for Two-Phase Architecture ==========

    /// Build prompt for Phase 1 relevance analysis
    fn build_relevance_prompt(&self, title: &str, summary: &str, topics: &[TopicConfig], language: &str) -> String {
        let topics_json = serde_json::to_string(topics).unwrap_or_default();
        let language_instruction = if language == "zh" {
            "\n\n===== LANGUAGE REQUIREMENTS =====\n\
            - Respond in Chinese (中文) for: reason (relevance explanation)\n\
            - Keep in ENGLISH for: suggested_tags, suggested_topics\n\
            - Reason field must be in Chinese, but tags/topics must remain in English"
        } else {
            ""
        };

        format!(
            "You are a research paper relevance classifier. Analyze if this paper matches the user's interests.{}\n\n\
            User Research Topics:\n{}\n\n\
            Paper Title:\n{}\n\n\
            Paper Abstract:\n{}\n\n\
            ===== OUTPUT FORMAT REQUIREMENTS =====\n\
            1. Respond ONLY with valid JSON - no markdown, no code blocks\n\
            2. Do NOT use line breaks inside JSON string values\n\
            3. Keep all text on ONE line\n\
            \n\
            ===== SCORING =====\n\
            Rate relevance on a scale of 0-100:\n\
            - 90-100: Perfect match - directly addresses user's research topics\n\
            - 70-89: Highly relevant - strongly related to user's interests\n\
            - 50-69: Moderately relevant - tangential connection\n\
            - 30-49: Somewhat relevant - weak connection\n\
            - 0-29: Not relevant - minimal or no connection\n\
            \n\
            ===== JSON FORMAT =====\n\
            {{{{\n\
              \"score\": 85,\n\
              \"reason\": \"Brief explanation of the relevance score (one line, no line breaks)\",\n\
              \"suggested_tags\": [\"tag1\", \"tag2\", \"tag3\", \"tag4\", \"tag5\"],\n\
              \"suggested_topics\": [\"topic1\", \"topic2\"]\n\
            }}}}",
            language_instruction, topics_json, title, summary
        )
    }

    /// Get max_tokens for different analysis types
    fn get_max_tokens(&self, analysis_type: &str) -> i32 {
        match analysis_type {
            "relevance" => 5000,      // Phase 1: Simple relevance check
            "standard" => 30000,      // Phase 2 Standard: Medium response with many fields
            "full" => 100000,         // Phase 2 Full: Long response with all fields including flowchart
            _ => 2000,                // Default fallback
        }
    }

    /// Log response summary instead of full content
    fn log_response_summary(&self, context: &str, response: &str, analysis_type: &str) {
        let response_len = response.len();

        match analysis_type {
            "full" => {
                // For full analysis, log summary and extract scores
                eprintln!("[LLM {}] ✓ Response received: {} chars", context, response_len);
                self.log_analysis_scores(context, response);
            }
            "standard" => {
                // For standard analysis, log summary and extract scores
                eprintln!("[LLM {}] ✓ Response received: {} chars", context, response_len);
                self.log_analysis_scores(context, response);
            }
            "relevance" => {
                // For relevance analysis, log full response (it's short)
                eprintln!("[LLM {}] Response: {}", context, response);
            }
            _ => {
                // Other types: log preview
                let preview = if response_len > 200 {
                    format!("{}... ({} chars total)", &response[..200], response_len)
                } else {
                    response.to_string()
                };
                eprintln!("[LLM {}] Response: {}", context, preview);
            }
        }
    }

    /// Extract and log analysis scores from JSON response
    fn log_analysis_scores(&self, context: &str, response: &str) {
        // Try to parse and extract key fields
        if let Ok(json) = serde_json::from_str::<serde_json::Value>(response) {
            if let Some(obj) = json.as_object() {
                let mut scores = Vec::new();

                if let Some(novelty) = obj.get("novelty_score").and_then(|v| v.as_i64()) {
                    scores.push(format!("novelty={}", novelty));
                }
                if let Some(effectiveness) = obj.get("effectiveness_score").and_then(|v| v.as_i64()) {
                    scores.push(format!("effectiveness={}", effectiveness));
                }
                if let Some(completeness) = obj.get("experiment_completeness_score").and_then(|v| v.as_i64()) {
                    scores.push(format!("completeness={}", completeness));
                }
                if let Some(code_available) = obj.get("code_available").and_then(|v| v.as_bool()) {
                    scores.push(format!("code={}", if code_available { "✓" } else { "✗" }));
                }
                if let Some(relevance) = obj.get("score").and_then(|v| v.as_i64()) {
                    scores.push(format!("relevance={}", relevance));
                }

                if !scores.is_empty() {
                    eprintln!("[LLM {}] Scores: {}", context, scores.join(", "));
                }

                // Log summary field if present
                if let Some(summary) = obj.get("ai_summary").and_then(|v| v.as_str()) {
                    let summary_preview = if summary.chars().count() > 100 {
                        format!("{}...", summary.chars().take(100).collect::<String>())
                    } else {
                        summary.to_string()
                    };
                    eprintln!("[LLM {}] Summary: {}", context, summary_preview);
                }
            }
        }
    }

    /// Build prompt for Phase 2 Standard mode analysis
    fn build_standard_prompt(&self, title: &str, summary: &str, topics: &[TopicConfig], latex: &str, language: &str) -> String {
        let topics_json = serde_json::to_string(topics).unwrap_or_default();
        let language_instruction = if language == "zh" {
            "\n\n===== LANGUAGE REQUIREMENTS =====\n\
            - Respond in Chinese (中文) for: ai_summary, key_insights, novelty_reason, effectiveness_reason, engineering_notes\n\
            - Keep in ENGLISH for: code_links (repo names, URLs), suggested_tags, suggested_topics\n\
            - Engineering notes: Describe in Chinese, but keep project/framework names in English (e.g., verl, vllm, tensorrt-llm)\n\
            - Tags and topics must be technical terms in English (e.g., \"reinforcement-learning\", \"LLM\", \"transformer\")"
        } else {
            ""
        };

        format!(
            "You are an engineering-focused research analyst. Analyze this paper's introduction and conclusion.{}\n\n\
            User Research Topics:\n{}\n\n\
            Paper Title:\n{}\n\n\
            Paper Abstract:\n{}\n\n\
            LaTeX Content (Introduction + Conclusion, truncated to 15000 chars):\n{}\n\n\
            ===== OUTPUT FORMAT REQUIREMENTS =====\n\
            1. Respond ONLY with valid JSON - no markdown, no code blocks\n\
            2. Do NOT use line breaks inside JSON string values\n\
            3. Use \\\\n for line breaks within text (e.g., \"Point 1\\\\nPoint 2\")\n\
            4. Keep all string values on ONE line\n\
            5. Ensure proper comma separation between array elements\n\
            \n\
            ===== ANALYSIS TASKS =====\n\
            1. Provide 2-3 sentence summary\n\
            2. Extract 5-7 key insights (each as separate array element)\n\
            3. Rate novelty (0-10): How original/new is this work?\n\
            4. Rate effectiveness (0-10): How well does it work?\n\
            5. Check for code availability (GitHub links, code mentions)\n\
            6. Provide detailed engineering notes for ENGINEERS who want to apply/contribute:\n\
               MUST include ALL of the following aspects:\n\
               - SPECIFIC open source projects (analyze the paper and identify relevant active projects)\n\
               - WHICH module to contribute to (e.g., scheduling module, attention kernel, data loader)\n\
               - HOW to contribute (e.g., add this algorithm as an option, integrate optimization)\n\
               - Implementation challenges (e.g., numerical stability, memory overhead, distributed sync)\n\
               - Production considerations (e.g., scalability, latency, resource requirements, monitoring)\n\
               \n\
               Reference examples by domain:\n\
               - RL: verl, slime, cleanrl, tianshou, ray/rllib, etc.\n\
               - LLM/inference: vllm, tensorrt-llm, text-generation-inference, sglang, etc.\n\
               - Training: deepspeed, megatron-lm, accelerate, fsdp, torchtitan, etc.\n\
               - Data: datasets, datatrove, hub, MosaicML streaming, etc.\n\
               \n\
               Think: What projects would benefit MOST from this research? Be specific.\n\
            7. Suggest tags and match to user's topics\n\
            \n\
            ===== JSON FORMAT (copy this structure) =====\n\
            {{{{\n\
              \"ai_summary\": \"Concise 2-3 sentence summary without line breaks\",\n\
              \"key_insights\": [\"Insight 1\", \"Insight 2\", \"Insight 3\", \"Insight 4\", \"Insight 5\"],\n\
              \"novelty_score\": 8,\n\
              \"novelty_reason\": \"Explanation of novelty score\",\n\
              \"effectiveness_score\": 7,\n\
              \"effectiveness_reason\": \"Explanation of effectiveness score\",\n\
              \"code_available\": false,\n\
              \"code_links\": [],\n\
              \"engineering_notes\": \"Target projects: Identify MOST relevant repos based on paper's domain. Module: Specify which component. How: Describe integration approach. Challenges: List technical hurdles. Production: Note deployment concerns. Example: 'Consider contributing to ray/rllib for multi-agent RL - add to algorithms/ directory as new policy class. Must handle async environments and policy sharing. Production: Consider worker failure recovery and policy versioning.' Use \\\\n for paragraphs.\",\n\
              \"suggested_tags\": [\"tag1\", \"tag2\", \"tag3\"],\n\
              \"suggested_topics\": [\"topic1\", \"topic2\"]\n\
            }}}}",
            language_instruction, topics_json, title, summary, latex.chars().take(15000).collect::<String>()
        )
    }

    /// Build prompt for Phase 2 Full mode analysis
    fn build_full_prompt(&self, title: &str, summary: &str, topics: &[TopicConfig], latex: &str, language: &str) -> String {
        let topics_json = serde_json::to_string(topics).unwrap_or_default();
        let language_instruction = if language == "zh" {
            "\n\n===== LANGUAGE REQUIREMENTS =====\n\
            - Respond in Chinese (中文) for: ai_summary, key_insights, novelty_reason, effectiveness_reason, experiment_completeness_reason, engineering_notes, time_complexity, space_complexity\n\
            - Keep in ENGLISH for: code_links (repo names, URLs), suggested_tags, suggested_topics\n\
            - Engineering notes: Describe in Chinese, but keep project/framework names in English (e.g., verl, vllm, tensorrt-llm)\n\
            - Complexity notation: Use LaTeX/O notation in English (e.g., O(n log n)), but explanation in Chinese\n\
            - Tags and topics must be technical terms in English (e.g., \"reinforcement-learning\", \"LLM\", \"transformer\")"
        } else {
            ""
        };

        format!(
            "You are an engineering-focused research analyst. Perform comprehensive full-paper analysis.{}\n\n\
            User Research Topics:\n{}\n\n\
            Paper Title:\n{}\n\n\
            Paper Abstract:\n{}\n\n\
            Full LaTeX Content:\n{}\n\n\
            ===== CRITICAL JSON FORMAT REQUIREMENTS =====\n\
            READ CAREFULLY: Your response MUST be valid JSON that can be parsed by serde_json.\n\
            \n\
            1. ABSOLUTELY NO line breaks inside JSON string values\n\
            2. NO markdown code blocks (```json or ```mermaid)\n\
            3. Use \\\\n for line breaks within strings\n\
            4. Every array element and object field must be on its own line\n\
            5. String values MUST be on ONE line only\n\
            6. Double-check commas between array elements\n\
            7. algorithm_flowchart: Provide PLAIN mermaid code WITHOUT any markdown wrappers\n\
            \n\
            ===== ANALYSIS TASKS =====\n\
            1. Provide 2-3 sentence summary\n\
            2. Extract 5-7 key insights (each insight on ONE line)\n\
            3. Rate novelty (0-10): How original/new?\n\
            4. Rate effectiveness (0-10): How well does it work?\n\
            5. Rate experiment completeness (0-10): Comprehensive evaluation?\n\
            6. Check for code availability\n\
            7. Describe algorithm flow as mermaid graph code (one line, no ``` wrapper)\n\
            8. Analyze time complexity (big-O notation)\n\
            9. Analyze space complexity (big-O notation)\n\
            10. Provide detailed engineering notes for ENGINEERS who want to apply/contribute:\n\
                MUST include ALL of the following aspects:\n\
                - SPECIFIC open source projects (analyze paper and identify relevant active projects)\n\
                - WHICH module to contribute to (e.g., scheduling module, attention kernel, data loader)\n\
                - HOW to contribute (e.g., add this algorithm as an option, integrate optimization)\n\
                - Implementation challenges (e.g., numerical stability, memory overhead, distributed sync)\n\
                - Production considerations (e.g., scalability, latency, resource requirements, monitoring)\n\
                \n\
                Reference examples by domain:\n\
                - RL: verl, slime, cleanrl, tianshou, ray/rllib, etc.\n\
                - LLM/inference: vllm, tensorrt-llm, text-generation-inference, sglang, etc.\n\
                - Training: deepspeed, megatron-lm, accelerate, fsdp, torchtitan, etc.\n\
                - Data: datasets, datatrove, hub, MosaicML streaming, etc.\n\
                \n\
                Think: What projects would benefit MOST from this research? Be specific.\n\
                - Use \\\\n to separate paragraphs\n\
            11. Suggest tags and match to user's topics\n\
            \n\
            ===== JSON FORMAT EXAMPLE =====\n\
            {{{{\n\
              \"ai_summary\": \"Two to three sentences summarizing the paper without any line breaks\",\n\
              \"key_insights\": [\n\
                \"First key insight from the paper\",\n\
                \"Second key insight\",\n\
                \"Third key insight\",\n\
                \"Fourth key insight\",\n\
                \"Fifth key insight\"\n\
              ],\n\
              \"novelty_score\": 8,\n\
              \"novelty_reason\": \"Explanation of why this score was given\",\n\
              \"effectiveness_score\": 7,\n\
              \"effectiveness_reason\": \"Explanation of effectiveness\",\n\
              \"experiment_completeness_score\": 9,\n\
              \"experiment_completeness_reason\": \"Evaluation comprehensiveness explanation\",\n\
              \"code_available\": true,\n\
              \"code_links\": [\"https://github.com/username/repo\"],\n\
              \"algorithm_flowchart\": \"graph TD\\\\nA[Input] --> B[Process]\\\\nB --> C[Output]\",\n\
              \"time_complexity\": \"O(n log n) explanation\",\n\
              \"space_complexity\": \"O(n) explanation\",\n\
              \"engineering_notes\": \"Target projects: Identify MOST relevant repos based on paper's domain. Module: Specify which component. How: Describe integration approach. Challenges: List technical hurdles. Production: Note deployment concerns. Example: 'For this LLM optimization, consider contributing to vllm - add to vllm/attention/ as new attention kernel. Must ensure compatibility with existing paged attention cache. Production: Consider CUDA kernel memory usage and multi-GPU scaling.' Use \\\\n for paragraphs.\",\n\
              \"suggested_tags\": [\"tag1\", \"tag2\", \"tag3\"],\n\
              \"suggested_topics\": [\"topic1\", \"topic2\"]\n\
            }}}}",
            language_instruction, topics_json, title, summary, latex
        )
    }

    /// Send chat request to the appropriate LLM API
    async fn send_chat_request(&self, prompt: &str, analysis_type: &str) -> Result<String, LlmError> {
        // Log prompt character count
        let prompt_chars = prompt.chars().count();
        let prompt_bytes = prompt.len();
        eprintln!("[LLM send_chat_request] Analysis type: {}, Prompt: {} chars, {} bytes", analysis_type, prompt_chars, prompt_bytes);

        match self.provider {
            LLMProvider::Glm => self.send_glm_request(prompt, analysis_type).await,
            LLMProvider::Claude => self.send_anthropic_request(prompt, analysis_type).await,
        }
    }

    /// Send request to GLM (ZhipuAI) API with retry support
    async fn send_glm_request(&self, prompt: &str, analysis_type: &str) -> Result<String, LlmError> {
        // If retry config is set, use retry executor
        if let Some(ref config) = self.retry_config {
            let executor = crate::retry::RetryExecutor::new(self.provider.clone(), config.clone());

            let client = self.client.clone();
            let api_key = self.api_key.clone();
            let quick_model = self.quick_model.clone();
            let deep_model = self.deep_model.clone();
            let prompt = prompt.to_string();
            let analysis_type = analysis_type.to_string();

            let operation = move || {
                let prompt = prompt.clone();
                let analysis_type = analysis_type.clone();
                let client = client.clone();
                let api_key = api_key.clone();
                let quick_model = quick_model.clone();
                let deep_model = deep_model.clone();

                Box::pin(async move {
                    // Create a temporary client to make the request
                    let temp_client = LlmClient {
                        client,
                        provider: LLMProvider::Glm,
                        api_key,
                        quick_model,
                        deep_model,
                        retry_config: None,
                    };
                    temp_client.send_glm_request_internal(&prompt, &analysis_type).await
                }) as Pin<Box<dyn std::future::Future<Output = Result<String, LlmError>> + Send>>
            };

            executor.execute(operation, "GLM API call").await
        } else {
            // No retry, execute directly
            self.send_glm_request_internal(prompt, analysis_type).await
        }
    }

    /// Send request to GLM (ZhipuAI) API (internal implementation)
    async fn send_glm_request_internal(&self, prompt: &str, analysis_type: &str) -> Result<String, LlmError> {
        // Use quick model for relevance, deep model for standard/full analysis
        let model = if analysis_type == "relevance" {
            &self.quick_model
        } else {
            &self.deep_model
        };

        // Get max_tokens based on analysis type
        let max_tokens = self.get_max_tokens(analysis_type);

        println!("[LLM send_glm_request] Using model: {}, analysis_type: {}, max_tokens: {}",
            model, analysis_type, max_tokens);

        let request = GlmRequest {
            model: model.to_string(),
            messages: vec![ChatMessage {
                role: "user".to_string(),
                content: prompt.to_string(),
            }],
            temperature: 0.3,
            max_tokens,
        };

        let response = self
            .client
            .post("https://open.bigmodel.cn/api/paas/v4/chat/completions")
            .header("Authorization", format!("Bearer {}", self.api_key))
            .json(&request)
            .send()
            .await?;

        let status = response.status();
        eprintln!("[LLM send_glm_request] API response status: {}", status);

        // Get the response text
        let response_text = response.text().await.unwrap_or_default();

        if !status.is_success() {
            eprintln!("[LLM send_glm_request] API error: {}", response_text);
            return Err(LlmError::ApiError(format!(
                "GLM API error ({}): {}",
                status,
                response_text
            )));
        }

        // Check if response is empty
        if response_text.trim().is_empty() {
            return Err(LlmError::ApiError(
                "GLM API returned empty response. Check your API key balance and quota.".to_string()
            ));
        }

        // Try to parse as JSON
        let glm_response: GlmResponse = serde_json::from_str(&response_text)
            .map_err(|e| LlmError::ApiError(format!(
                "Failed to parse GLM response as JSON: {}. Raw response: {}",
                e, response_text
            )))?;

        println!("[LLM send_glm_request] Received response with {} choices", glm_response.choices.len());

        if glm_response.choices.is_empty() {
            return Err(LlmError::ApiError(format!(
                "GLM API returned no choices. Raw response: {}",
                response_text
            )));
        }

        let content = glm_response.choices[0].message.content.trim();
        if content.is_empty() {
            return Err(LlmError::ApiError(
                "GLM API returned empty message content. The model may have refused to respond or encountered an error.".to_string()
            ));
        }

        println!("[LLM send_glm_request] Response content: {}", content);
        Ok(content.to_string())
    }

    /// Send request to Anthropic Claude API with retry support
    async fn send_anthropic_request(&self, prompt: &str, analysis_type: &str) -> Result<String, LlmError> {
        // If retry config is set, use retry executor
        if let Some(ref config) = self.retry_config {
            let executor = crate::retry::RetryExecutor::new(self.provider.clone(), config.clone());

            let client = self.client.clone();
            let api_key = self.api_key.clone();
            let quick_model = self.quick_model.clone();
            let deep_model = self.deep_model.clone();
            let prompt = prompt.to_string();
            let analysis_type = analysis_type.to_string();

            let operation = move || {
                let prompt = prompt.clone();
                let analysis_type = analysis_type.clone();
                let client = client.clone();
                let api_key = api_key.clone();
                let quick_model = quick_model.clone();
                let deep_model = deep_model.clone();

                Box::pin(async move {
                    // Create a temporary client to make the request
                    let temp_client = LlmClient {
                        client,
                        provider: LLMProvider::Claude,
                        api_key,
                        quick_model,
                        deep_model,
                        retry_config: None,
                    };
                    temp_client.send_anthropic_request_internal(&prompt, &analysis_type).await
                }) as Pin<Box<dyn std::future::Future<Output = Result<String, LlmError>> + Send>>
            };

            executor.execute(operation, "Claude API call").await
        } else {
            // No retry, execute directly
            self.send_anthropic_request_internal(prompt, analysis_type).await
        }
    }

    /// Send request to Anthropic Claude API (internal implementation)
    async fn send_anthropic_request_internal(&self, prompt: &str, analysis_type: &str) -> Result<String, LlmError> {
        // Use quick model for relevance, deep model for standard/full analysis
        let model = if analysis_type == "relevance" {
            &self.quick_model
        } else {
            &self.deep_model
        };

        // Get max_tokens based on analysis type
        let max_tokens = self.get_max_tokens(analysis_type);

        let request = AnthropicRequest {
            model: model.to_string(),
            messages: vec![ChatMessage {
                role: "user".to_string(),
                content: prompt.to_string(),
            }],
            max_tokens,
            temperature: 0.3,
        };

        let response = self
            .client
            .post("https://api.anthropic.com/v1/messages")
            .header("x-api-key", &self.api_key)
            .header("anthropic-version", "2023-06-01")
            .header("content-type", "application/json")
            .json(&request)
            .send()
            .await?;

        let status = response.status();
        if !status.is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(LlmError::ApiError(format!(
                "Claude API error ({}): {}",
                status,
                error_text
            )));
        }

        let anthropic_response: AnthropicResponse = response.json().await?;

        anthropic_response
            .content
            .first()
            .map(|c| c.text.clone())
            .ok_or_else(|| LlmError::ApiError("No response content from Claude".to_string()))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_classification_prompt_format() {
        let topics = vec![
            TopicConfig {
                key: "1".to_string(),
                label: "Machine Learning".to_string(),
                description: "ML topics".to_string(),
                keywords: Some(vec!["neural networks".to_string(), "deep learning".to_string()]),
                color: "#FF5733".to_string(),
                arxiv_categories: None,
                max_papers_per_day: None,
                deep_analysis_count: None,
                quick_score_threshold: None,
            },
        ];

        let client = LlmClient {
            client: Client::new(),
            provider: LLMProvider::Glm,
            api_key: "test-key".to_string(),
            quick_model: "glm-4-flash".to_string(),
            deep_model: "glm-4-plus".to_string(),
            retry_config: None,
        };

        let prompt = client.build_classification_prompt(
            "Test Paper",
            "This is a test abstract about neural networks.",
            &topics,
        );

        assert!(prompt.contains("Test Paper"));
        assert!(prompt.contains("neural networks"));
        assert!(prompt.contains("is_relevant"));
    }

    #[test]
    fn test_llm_client_no_key() {
        let result = LlmClient::new(LLMProvider::Glm, "".to_string(), None, None);
        assert!(matches!(result, Err(LlmError::NoApiKey)));
    }

    #[test]
    fn test_parse_classification_result() {
        let json = r#"{
            "is_relevant": true,
            "score": 85,
            "reason": "Paper directly addresses neural networks",
            "suggested_tags": ["deep learning", "neural networks", "computer vision"],
            "suggested_topics": ["Machine Learning"]
        }"#;

        let result: Result<ClassificationResult, _> = serde_json::from_str(json);
        assert!(result.is_ok());
        let parsed = result.unwrap();
        assert_eq!(parsed.score, 85);
        assert!(parsed.is_relevant);
        assert_eq!(parsed.suggested_tags.len(), 3);
    }
}
