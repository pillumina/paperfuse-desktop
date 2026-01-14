//! ArXiv HTML parser for extracting paper content
//! Uses LaTeXML-generated HTML from arxiv.org/html/{id}

use select::document::Document;
use select::node::Node;
use select::predicate::{Attr, Class, Name, Predicate};
use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum HtmlParseError {
    #[error("Failed to fetch HTML: {0}")]
    FetchError(String),

    #[error("No sections found in HTML")]
    NoSectionsFound,

    #[error("Section '{0}' not found")]
    SectionNotFound(String),

    #[error("Invalid HTML structure")]
    InvalidStructure,
}

/// Content source enum
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ContentSource {
    Html,
    Latex,
    AbstractOnly,
}

/// Extracted section from HTML
pub struct Section {
    pub title: String,
    pub level: u8,           // 1-6 for h1-h6
    pub anchor: String,      // e.g., "S1", "S2"
    pub html_content: String, // Original HTML (preserves structure)
}

/// Extracted content from ArXiv HTML
pub struct ExtractedContent {
    pub source: ContentSource,
    pub r#abstract: Option<String>,     // Abstract section (r#abstract needed since 'abstract' is reserved)
    pub sections: Vec<Section>,          // Main content sections
    pub estimated_tokens: usize,
    pub available_sections: Vec<String>,
}

/// Sections to skip (not useful for LLM analysis)
const SKIP_SECTIONS: &[&str] = &[
    "References",
    "Bibliography",
    "Acknowledgments",
    "Acknowledgement",
    "Appendix",
    "Supplementary",
    "Supplemental Material",
    "Additional Material",
    "Code Availability",
    "Reproducibility Statement",
    "Ethics Statement",
];

/// Extract content from ArXiv HTML for LLM analysis
pub fn extract_sections_by_name(
    html: &str,
    section_names: &[&str],
) -> Result<ExtractedContent, HtmlParseError> {
    let document = Document::from(html);

    // Extract abstract first (important context for LLM)
    let abstract_text = extract_abstract(&document);

    // Find document root
    let root = find_document_root(&document);

    // Extract sections using h1-h6 headings directly
    let mut sections = Vec::new();

    // Find all headings (h1-h6) that are in sections
    for heading in root.find(Name("h1").or(Name("h2")).or(Name("h3")).or(Name("h4")).or(Name("h5")).or(Name("h6"))) {
        // Skip if in navigation or abstract
        if should_skip_heading(&heading) {
            continue;
        }

        let full_text = heading.text().trim().to_string();
        if full_text.is_empty() || full_text.len() < 3 {
            continue;
        }

        // Extract title (remove number prefix like "1 Introduction" -> "Introduction")
        let title = clean_title(&full_text);

        // Skip if title matches skip patterns
        if should_skip_section(&title) {
            continue;
        }

        // Get level from heading name (h2 -> 2, h3 -> 3, etc.)
        let level = heading
            .name()
            .and_then(|name| name.chars().last())
            .unwrap_or('2') as u8 - b'0';

        // Get anchor from heading or parent
        let anchor = heading
            .attr("id")
            .or_else(|| heading.parent().and_then(|p| p.attr("id")))
            .unwrap_or("")
            .to_string();

        // Find the parent section and extract its HTML content
        // Manual traversal since select library doesn't have find_parent with predicate
        let html_content = {
            let mut current = heading.parent();
            let mut section_node = None;

            while let Some(node) = current {
                let name = node.name().unwrap_or("");
                let class = node.attr("class").unwrap_or("");

                if name == "section" || class.contains("ltx_section") {
                    section_node = Some(node);
                    break;
                }

                current = node.parent();
            }

            if let Some(section) = section_node {
                extract_section_html(&section, &heading)
            } else {
                String::new()
            }
        };

        sections.push(Section {
            title,
            level,
            anchor,
            html_content,
        });
    }

    if sections.is_empty() && abstract_text.is_none() {
        return Err(HtmlParseError::NoSectionsFound);
    }

    // Collect all available section names
    let available_sections: Vec<String> = sections.iter().map(|s| s.title.clone()).collect();

    // Filter to requested sections if specified
    let filtered: Vec<Section> = if section_names.is_empty() {
        sections
    } else {
        sections
            .into_iter()
            .filter(|s| {
                section_names
                    .iter()
                    .any(|name| s.title.to_lowercase().contains(&name.to_lowercase()))
            })
            .collect()
    };

    // Calculate total content length
    let total_content: usize = filtered.iter().map(|s| s.html_content.len()).sum::<usize>();
    let abstract_len = abstract_text.as_ref().map_or(0, |s| s.len());
    let estimated_tokens = (total_content + abstract_len) / 4;

    Ok(ExtractedContent {
        source: ContentSource::Html,
        r#abstract: abstract_text,
        sections: filtered,
        estimated_tokens,
        available_sections,
    })
}

/// Find the document root element
fn find_document_root(document: &Document) -> Node {
    // Try to find <article class="ltx_document">
    if let Some(root) = document.find(Class("ltx_document")).into_iter().next() {
        return root;
    }

    // Fallback to <article>
    if let Some(root) = document.find(Name("article")).into_iter().next() {
        return root;
    }

    // Last resort: body
    if let Some(root) = document.find(Name("body")).into_iter().next() {
        return root;
    }

    // Severely malformed HTML - try to find any node as fallback
    document.find(Name("html")).into_iter().next()
        .or_else(|| document.find(Name("head")).into_iter().next())
        .expect("Could not find any valid HTML element in document")
}

/// Extract abstract section
fn extract_abstract(document: &Document) -> Option<String> {
    let abstract_node = document
        .find(Class("ltx_abstract"))
        .into_iter()
        .next()?;

    // Extract paragraphs from abstract
    let mut content = String::new();

    for para in abstract_node.find(Class("ltx_p")) {
        let text = para.text().trim().to_string();
        if !text.is_empty() {
            content.push_str(&text);
            content.push_str("\n\n");
        }
    }

    if content.trim().is_empty() {
        None
    } else {
        Some(content.trim().to_string())
    }
}

/// Extract HTML content from a section (after the heading)
fn extract_section_html(section_node: &Node, heading: &Node) -> String {
    let mut html_parts = Vec::new();
    let mut started = false;

    for child in section_node.children() {
        // Start after we see the heading
        if !started {
            if child == *heading {
                started = true;
            }
            continue;
        }

        let name = child.name().unwrap_or("");

        // Stop at nested section
        if name == "section" {
            break;
        }

        // Skip subsections (they will be processed separately)
        if child.attr("class").unwrap_or("").contains("ltx_subsection")
            || child.attr("class").unwrap_or("").contains("ltx_subsubsection")
        {
            break;
        }

        // Keep the HTML as-is (preserves structure for LLM)
        if !name.is_empty() {
            // Include the element with its tags
            html_parts.push(child.html());
        }
    }

    html_parts.join("").trim().to_string()
}

/// Check if heading should be skipped (in nav, etc.)
fn should_skip_heading(heading: &Node) -> bool {
    // Skip if in navigation - manual parent traversal
    let mut current = heading.parent();
    while let Some(node) = current {
        if let Some(name) = node.name() {
            if name == "nav" {
                return true;
            }
        }
        current = node.parent();
    }

    // Skip if in abstract - manual parent traversal
    current = heading.parent();
    while let Some(node) = current {
        let class = node.attr("class").unwrap_or("");
        if class.contains("ltx_abstract") {
            return true;
        }
        current = node.parent();
    }

    // Skip if it's the document title
    if let Some(classes) = heading.attr("class") {
        if classes.contains("ltx_title_document") {
            return true;
        }
    }

    false
}

/// Check if section should be skipped based on title
fn should_skip_section(title: &str) -> bool {
    let title_lower = title.to_lowercase();

    SKIP_SECTIONS.iter().any(|&skip| {
        title_lower.contains(&skip.to_lowercase())
    })
}

/// Clean title by removing number prefix
/// "1 Introduction" -> "Introduction"
fn clean_title(full_title: &str) -> String {
    // Remove leading number and dot (e.g., "1. " or "1 ")
    let re = regex::Regex::new(r"^[\dA-Za-z.\-]+\s+").unwrap();
    let cleaned = re.replace(full_title, "");

    if cleaned.trim().is_empty() {
        // Fallback: split by whitespace and skip first token
        full_title
            .split_whitespace()
            .skip(1)
            .collect::<Vec<_>>()
            .join(" ")
    } else {
        cleaned.to_string()
    }
}

/// Extract all available section names from HTML (for metadata)
pub fn extract_available_sections(html: &str) -> Vec<String> {
    let document = Document::from(html);
    let mut sections = Vec::new();

    let root = find_document_root(&document);

    for heading in root.find(Name("h1").or(Name("h2")).or(Name("h3")).or(Name("h4")).or(Name("h5")).or(Name("h6"))) {
        if should_skip_heading(&heading) {
            continue;
        }

        let full_text = heading.text().trim().to_string();
        let title = clean_title(&full_text);

        if !title.is_empty() && title.len() > 2 && !should_skip_section(&title) {
            sections.push(title);
        }
    }

    sections
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_clean_title() {
        assert_eq!(clean_title("1 Introduction"), "Introduction");
        assert_eq!(clean_title("2.1 Overview"), "Overview");
        assert_eq!(clean_title("A. Background"), "Background");
    }

    #[test]
    fn test_should_skip_section() {
        assert!(should_skip_section("References"));
        assert!(should_skip_section("Bibliography and Related Work"));
        assert!(should_skip_section("Appendix: Additional Experiments"));
        assert!(!should_skip_section("Introduction"));
        assert!(!should_skip_section("Method"));
    }
}
