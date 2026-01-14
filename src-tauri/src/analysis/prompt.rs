//! Dynamic modular prompt building based on enabled analysis blocks
//! Each block contributes its own instructions and output schema

use crate::analysis::{AnalysisDepth, UserAnalysisConfig, AnalysisBlockConfig, BlockRunMode, OutputSchema};
use crate::models::TopicConfig;

/// Build analysis prompt based on enabled blocks (modular implementation)
pub fn build_prompt(
    title: &str,
    summary: &str,
    topics: &[TopicConfig],
    latex_content: Option<&str>,
    language: &str,
    user_config: &UserAnalysisConfig,
    depth: AnalysisDepth,
) -> String {
    // Get enabled blocks for this depth
    let enabled_blocks = get_enabled_blocks(user_config, depth);

    // Build the prompt
    build_modular_prompt(title, summary, topics, latex_content, language, &enabled_blocks, depth)
}

/// Get blocks enabled for a specific depth based on user config
fn get_enabled_blocks(config: &UserAnalysisConfig, depth: AnalysisDepth) -> Vec<AnalysisBlockConfig> {
    let all_blocks = crate::analysis::blocks::get_all_blocks();
    let enabled_map: std::collections::HashMap<String, &crate::analysis::UserBlockConfig> = config
        .blocks
        .iter()
        .map(|c| (c.block_id.clone(), c))
        .collect();

    eprintln!("[get_enabled_blocks] Total blocks: {}, depth: {:?}", all_blocks.len(), depth);
    eprintln!("[get_enabled_blocks] User config has {} blocks", config.blocks.len());

    let enabled: Vec<AnalysisBlockConfig> = all_blocks
        .into_iter()
        .filter(|block| {
            // Check user config
            if let Some(user_cfg) = enabled_map.get(&block.id) {
                if !user_cfg.enabled {
                    eprintln!("[get_enabled_blocks] Block '{}' DISABLED by user config", block.id);
                    return false;
                }
                let should_run = match user_cfg.mode {
                    BlockRunMode::Standard => depth == AnalysisDepth::Standard,
                    BlockRunMode::Full => depth == AnalysisDepth::Full,
                    BlockRunMode::Both => true,
                };
                eprintln!("[get_enabled_blocks] Block '{}' user config: enabled={}, mode={:?}, should_run={}",
                    block.id, user_cfg.enabled, user_cfg.mode, should_run);
                return should_run;
            }

            // Use default from block definition
            if !block.default_enabled {
                eprintln!("[get_enabled_blocks] Block '{}' DISABLED by default", block.id);
                return false;
            }
            let should_run = match block.default_mode {
                BlockRunMode::Standard => depth == AnalysisDepth::Standard,
                BlockRunMode::Full => depth == AnalysisDepth::Full,
                BlockRunMode::Both => true,
            };
            eprintln!("[get_enabled_blocks] Block '{}' using default: default_enabled={}, default_mode={:?}, should_run={}",
                block.id, block.default_enabled, block.default_mode, should_run);
            should_run
        })
        .collect();

    eprintln!("[get_enabled_blocks] Final enabled blocks ({}): {:?}", enabled.len(),
        enabled.iter().map(|b| b.id.as_str()).collect::<Vec<_>>());
    enabled
}

/// Build modular prompt from enabled blocks
fn build_modular_prompt(
    title: &str,
    summary: &str,
    topics: &[TopicConfig],
    latex_content: Option<&str>,
    language: &str,
    enabled_blocks: &[AnalysisBlockConfig],
    depth: AnalysisDepth,
) -> String {
    let topics_json = serde_json::to_string(topics).unwrap_or_default();

    // Language instruction
    let language_instruction = build_language_instruction(language, enabled_blocks, depth);

    // Content section
    let content_section = build_content_section(latex_content, depth);

    // Analysis tasks from enabled blocks
    let tasks_section = build_tasks_section(enabled_blocks);

    // JSON schema from enabled blocks
    let json_schema = build_json_schema(enabled_blocks);

    format!(
        "You are an engineering-focused research analyst. Perform {} analysis.{}\n\n\
        User Research Topics:\n{}\n\n\
        Paper Title:\n{}\n\n\
        Paper Abstract:\n{}\n\n\
        {}\n\n\
        ===== OUTPUT FORMAT REQUIREMENTS =====\n\
        1. Respond ONLY with valid JSON - no markdown, no code blocks\n\
        2. Do NOT use line breaks inside JSON string values\n\
        3. Use \\\\n for line breaks within text (e.g., \"Point 1\\\\nPoint 2\")\n\
        4. Keep all string values on ONE line\n\
        5. Ensure proper comma separation between array elements\n\
        {}\n\n\
        ===== ANALYSIS TASKS =====\n\
        {}\n\n\
        ===== JSON FORMAT =====\n\
        {{{{\n{}
}}}}",
        depth.as_str(),
        language_instruction,
        topics_json,
        title,
        summary,
        content_section,
        build_format_requirements(enabled_blocks, depth),
        tasks_section,
        json_schema
    )
}

/// Build language instruction based on enabled blocks
fn build_language_instruction(language: &str, blocks: &[AnalysisBlockConfig], depth: AnalysisDepth) -> String {
    if language != "zh" {
        return String::new();
    }

    let has_complexity = blocks.iter().any(|b| b.id == "complexity");
    let has_algorithms = blocks.iter().any(|b| b.id == "algorithms");
    let has_formulas = blocks.iter().any(|b| b.id == "formulas");
    let has_related_papers = blocks.iter().any(|b| b.id == "related_papers");
    let has_experiments = depth == AnalysisDepth::Full && blocks.iter().any(|b| b.id == "quality_assessment");

    let mut additional_requirements = String::new();

    if has_complexity {
        additional_requirements.push_str("- **Complexity analysis**: Provide big-O notation in English (e.g., O(n log n)), but explain the meaning in Chinese\n");
    }
    if has_algorithms {
        additional_requirements.push_str("- **Algorithms**: Algorithm names and step descriptions in Chinese, but complexity notation in English (e.g., O(n log n))\n");
    }
    if has_formulas {
        additional_requirements.push_str("- **Formulas**: Formula names and explanations in Chinese, LaTeX notation can stay in English\n");
    }
    if has_related_papers {
        additional_requirements.push_str("- **Related papers**: Keep paper titles in English (original titles), relationship types in English as specified in schema, and reasons in Chinese\n");
    }

    format!(
        "\n\n===== LANGUAGE REQUIREMENTS =====\n\
        - Respond in Chinese (中文) for: ai_summary, key_insights, novelty_reason, effectiveness_reason{}engineering_notes\n\
        - Keep in ENGLISH for: code_links (repo names, URLs), suggested_tags, suggested_topics\n\
        - Engineering notes: Describe in Chinese, but keep project/framework names in English (e.g., verl, vllm, tensorrt-llm)\n\
        {}\
        - Tags and topics must be technical terms in English (e.g., \"reinforcement-learning\", \"LLM\", \"transformer\")",
        if has_experiments { ", experiment_completeness_reason" } else { "" },
        if additional_requirements.is_empty() { String::new() } else { format!("\n{}", additional_requirements) }
    )
}

/// Build content section based on depth
fn build_content_section(latex_content: Option<&str>, depth: AnalysisDepth) -> String {
    match (depth, latex_content) {
        (AnalysisDepth::Standard, Some(latex)) => {
            let intro = crate::latex_parser::extract_intro_conclusion(latex);
            format!(
                "LaTeX Content (Introduction + Conclusion, truncated to 15000 chars):\n{}",
                intro.chars().take(15000).collect::<String>()
            )
        }
        (AnalysisDepth::Standard, None) => {
            "LaTeX Content: Not available - using abstract only".to_string()
        }
        (AnalysisDepth::Full, Some(latex)) => {
            format!("Full LaTeX Content:\n{}", latex)
        }
        (AnalysisDepth::Full, None) => {
            "LaTeX Content: Not available - using abstract only".to_string()
        }
    }
}

/// Build format requirements for specific blocks
fn build_format_requirements(blocks: &[AnalysisBlockConfig], depth: AnalysisDepth) -> String {
    let has_flowchart = blocks.iter().any(|b| b.id == "flowchart");
    let is_full = depth == AnalysisDepth::Full;

    let mut requirements = String::new();

    if is_full {
        requirements.push_str("6. Double-check commas between array elements\n");
        if has_flowchart {
            requirements.push_str("7. algorithm_flowchart: Provide PLAIN mermaid code WITHOUT any markdown wrappers\n");
        }
    }

    requirements
}

/// Build analysis tasks section from enabled blocks
fn build_tasks_section(blocks: &[AnalysisBlockConfig]) -> String {
    let mut tasks = Vec::new();
    let mut task_num = 1;

    // Sort blocks by order
    let mut sorted_blocks = blocks.to_vec();
    sorted_blocks.sort_by_key(|b| b.order);

    for block in &sorted_blocks {
        let task = get_block_task_instruction(block);
        if !task.is_empty() {
            tasks.push(format!("{}. {}", task_num, task));
            task_num += 1;
        }
    }

    tasks.join("\n")
}

/// Get task instruction for a specific block
fn get_block_task_instruction(block: &AnalysisBlockConfig) -> &'static str {
    match block.id.as_str() {
        "ai_summary" => "Provide 2-3 sentence summary of the paper's core contributions",
        "topics" => "Suggest relevant tags and match the paper to user's research topics",
        "key_insights" => "Extract 5-7 key insights or contributions from the paper (each as a separate array element)",
        "quality_assessment" => {
            if block.supported_modes.contains(&crate::analysis::AnalysisDepth::Full) {
                "Rate the paper on three dimensions (0-10 scale): novelty (how original/new), effectiveness (how well it works), and experiment completeness (comprehensive evaluation)"
            } else {
                "Rate the paper on two dimensions (0-10 scale): novelty (how original/new) and effectiveness (how well it works)"
            }
        }
        "code_links" => "Check for code availability: extract GitHub links, code repository mentions, and official implementation references",
        "engineering_notes" => {
            "Provide detailed engineering notes for ENGINEERS who want to apply/contribute:\n\
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
             Use \\\\n to separate paragraphs."
        }
        "related_papers" => {
            "Identify related papers mentioned in the paper content:\n\
             - Look for papers mentioned in the introduction, related work section, or throughout the text\n\
             - Focus on foundational work, competing methods, or papers being built upon\n\
             - DO NOT fabricate or guess arXiv IDs - only use IDs explicitly mentioned in the text\n\
             - If arXiv ID is not mentioned in the paper, set arXiv ID to \"UNKNOWN\"\n\
             - Maximum 3-5 most relevant papers\n\
             For each related paper: arXiv ID (or \"UNKNOWN\"), exact title as mentioned, relationship type, relevance score (0-10), and brief reason"
        }
        "algorithms" => "Extract key algorithms presented in the paper: for each algorithm, provide the name, a step-by-step description, and computational complexity if specified",
        "complexity" => "Analyze computational complexity: provide time complexity (big-O notation for runtime) and space complexity (memory usage) with explanations",
        "flowchart" => "Generate a Mermaid flowchart diagram showing the algorithm's workflow: use nodes for steps, arrows for data flow, and keep it on one line without markdown wrappers",
        "formulas" => "Extract important mathematical formulas from the paper: provide each formula in LaTeX notation with a descriptive name and explanation",
        _ => "",
    }
}

/// Build JSON schema from enabled blocks
fn build_json_schema(blocks: &[AnalysisBlockConfig]) -> String {
    let mut schema_parts = Vec::new();
    let mut sorted_blocks = blocks.to_vec();
    sorted_blocks.sort_by_key(|b| b.order);

    eprintln!("[build_json_schema] Building schema for {} blocks", blocks.len());

    for block in &sorted_blocks {
        let schema = get_block_json_schema(block);
        if !schema.is_empty() {
            eprintln!("[build_json_schema] Adding schema for block '{}': {}", block.id,
                schema.lines().take(1).collect::<String>());
            schema_parts.push(schema);
        } else {
            eprintln!("[build_json_schema] Block '{}' returned empty schema", block.id);
        }
    }

    let result = schema_parts.join(",\n  ");
    eprintln!("[build_json_schema] Final schema fields: {}",
        result.lines().filter(|l| l.contains(':')).map(|l| l.split(':').next().unwrap_or("")).collect::<Vec<_>>().join(", "));
    result
}

/// Get JSON schema for a specific block
fn get_block_json_schema(block: &AnalysisBlockConfig) -> String {
    match block.output_schema {
        OutputSchema::SingleString => {
            match block.id.as_str() {
                "ai_summary" => r#""ai_summary": "Concise 2-3 sentence summary without line breaks""#,
                "engineering_notes" => r#""engineering_notes": "Target projects: Identify MOST relevant repos based on paper's domain. Module: Specify which component. How: Describe integration approach. Challenges: List technical hurdles. Production: Note deployment concerns. Use \\\\n for paragraphs.""#,
                "complexity" => r#""time_complexity": "O(n log n) with explanation",
  "space_complexity": "O(n) with explanation""#,
                _ => "",
            }
        }
        OutputSchema::StringArray => {
            match block.id.as_str() {
                "topics" => r#""suggested_tags": ["tag1", "tag2", "tag3"],
  "suggested_topics": ["topic1", "topic2"]"#,
                "key_insights" => r#""key_insights": [
    "First key insight from the paper",
    "Second key insight",
    "Third key insight",
    "Fourth key insight",
    "Fifth key insight"
  ]"#,
                _ => "",
            }
        }
        OutputSchema::StructuredQuality => {
            // Check if full mode (has experiment completeness)
            if block.supported_modes.contains(&crate::analysis::AnalysisDepth::Full) {
                r#""novelty_score": 8,
  "novelty_reason": "Explanation of why this score was given",
  "effectiveness_score": 7,
  "effectiveness_reason": "Explanation of effectiveness",
  "experiment_completeness_score": 9,
  "experiment_completeness_reason": "Evaluation comprehensiveness explanation""#
            } else {
                r#""novelty_score": 8,
  "novelty_reason": "Explanation of why this score was given",
  "effectiveness_score": 7,
  "effectiveness_reason": "Explanation of effectiveness""#
            }
        }
        OutputSchema::CodeLinks => {
            r#""code_available": true,
  "code_links": ["https://github.com/username/repo"]"#
        }
        OutputSchema::Flowchart => {
            r#""algorithm_flowchart": "graph TD\\\\nA[Input] --> B[Process]\\\\nB --> C[Output]""#
        }
        OutputSchema::FormulaList => {
            r#""key_formulas": [
    {
      "latex": "E = mc^2",
      "name": "Mass-energy equivalence",
      "description": "Relationship between energy and mass"
    }
  ]"#
        }
        OutputSchema::PaperReferenceList => {
            r#""related_papers": [
    {
      "arxivId": "2301.12345",
      "title": "Related Paper Title",
      "relationship": "builds_on",
      "relevanceScore": 8,
      "reason": "This paper extends the method proposed in the cited work"
    }
  ]"#
        }
        OutputSchema::AlgorithmList => {
            r#""algorithms": [
    {
      "name": "Algorithm Name",
      "steps": ["Step 1 description", "Step 2 description", "Step 3 description"],
      "complexity": "O(n log n)"
    }
  ]"#
        }
    }.to_string()
}
