//! Modular analysis system for papers
//! Each analysis block can be enabled/disabled by users

pub mod blocks;
pub mod prompt;
pub mod registry;

use serde::{Deserialize, Serialize};
use crate::models::TopicConfig;

/// Analysis depth mode (formerly standard/full)
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Hash)]
#[serde(rename_all = "lowercase")]
pub enum AnalysisDepth {
    Quick,   // Formerly "standard" - intro + conclusion only
    Full,    // Full paper analysis
}

impl AnalysisDepth {
    pub fn as_str(&self) -> &'static str {
        match self {
            AnalysisDepth::Quick => "quick",
            AnalysisDepth::Full => "full",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "quick" | "standard" => Some(AnalysisDepth::Quick),
            "full" => Some(AnalysisDepth::Full),
            _ => None,
        }
    }
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
pub struct AnalysisBlockConfig {
    pub id: String,
    pub name: I18nText,
    pub description: I18nText,
    pub category: BlockCategory,
    pub default_enabled: bool,
    pub supported_modes: Vec<AnalysisDepth>,
    pub default_mode: AnalysisDepth,
    pub order: usize,
    pub depends_on: Option<Vec<String>>,
    pub output_schema: OutputSchema,
}

/// User's configuration for a block
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserBlockConfig {
    pub block_id: String,
    pub enabled: bool,
    pub mode: AnalysisDepth,
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

/// Get default block configurations (migrated from current behavior)
fn get_default_block_configs() -> Vec<UserBlockConfig> {
    // Current Standard mode (quick) enabled blocks
    // Current Full mode enabled blocks
    vec![
        // Basic - always enabled
        UserBlockConfig {
            block_id: "ai_summary".to_string(),
            enabled: true,
            mode: AnalysisDepth::Quick,
        },
        UserBlockConfig {
            block_id: "topics".to_string(),
            enabled: true,
            mode: AnalysisDepth::Quick,
        },
        // Core - standard mode
        UserBlockConfig {
            block_id: "key_insights".to_string(),
            enabled: true,
            mode: AnalysisDepth::Quick,
        },
        UserBlockConfig {
            block_id: "quality_assessment".to_string(),
            enabled: true,
            mode: AnalysisDepth::Quick,
        },
        UserBlockConfig {
            block_id: "code_links".to_string(),
            enabled: true,
            mode: AnalysisDepth::Quick,
        },
        UserBlockConfig {
            block_id: "engineering_notes".to_string(),
            enabled: true,
            mode: AnalysisDepth::Quick,
        },
        // Technical - full mode only
        UserBlockConfig {
            block_id: "algorithms".to_string(),
            enabled: false,  // Only in full mode by default
            mode: AnalysisDepth::Full,
        },
        UserBlockConfig {
            block_id: "complexity".to_string(),
            enabled: false,
            mode: AnalysisDepth::Full,
        },
        UserBlockConfig {
            block_id: "flowchart".to_string(),
            enabled: false,
            mode: AnalysisDepth::Full,
        },
        UserBlockConfig {
            block_id: "formulas".to_string(),
            enabled: false,
            mode: AnalysisDepth::Full,
        },
        // New module
        UserBlockConfig {
            block_id: "related_papers".to_string(),
            enabled: true,
            mode: AnalysisDepth::Quick,
        },
    ]
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
        assert_eq!(AnalysisDepth::Quick.as_str(), "quick");
        assert_eq!(AnalysisDepth::Full.as_str(), "full");
        assert_eq!(AnalysisDepth::from_str("quick"), Some(AnalysisDepth::Quick));
        assert_eq!(AnalysisDepth::from_str("standard"), Some(AnalysisDepth::Quick));
    }
}
