//! Modular analysis system for papers
//! Each analysis block can be enabled/disabled by users

pub mod blocks;
pub mod prompt;
pub mod registry;

use serde::{Deserialize, Serialize};
use crate::models::TopicConfig;

/// Analysis depth mode (standard/full)
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Hash)]
#[serde(rename_all = "lowercase")]
pub enum AnalysisDepth {
    Standard,   // Standard mode - intro + conclusion only
    Full,       // Full mode - complete paper analysis
}

impl AnalysisDepth {
    pub fn as_str(&self) -> &'static str {
        match self {
            AnalysisDepth::Standard => "standard",
            AnalysisDepth::Full => "full",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "standard" => Some(AnalysisDepth::Standard),
            "full" => Some(AnalysisDepth::Full),
            _ => None,
        }
    }
}

/// Block mode - when should a block run
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Hash)]
#[serde(rename_all = "lowercase")]
pub enum BlockRunMode {
    Standard,   // Only run in standard analysis
    Full,       // Only run in full analysis
    Both,       // Run in both standard and full analysis
}

/// Block category for UI grouping
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Hash)]
#[serde(rename_all = "lowercase")]
pub enum BlockCategory {
    Basic,       // Always enabled (ai_summary, topics)
    Core,        // Main analysis outputs
    Technical,   // In-depth technical analysis
    Engineering, // Implementation details
}

/// Output schema type for a block
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Hash)]
#[serde(rename_all = "snake_case")]
pub enum OutputSchema {
    SingleString,              // ai_summary
    StringArray,               // key_insights, topics
    StructuredQuality,         // quality_assessment
    AlgorithmList,             // algorithms
    FormulaList,               // key_formulas
    Flowchart,                 // algorithm_flowchart
    PaperReferenceList,        // related_papers
    CodeLinks,                 // code_links
}

/// Internationalized text
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct I18nText {
    pub en: String,
    pub zh: String,
}

impl I18nText {
    pub fn get(&self, lang: &str) -> &str {
        match lang {
            "zh" => &self.zh,
            _ => &self.en,
        }
    }
}

/// Configuration for a single analysis block
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AnalysisBlockConfig {
    pub id: String,
    pub name: I18nText,
    pub description: I18nText,
    pub category: BlockCategory,
    pub default_enabled: bool,
    pub supported_modes: Vec<AnalysisDepth>,
    pub default_mode: BlockRunMode,
    pub order: usize,
    pub depends_on: Option<Vec<String>>,
    pub output_schema: OutputSchema,
}

/// User's configuration for a block
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UserBlockConfig {
    pub block_id: String,
    pub enabled: bool,
    pub mode: BlockRunMode,
}

/// Complete user analysis configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserAnalysisConfig {
    pub blocks: Vec<UserBlockConfig>,
}

impl Default for UserAnalysisConfig {
    fn default() -> Self {
        Self {
            blocks: get_default_block_configs(),
        }
    }
}

/// Get default block configurations from registered blocks
fn get_default_block_configs() -> Vec<UserBlockConfig> {
    use crate::analysis::registry::REGISTRY;

    REGISTRY
        .get_all()
        .into_iter()
        .map(|block| UserBlockConfig {
            block_id: block.id.clone(),
            enabled: block.default_enabled,
            mode: block.default_mode,
        })
        .collect()
}

/// Build analysis prompt based on enabled blocks
pub fn build_analysis_prompt(
    title: &str,
    summary: &str,
    topics: &[TopicConfig],
    latex_content: Option<&str>,
    language: &str,
    user_config: &UserAnalysisConfig,
    depth: AnalysisDepth,
) -> String {
    prompt::build_prompt(title, summary, topics, latex_content, language, user_config, depth)
}

/// Ensure basic blocks (ai_summary, topics) always have mode=Both
pub fn fix_basic_blocks_mode(config: UserAnalysisConfig) -> UserAnalysisConfig {
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

    UserAnalysisConfig { blocks }
}

/// Check if a block ID is a basic block
pub fn is_basic_block(block_id: &str) -> bool {
    matches!(block_id, "ai_summary" | "topics")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_config() {
        let config = UserAnalysisConfig::default();
        assert!(!config.blocks.is_empty());
        assert!(config.blocks.iter().any(|b| b.block_id == "ai_summary"));
    }

    #[test]
    fn test_analysis_depth_conversion() {
        assert_eq!(AnalysisDepth::Standard.as_str(), "standard");
        assert_eq!(AnalysisDepth::Full.as_str(), "full");
        assert_eq!(AnalysisDepth::from_str("standard"), Some(AnalysisDepth::Standard));
        assert_eq!(AnalysisDepth::from_str("full"), Some(AnalysisDepth::Full));
    }
}
