//! LaTeX parser for extracting specific sections from academic papers
//! Used for Standard mode analysis (Introduction + Conclusion only)

use regex::Regex;

/// Extract Introduction and Conclusion sections from LaTeX content
/// This is used for Standard mode analysis where we only need these key sections
pub fn extract_intro_conclusion(latex_content: &str) -> String {
    let mut extracted = String::new();

    // Patterns for Introduction section (case-insensitive, with/without asterisk)
    let intro_patterns = [
        r"(?i)\\section\*?\{Introduction\}",
        r"(?i)\\section\*?\{INTRODUCTION\}",
    ];

    // Patterns for Conclusion section
    let conclusion_patterns = [
        r"(?i)\\section\*?\{Conclusion\}",
        r"(?i)\\section\*?\{Conclusions\}",
        r"(?i)\\section\*?\{CONCLUSION\}",
    ];

    // Extract Introduction
    for pattern in &intro_patterns {
        if let Ok(re) = Regex::new(pattern) {
            if let Some(mat) = re.find(latex_content) {
                let start = mat.start();
                if let Some(end) = find_next_section(latex_content, start) {
                    if start + end <= latex_content.len() {
                        extracted.push_str(&latex_content[start..start + end]);
                        break;
                    }
                }
            }
        }
    }

    // Extract Conclusion
    for pattern in &conclusion_patterns {
        if let Ok(re) = Regex::new(pattern) {
            if let Some(mat) = re.find(latex_content) {
                let start = mat.start();
                if let Some(end) = find_next_section(latex_content, start) {
                    if start + end <= latex_content.len() {
                        extracted.push_str(&latex_content[start..start + end]);
                    } else {
                        // No next section, take everything till end
                        extracted.push_str(&latex_content[start..]);
                    }
                    break;
                }
            }
        }
    }

    // If extraction failed or is too short, fallback to first 15000 chars
    if extracted.len() < 500 {
        eprintln!("[latex_parser] Failed to extract intro/conclusion, using first 15000 chars");
        return latex_content.chars().take(15000).collect();
    }

    // Limit to 15000 characters to avoid token limits
    extracted.chars().take(15000).collect()
}

/// Find the next section marker in LaTeX content
/// Searches from the given start position and returns the offset from start
fn find_next_section(full_content: &str, start_pos: usize) -> Option<usize> {
    if start_pos >= full_content.len() {
        return None;
    }

    let remaining = &full_content[start_pos..];

    let patterns = [
        r"\\section\{", r"\\section\*\{",
        r"\\subsection\{", r"\\subsection\*\{",
        r"\\subsubsection\{", r"\\subsubsection\*\{",
        r"\\section\{References", r"\\section\*\{References",
        r"\\section\{Bibliography", r"\\section\*\{Bibliography",
        r"\\section\{ACKNOWLEDGMENTS", r"\\section\*\{ACKNOWLEDGMENTS",
        r"\\bibliography", r"\\bibliographystyle",
        r"\\appendix",
        r"\\end\{document\}",
    ];

    let mut earliest_pos = None;

    for pattern in &patterns {
        if let Ok(re) = Regex::new(pattern) {
            if let Some(mat) = re.find(remaining) {
                match earliest_pos {
                    None => earliest_pos = Some(mat.start()),
                    Some(current) if mat.start() < current => earliest_pos = Some(mat.start()),
                    _ => {}
                }
            }
        }
    }

    earliest_pos
}

/// Clean LaTeX content by removing comments, citations, and formatting commands
/// This makes the content more suitable for LLM processing
#[allow(dead_code)]
pub fn clean_latex(latex_content: &str) -> String {
    let mut cleaned = latex_content.to_string();

    // Remove line comments
    if let Ok(re) = Regex::new(r"%.*?\n") {
        cleaned = re.replace_all(&cleaned, "\n").to_string();
    }

    // Remove common formatting commands but keep their content
    let commands_to_remove = vec![
        (r"\\textbf\{(.*?)\}", "$1"),
        (r"\\textit\{(.*?)\}", "$1"),
        (r"\\emph\{(.*?)\}", "$1"),
        (r"\\texttt\{(.*?)\}", "$1"),
        (r"\\cite\{(.*?)\}", "[1]"),
        (r"\\ref\{(.*?)\}", ""),
        (r"\\eqref\{(.*?)\}", ""),
        (r"\\label\{(.*?)\}", ""),
        (r"\\url\{(.*?)\}", "URL"),
    ];

    for (pattern, replacement) in commands_to_remove {
        if let Ok(re) = Regex::new(pattern) {
            cleaned = re.replace_all(&cleaned, replacement).to_string();
        }
    }

    // Simplify math mode content (replace with [MATH] marker)
    if let Ok(re) = Regex::new(r"\$.*?\$") {
        cleaned = re.replace_all(&cleaned, "[MATH]").to_string();
    }

    // Remove display math
    if let Ok(re) = Regex::new(r"\\begin\{equation\}.*?\\end\{equation\}") {
        cleaned = re.replace_all(&cleaned, "[EQUATION]").to_string();
    }

    if let Ok(re) = Regex::new(r"\\begin\{align\}.*?\\end\{align\}") {
        cleaned = re.replace_all(&cleaned, "[ALIGN]").to_string();
    }

    // Clean up excessive whitespace
    if let Ok(re) = Regex::new(r"\n\s*\n\s*\n") {
        cleaned = re.replace_all(&cleaned, "\n\n").to_string();
    }

    cleaned
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_intro_conclusion() {
        let latex = r"\section{Introduction}
This is the introduction content with some text.
\section{Method}
Some method content here.
\section{Conclusion}
This is the conclusion.";

        let extracted = extract_intro_conclusion(latex);
        assert!(extracted.contains("Introduction"));
        assert!(extracted.contains("Conclusion"));
        assert!(!extracted.contains("Method"));
    }

    #[test]
    fn test_clean_latex() {
        let latex = r"This is \textbf{bold} text with \cite{ref123}.";
        let cleaned = clean_latex(latex);
        assert!(!cleaned.contains("\\textbf"));
        assert!(!cleaned.contains("\\cite"));
        assert!(cleaned.contains("bold"));
    }

    #[test]
    fn test_fallback_to_first_chars() {
        let latex = "Some random content without sections";
        let extracted = extract_intro_conclusion(latex);
        assert!(extracted.contains("Some random content"));
    }
}
