//! Analysis block definitions
//! Each block represents a separable unit of paper analysis

use crate::analysis::{BlockCategory, AnalysisDepth, BlockRunMode, OutputSchema, I18nText, AnalysisBlockConfig};

// ============================================================================
// Basic Modules (Always Enabled)
// ============================================================================

/// AI Summary block - core paper summary
pub fn ai_summary_block() -> AnalysisBlockConfig {
    AnalysisBlockConfig {
        id: "ai_summary".to_string(),
        name: I18nText {
            en: "AI Summary".to_string(),
            zh: "AI 摘要".to_string(),
        },
        description: I18nText {
            en: "Concise 2-3 sentence summary of the paper's core contributions".to_string(),
            zh: "论文核心贡献的简洁摘要（2-3句话）".to_string(),
        },
        category: BlockCategory::Basic,
        default_enabled: true,
        supported_modes: vec![AnalysisDepth::Standard, AnalysisDepth::Full],
        default_mode: BlockRunMode::Both,
        order: 1,
        depends_on: None,
        output_schema: OutputSchema::SingleString,
    }
}

/// Topic classification block
pub fn topics_block() -> AnalysisBlockConfig {
    AnalysisBlockConfig {
        id: "topics".to_string(),
        name: I18nText {
            en: "Topic Classification".to_string(),
            zh: "主题分类".to_string(),
        },
        description: I18nText {
            en: "Classify paper into research topics and suggest relevant tags".to_string(),
            zh: "将论文分类到研究主题并建议相关标签".to_string(),
        },
        category: BlockCategory::Basic,
        default_enabled: true,
        supported_modes: vec![AnalysisDepth::Standard, AnalysisDepth::Full],
        default_mode: BlockRunMode::Both,
        order: 2,
        depends_on: None,
        output_schema: OutputSchema::StringArray,
    }
}

// ============================================================================
// Core Modules
// ============================================================================

/// Key insights extraction
pub fn key_insights_block() -> AnalysisBlockConfig {
    AnalysisBlockConfig {
        id: "key_insights".to_string(),
        name: I18nText {
            en: "Key Insights".to_string(),
            zh: "关键洞察".to_string(),
        },
        description: I18nText {
            en: "Extract 5-7 key insights or contributions from the paper".to_string(),
            zh: "从论文中提取 5-7 个关键洞察或贡献".to_string(),
        },
        category: BlockCategory::Core,
        default_enabled: true,
        supported_modes: vec![AnalysisDepth::Standard, AnalysisDepth::Full],
        default_mode: BlockRunMode::Standard,
        order: 3,
        depends_on: None,
        output_schema: OutputSchema::StringArray,
    }
}

/// Quality assessment (novelty, effectiveness, completeness)
pub fn quality_assessment_block() -> AnalysisBlockConfig {
    AnalysisBlockConfig {
        id: "quality_assessment".to_string(),
        name: I18nText {
            en: "Quality Assessment".to_string(),
            zh: "质量评估".to_string(),
        },
        description: I18nText {
            en: "Rate novelty (0-10), effectiveness (0-10), and experiment completeness (0-10)".to_string(),
            zh: "评估创新性 (0-10)、有效性 (0-10) 和实验完整性 (0-10)".to_string(),
        },
        category: BlockCategory::Core,
        default_enabled: true,
        supported_modes: vec![AnalysisDepth::Standard, AnalysisDepth::Full],
        default_mode: BlockRunMode::Standard,
        order: 4,
        depends_on: Some(vec!["ai_summary".to_string()]),
        output_schema: OutputSchema::StructuredQuality,
    }
}

/// Code links extraction
pub fn code_links_block() -> AnalysisBlockConfig {
    AnalysisBlockConfig {
        id: "code_links".to_string(),
        name: I18nText {
            en: "Code Links".to_string(),
            zh: "代码链接".to_string(),
        },
        description: I18nText {
            en: "Extract GitHub links and code references from the paper".to_string(),
            zh: "从论文中提取 GitHub 链接和代码引用".to_string(),
        },
        category: BlockCategory::Core,
        default_enabled: true,
        supported_modes: vec![AnalysisDepth::Standard, AnalysisDepth::Full],
        default_mode: BlockRunMode::Standard,
        order: 5,
        depends_on: None,
        output_schema: OutputSchema::CodeLinks,
    }
}

/// Engineering notes for implementation
pub fn engineering_notes_block() -> AnalysisBlockConfig {
    AnalysisBlockConfig {
        id: "engineering_notes".to_string(),
        name: I18nText {
            en: "Engineering Notes".to_string(),
            zh: "工程笔记".to_string(),
        },
        description: I18nText {
            en: "Detailed engineering insights: target projects, integration approach, challenges, production concerns".to_string(),
            zh: "详细工程洞察：目标项目、集成方法、技术挑战、生产环境考虑".to_string(),
        },
        category: BlockCategory::Engineering,
        default_enabled: true,
        supported_modes: vec![AnalysisDepth::Standard, AnalysisDepth::Full],
        default_mode: BlockRunMode::Standard,
        order: 6,
        depends_on: None,
        output_schema: OutputSchema::SingleString,
    }
}

// ============================================================================
// Technical Modules (Full mode)
// ============================================================================

/// Algorithm extraction
pub fn algorithms_block() -> AnalysisBlockConfig {
    AnalysisBlockConfig {
        id: "algorithms".to_string(),
        name: I18nText {
            en: "Algorithms".to_string(),
            zh: "算法提取".to_string(),
        },
        description: I18nText {
            en: "Extract key algorithms with names, complexity, and step-by-step descriptions".to_string(),
            zh: "提取关键算法，包括名称、复杂度和分步描述".to_string(),
        },
        category: BlockCategory::Technical,
        default_enabled: false,
        supported_modes: vec![AnalysisDepth::Full],
        default_mode: BlockRunMode::Full,
        order: 7,
        depends_on: None,
        output_schema: OutputSchema::AlgorithmList,
    }
}

/// Complexity analysis
pub fn complexity_block() -> AnalysisBlockConfig {
    AnalysisBlockConfig {
        id: "complexity".to_string(),
        name: I18nText {
            en: "Complexity Analysis".to_string(),
            zh: "复杂度分析".to_string(),
        },
        description: I18nText {
            en: "Analyze time complexity and space complexity with big-O notation".to_string(),
            zh: "使用大 O 表示法分析时间复杂度和空间复杂度".to_string(),
        },
        category: BlockCategory::Technical,
        default_enabled: false,
        supported_modes: vec![AnalysisDepth::Full],
        default_mode: BlockRunMode::Full,
        order: 8,
        depends_on: None,
        output_schema: OutputSchema::SingleString,
    }
}

/// Algorithm flowchart (Mermaid)
pub fn flowchart_block() -> AnalysisBlockConfig {
    AnalysisBlockConfig {
        id: "flowchart".to_string(),
        name: I18nText {
            en: "Algorithm Flowchart".to_string(),
            zh: "算法流程图".to_string(),
        },
        description: I18nText {
            en: "Generate Mermaid flowchart code showing the algorithm's workflow".to_string(),
            zh: "生成 Mermaid 流程图代码展示算法工作流程".to_string(),
        },
        category: BlockCategory::Technical,
        default_enabled: false,
        supported_modes: vec![AnalysisDepth::Full],
        default_mode: BlockRunMode::Full,
        order: 9,
        depends_on: Some(vec!["algorithms".to_string()]),
        output_schema: OutputSchema::Flowchart,
    }
}

/// Key formulas extraction
pub fn formulas_block() -> AnalysisBlockConfig {
    AnalysisBlockConfig {
        id: "formulas".to_string(),
        name: I18nText {
            en: "Key Formulas".to_string(),
            zh: "关键公式".to_string(),
        },
        description: I18nText {
            en: "Extract important mathematical formulas with LaTeX notation and descriptions".to_string(),
            zh: "提取重要的数学公式，包括 LaTeX 表示和描述".to_string(),
        },
        category: BlockCategory::Technical,
        default_enabled: false,
        supported_modes: vec![AnalysisDepth::Full],
        default_mode: BlockRunMode::Full,
        order: 10,
        depends_on: None,
        output_schema: OutputSchema::FormulaList,
    }
}

// ============================================================================
// New Modules
// ============================================================================

/// Related papers recommendation
pub fn related_papers_block() -> AnalysisBlockConfig {
    AnalysisBlockConfig {
        id: "related_papers".to_string(),
        name: I18nText {
            en: "Related Papers".to_string(),
            zh: "相关论文".to_string(),
        },
        description: I18nText {
            en: "Identify papers that build on, improve, or relate to this work with relationship types".to_string(),
            zh: "识别基于、改进或相关于此研究的论文，并标注关系类型".to_string(),
        },
        category: BlockCategory::Core,
        default_enabled: true,
        supported_modes: vec![AnalysisDepth::Standard, AnalysisDepth::Full],
        default_mode: BlockRunMode::Standard,
        order: 11,
        depends_on: Some(vec!["ai_summary".to_string()]),
        output_schema: OutputSchema::PaperReferenceList,
    }
}

// ============================================================================
// Registry
// ============================================================================

/// Get all available analysis blocks
pub fn get_all_blocks() -> Vec<AnalysisBlockConfig> {
    vec![
        ai_summary_block(),
        topics_block(),
        key_insights_block(),
        quality_assessment_block(),
        code_links_block(),
        engineering_notes_block(),
        algorithms_block(),
        complexity_block(),
        flowchart_block(),
        formulas_block(),
        related_papers_block(),
    ]
}

/// Get block by ID
pub fn get_block(id: &str) -> Option<AnalysisBlockConfig> {
    get_all_blocks()
        .into_iter()
        .find(|b| b.id == id)
}
