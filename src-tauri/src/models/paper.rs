use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

/// Author information with affiliation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthorInfo {
    pub name: String,
    pub affiliation: Option<String>,
}

/// Paper model representing a research paper from ArXiv
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Paper {
    pub id: String,
    pub arxiv_id: String,
    pub title: String,
    pub authors: Vec<AuthorInfo>,
    pub summary: Option<String>,
    pub ai_summary: Option<String>,
    pub key_insights: Option<Vec<String>>,
    pub engineering_notes: Option<String>,
    pub code_links: Option<Vec<String>>,
    pub tags: Vec<String>,
    pub topics: Vec<String>, // Topics associated with this paper (e.g., 'rl', 'llm', 'inference')
    pub published_date: String,
    pub arxiv_url: String,
    pub pdf_url: String,
    pub filter_score: Option<i32>,
    pub filter_reason: Option<String>,
    pub is_deep_analyzed: bool,
    pub analysis_type: Option<String>,
    pub created_at: String,
    pub updated_at: String,

    // Deep Analysis V2 fields
    pub code_available: bool,
    pub novelty_score: Option<i32>,         // 0-10
    pub novelty_reason: Option<String>,
    pub effectiveness_score: Option<i32>,   // 0-10
    pub effectiveness_reason: Option<String>,
    pub experiment_completeness_score: Option<i32>, // 0-10
    pub experiment_completeness_reason: Option<String>,
    pub algorithm_flowchart: Option<String>,
    pub time_complexity: Option<String>,
    pub space_complexity: Option<String>,
    pub analysis_mode: Option<String>,      // 'standard' or 'full'
    pub analysis_incomplete: bool,          // LaTeX download failed
    pub pdf_local_path: Option<String>,     // Local path to downloaded PDF
    pub related_papers: Option<Vec<RelatedPaper>>,  // Related works identified during analysis
}

/// Related paper reference
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RelatedPaper {
    pub arxiv_id: String,
    pub title: String,
    pub relationship: PaperRelationship,
    #[serde(default)]
    pub relevance_score: Option<i32>,  // 0-10 - optional for robustness
    #[serde(default)]
    pub reason: Option<String>,         // optional for robustness
}

/// Relationship type to related paper
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PaperRelationship {
    BuildsOn,
    ImprovesUpon,
    CompetingWith,
    CitedBy,
    SimilarTo,
}

/// Key formula from a paper
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeyFormula {
    pub latex: String,
    pub name: String,
    pub description: String,
}

/// Algorithm description from a paper
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Algorithm {
    pub name: String,
    pub steps: Vec<String>,
    pub complexity: Option<String>,
}

/// Flow diagram (Mermaid or text)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FlowDiagram {
    pub format: String,  // "mermaid" or "text"
    pub content: String,
}

/// ArXiv paper (fetched, before analysis)
#[derive(Debug, Clone)]
pub struct ArxivPaper {
    pub id: String,
    pub title: String,
    pub authors: Vec<AuthorInfo>,
    pub summary: String,
    pub published: DateTime<Utc>,
    pub updated: DateTime<Utc>,
    pub categories: Vec<String>,
    pub arxiv_url: String,
    pub pdf_url: String,
    pub primary_category: String,
}

impl Paper {
    /// Create a new Paper from ArxivPaper with default values
    pub fn from_arxiv(arxiv: ArxivPaper) -> Self {
        let now = Utc::now();
        Paper {
            id: arxiv.id.clone(),
            arxiv_id: arxiv.id.clone(),
            title: arxiv.title,
            authors: arxiv.authors,
            summary: Some(arxiv.summary),
            ai_summary: None,
            key_insights: None,
            engineering_notes: None,
            code_links: None,
            tags: arxiv.categories,
            topics: vec![], // Will be set during fetch based on topic configuration
            published_date: arxiv.published.format("%Y-%m-%d").to_string(),
            arxiv_url: arxiv.arxiv_url,
            pdf_url: arxiv.pdf_url,
            filter_score: None,
            filter_reason: None,
            is_deep_analyzed: false,
            analysis_type: None,
            created_at: now.format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string(),
            updated_at: now.format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string(),
            // Deep Analysis V2 defaults
            code_available: false,
            novelty_score: None,
            novelty_reason: None,
            effectiveness_score: None,
            effectiveness_reason: None,
            experiment_completeness_score: None,
            experiment_completeness_reason: None,
            algorithm_flowchart: None,
            time_complexity: None,
            space_complexity: None,
            analysis_mode: None,
            analysis_incomplete: false,
            pdf_local_path: None,
            related_papers: None,
        }
    }

    /// Update the updated_at timestamp
    pub fn touch(&mut self) {
        self.updated_at = Utc::now().format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string();
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_paper_from_arxiv() {
        let arxiv = ArxivPaper {
            id: "2312.12345".to_string(),
            title: "Test Paper".to_string(),
            authors: vec!["Author 1".to_string(), "Author 2".to_string()],
            summary: "This is a test abstract.".to_string(),
            published: Utc::now(),
            updated: Utc::now(),
            categories: vec!["cs.AI".to_string(), "cs.LG".to_string()],
            arxiv_url: "https://arxiv.org/abs/2312.12345".to_string(),
            pdf_url: "https://arxiv.org/pdf/2312.12345.pdf".to_string(),
            primary_category: "cs.AI".to_string(),
        };

        let paper = Paper::from_arxiv(arxiv);

        assert_eq!(paper.id, "2312.12345");
        assert_eq!(paper.title, "Test Paper");
        assert_eq!(paper.authors.len(), 2);
        assert!(paper.summary.is_some());
        assert_eq!(paper.tags, vec!["cs.AI".to_string(), "cs.LG".to_string()]);
        assert!(!paper.is_deep_analyzed);
    }

    #[test]
    fn test_paper_touch() {
        let mut paper = Paper {
            id: "test".to_string(),
            arxiv_id: "test".to_string(),
            title: "Test".to_string(),
            authors: vec![],
            summary: None,
            ai_summary: None,
            key_insights: None,
            engineering_notes: None,
            code_links: None,
            topics: vec![],
            tags: vec![],
            published_date: "2024-01-01".to_string(),
            arxiv_url: "".to_string(),
            pdf_url: "".to_string(),
            filter_score: None,
            filter_reason: None,
            is_deep_analyzed: false,
            analysis_type: None,
            created_at: "2024-01-01T00:00:00.000Z".to_string(),
            updated_at: "2024-01-01T00:00:00.000Z".to_string(),
            // Deep Analysis V2 defaults
            code_available: false,
            novelty_score: None,
            novelty_reason: None,
            effectiveness_score: None,
            effectiveness_reason: None,
            experiment_completeness_score: None,
            experiment_completeness_reason: None,
            algorithm_flowchart: None,
            time_complexity: None,
            space_complexity: None,
            analysis_mode: None,
            analysis_incomplete: false,
            pdf_local_path: None,
            related_papers: None,
        };

        paper.touch();
        assert_ne!(paper.updated_at, "2024-01-01T00:00:00.000Z");
    }
}
