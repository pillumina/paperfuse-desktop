//! Dynamic prompt building based on enabled analysis blocks
//! Maintains compatibility with existing prompt logic

use crate::analysis::{AnalysisDepth, UserAnalysisConfig, BlockCategory, AnalysisBlockConfig};
use crate::analysis::blocks::get_all_blocks;
use crate::models::TopicConfig;

/// Build analysis prompt based on enabled blocks (maintains current prompt behavior)
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

    // Check if we should use standard (quick) or full prompt
    let has_full_only_blocks = enabled_blocks.iter().any(|b| {
        matches!(b.category, BlockCategory::Technical)
    });

    match depth {
        AnalysisDepth::Quick if !has_full_only_blocks => {
            build_standard_prompt(title, summary, topics, latex_content, language, &enabled_blocks)
        }
        _ => {
            build_full_prompt(title, summary, topics, latex_content, language, &enabled_blocks)
        }
    }
}

/// Get blocks enabled for a specific depth
fn get_enabled_blocks(config: &UserAnalysisConfig, depth: AnalysisDepth) -> Vec<AnalysisBlockConfig> {
    let all_blocks = get_all_blocks();
    let enabled_map: std::collections::HashMap<String, &crate::analysis::UserBlockConfig> = config
        .blocks
        .iter()
        .map(|c| (c.block_id.clone(), c))
        .collect();

    all_blocks
        .into_iter()
        .filter(|block| {
            // Basic blocks are always enabled
            if matches!(block.category, BlockCategory::Basic) {
                return true;
            }

            // Check user config
            if let Some(user_cfg) = enabled_map.get(&block.id) {
                return user_cfg.enabled &&
                       (user_cfg.mode == depth || block.supported_modes.contains(&depth));
            }

            // Use default
            block.default_enabled && block.supported_modes.contains(&depth)
        })
        .collect()
}

/// Build standard (quick) mode prompt - identical to current build_standard_prompt
fn build_standard_prompt(
    title: &str,
    summary: &str,
    topics: &[TopicConfig],
    latex_content: Option<&str>,
    language: &str,
    _enabled_blocks: &[AnalysisBlockConfig],
) -> String {
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

    // Extract intro/conclusion for standard mode
    let latex = if let Some(content) = latex_content {
        crate::latex_parser::extract_intro_conclusion(content)
    } else {
        String::new()
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

/// Build full mode prompt - identical to current build_full_prompt
fn build_full_prompt(
    title: &str,
    summary: &str,
    topics: &[TopicConfig],
    latex_content: Option<&str>,
    language: &str,
    _enabled_blocks: &[AnalysisBlockConfig],
) -> String {
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

    let latex = latex_content.unwrap_or("");

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
