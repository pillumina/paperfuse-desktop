//! ArXiv API client for fetching research papers

#![allow(dead_code)]

use chrono::{DateTime, Utc};
use quick_xml::events::Event;
use thiserror::Error;
use crate::models::ArxivPaper;
use std::path::Path;

/// Errors that can occur during ArXiv API operations
#[derive(Debug, Error)]
pub enum ArxivError {
    #[error("HTTP request failed: {0}")]
    RequestError(#[from] reqwest::Error),

    #[error("Failed to parse XML response: {0}")]
    ParseError(String),

    #[error("No papers found in response")]
    NoPapersFound,

    #[error("Failed to download LaTeX source: {0}")]
    LatexDownloadError(String),
}

/// ArXiv paper entry from API response
#[derive(Debug, Clone)]
pub struct ArxivEntry {
    pub id: String,
    pub title: String,
    pub summary: String,
    pub published: String,
    pub updated: String,
    pub links: Vec<ArxivLink>,
    pub authors: Vec<ArxivAuthor>,
    pub categories: Vec<ArxivCategory>,
}

#[derive(Debug, Clone)]
pub struct ArxivLink {
    pub href: String,
    pub link_type: Option<String>,
    pub rel: Option<String>,
}

#[derive(Debug, Clone)]
pub struct ArxivAuthor {
    pub name: String,
    pub affiliation: Option<String>,
}

#[derive(Debug, Clone)]
pub struct ArxivCategory {
    pub term: String,
}

/// Options for fetching papers from ArXiv
#[derive(Debug, Clone)]
pub struct FetchOptions {
    pub categories: Vec<String>,
    pub max_results: usize,
    pub days_back: Option<u32>,         // Filter papers from last N days (relative range)
    pub date_from: Option<String>,      // Custom start date in YYYYMMDD format
    pub date_to: Option<String>,        // Custom end date in YYYYMMDD format
    /// Fetch by ID mode: fetch specific papers by arXiv ID
    pub fetch_by_id: bool,
    /// List of arXiv IDs for fetch-by-ID mode
    pub arxiv_ids: Option<Vec<String>>,
}

impl Default for FetchOptions {
    fn default() -> Self {
        Self {
            categories: vec!["cs.AI".to_string(), "cs.LG".to_string()],
            max_results: 100,
            days_back: None,
            date_from: None,
            date_to: None,
            fetch_by_id: false,
            arxiv_ids: None,
        }
    }
}

/// Fetch papers from ArXiv API
pub async fn fetch_papers(options: &FetchOptions) -> Result<Vec<ArxivEntry>, ArxivError> {
    let client = reqwest::Client::builder()
        .user_agent("PaperFuse/0.1 (https://github.com/paperfuse)")
        .build()?;

    let url = if options.fetch_by_id {
        // Fetch by ID mode: use id_list parameter
        // Format: http://export.arxiv.org/api/query?id_list=2301.12345,2301.67890
        if let Some(ids) = &options.arxiv_ids {
            if ids.is_empty() {
                return Err(ArxivError::ParseError("fetch_by_id=true but no IDs provided".to_string()));
            }
            let id_list = ids.join(",");
            format!(
                "http://export.arxiv.org/api/query?id_list={}",
                urlencoding::encode(&id_list)
            )
        } else {
            return Err(ArxivError::ParseError("fetch_by_id=true but no IDs provided".to_string()));
        }
    } else {
        // Category-based search mode (existing logic)
        // Build query from categories
        let query = options
            .categories
            .iter()
            .map(|c| format!("cat:{}", c))
            .collect::<Vec<_>>()
            .join(" OR ");

        // Build URL with date filter
        // Priority: custom date range (date_from/date_to) > days_back > no filter
        let use_custom_range = options.date_from.is_some() || options.date_to.is_some();
        let use_days_back = options.days_back.is_some() && !use_custom_range;

        if use_custom_range {
            // Custom date range: date_from and/or date_to
            let start_date = options.date_from.as_deref().unwrap_or("19910101"); // ArXiv started in 1991
            let default_end_date = Utc::now().format("%Y%m%d").to_string();
            let end_date = options.date_to.as_deref().unwrap_or(&default_end_date);

            let date_query = format!("({}) AND submittedDate:[{}0000 TO {}2359]",
                query,
                start_date,
                end_date
            );

            format!(
                "http://export.arxiv.org/api/query?search_query={}&max_results={}&sortBy=submittedDate&sortOrder=descending",
                urlencoding::encode(&date_query),
                options.max_results
            )
        } else if use_days_back {
            // Relative date range: last N days
            let days = options.days_back.unwrap();
            let cutoff_date = Utc::now() - chrono::Duration::days(days as i64);
            let date_str = cutoff_date.format("%Y%m%d");
            let today = Utc::now().format("%Y%m%d");

            let date_query = format!("({}) AND submittedDate:[{}0000 TO {}2359]",
                query,
                date_str,
                today
            );

            format!(
                "http://export.arxiv.org/api/query?search_query={}&max_results={}&sortBy=submittedDate&sortOrder=descending",
                urlencoding::encode(&date_query),
                options.max_results
            )
        } else {
            // No date filter
            format!(
                "http://export.arxiv.org/api/query?search_query={}&max_results={}&sortBy=submittedDate&sortOrder=descending",
                urlencoding::encode(&query),
                options.max_results
            )
        }
    };

    eprintln!("ArXiv API URL: {}", url);

    let response = client.get(&url).send().await?;

    if !response.status().is_success() {
        return Err(ArxivError::ParseError(format!(
            "ArXiv API returned status: {}",
            response.status()
        )));
    }

    let xml = response.text().await?;

    // Parse XML response
    parse_arxiv_xml(&xml)
}

/// Parse ArXiv XML response using manual parsing
fn parse_arxiv_xml(xml: &str) -> Result<Vec<ArxivEntry>, ArxivError> {
    eprintln!("Parsing ArXiv XML response...");

    let mut reader = quick_xml::Reader::from_str(xml);
    reader.config_mut().trim_text(true);

    let mut entries = Vec::new();
    let mut current_entry: Option<ArxivEntry> = None;
    let mut current_field: Option<String> = None;
    let mut buffer = Vec::new();

    loop {
        match reader.read_event_into(&mut buffer) {
            Ok(Event::Eof) => break,
            Ok(Event::Start(e)) => {
                match e.name().as_ref() {
                    b"entry" => {
                        current_entry = Some(ArxivEntry {
                            id: String::new(),
                            title: String::new(),
                            summary: String::new(),
                            published: String::new(),
                            updated: String::new(),
                            links: Vec::new(),
                            authors: Vec::new(),
                            categories: Vec::new(),
                        });
                    }
                    b"title" | b"summary" | b"id" | b"published" | b"updated" | b"name" | b"term" | b"affiliation" => {
                        current_field = Some(String::from_utf8_lossy(e.name().as_ref()).to_string());
                    }
                    b"link" => {
                        // Parse link attributes
                        let mut href = String::new();
                        let mut rel = None;
                        let mut link_type = None;

                        for attr in e.attributes() {
                            if let Ok(attr) = attr {
                                let value_str = String::from_utf8_lossy(&attr.value);
                                match attr.key.as_ref() {
                                    b"href" => {
                                        href = value_str.to_string();
                                    }
                                    b"rel" => {
                                        rel = Some(value_str.to_string());
                                    }
                                    b"type" => {
                                        link_type = Some(value_str.to_string());
                                    }
                                    _ => {}
                                }
                            }
                        }

                        if let Some(entry) = &mut current_entry {
                            entry.links.push(ArxivLink {
                                href,
                                rel,
                                link_type,
                            });
                        }
                    }
                    b"category" => {
                        // Parse category attributes
                        let mut term = String::new();
                        for attr in e.attributes() {
                            if let Ok(attr) = attr {
                                if attr.key.as_ref() == b"term" {
                                    term = String::from_utf8_lossy(&attr.value).to_string();
                                }
                            }
                        }

                        if let Some(entry) = &mut current_entry {
                            entry.categories.push(ArxivCategory { term });
                        }
                    }
                    _ => {}
                }
            }
            Ok(Event::Text(e)) => {
                if let Some(field) = &current_field {
                    let text = e.unescape().unwrap_or_else(|_| std::borrow::Cow::Borrowed("")).to_string();

                    if let Some(entry) = &mut current_entry {
                        match field.as_str() {
                            "title" => entry.title = text,
                            "summary" => entry.summary = text,
                            "id" => entry.id = text,
                            "published" => entry.published = text,
                            "updated" => entry.updated = text,
                            "name" => entry.authors.push(ArxivAuthor { name: text, affiliation: None }),
                            "affiliation" => {
                                // Add affiliation to the last author
                                if let Some(last_author) = entry.authors.last_mut() {
                                    last_author.affiliation = Some(text);
                                }
                            }
                            _ => {}
                        }
                    }
                }
            }
            Ok(Event::End(e)) => {
                if e.name().as_ref() == b"entry" {
                    if let Some(entry) = current_entry.take() {
                        entries.push(entry);
                    }
                }
                current_field = None;
            }
            Err(e) => {
                return Err(ArxivError::ParseError(format!("XML parsing error: {}", e)));
            }
            _ => {}
        }
        buffer.clear();
    }

    eprintln!("Parsed {} entries from ArXiv", entries.len());

    // Log first entry for debugging
    if !entries.is_empty() {
        let first = &entries[0];
        eprintln!("First entry: id={}, title={}, links.count={}",
            first.id, first.title.chars().take(50).collect::<String>(), first.links.len());
        for (i, link) in first.links.iter().enumerate() {
            eprintln!("  Link {}: href={}, rel={:?}, type={:?}",
                i, link.href, link.rel, link.link_type);
        }
    }

    if entries.is_empty() {
        return Err(ArxivError::NoPapersFound);
    }

    Ok(entries)
}

/// Convert ArXiv entry to standard paper format
impl ArxivEntry {
    pub fn get_arxiv_id(&self) -> String {
        // Extract ArXiv ID from URL (e.g., http://arxiv.org/abs/2301.12345v1 -> 2301.12345)
        self.id
            .rsplit('/')
            .next()
            .map(|s| s.split('v').next().unwrap_or(s))
            .unwrap_or(&self.id)
            .to_string()
    }

    pub fn get_pdf_url(&self) -> String {
        // Find PDF link or construct it
        self.links
            .iter()
            .find(|l| l.link_type.as_deref() == Some("application/pdf"))
            .map(|l| l.href.clone())
            .unwrap_or_else(|| {
                let id = self.get_arxiv_id();
                format!("http://arxiv.org/pdf/{}.pdf", id)
            })
    }

    pub fn get_abstract_url(&self) -> String {
        self.id.clone()
    }

    pub fn get_authors(&self) -> Vec<String> {
        self.authors.iter().map(|a| a.name.clone()).collect()
    }

    pub fn get_categories(&self) -> Vec<String> {
        self.categories
            .iter()
            .map(|c| c.term.clone())
            .collect::<Vec<_>>()
    }

    pub fn parse_published_date(&self) -> Result<DateTime<Utc>, ArxivError> {
        DateTime::parse_from_rfc3339(&self.published)
            .map(|dt| dt.with_timezone(&Utc))
            .map_err(|e| ArxivError::ParseError(format!("Invalid date format: {}", e)))
    }

    /// Convert ArxivEntry to ArxivPaper
    pub fn to_arxiv_paper(&self) -> Result<ArxivPaper, ArxivError> {
        let published = self.parse_published_date()?;
        let updated = DateTime::parse_from_rfc3339(&self.updated)
            .map(|dt| dt.with_timezone(&Utc))
            .map_err(|e| ArxivError::ParseError(format!("Invalid date format: {}", e)))?;

        // Convert ArxivAuthor to AuthorInfo
        let authors = self.authors.iter().map(|a| crate::models::AuthorInfo {
            name: a.name.clone(),
            affiliation: a.affiliation.clone(),
        }).collect();

        Ok(ArxivPaper {
            id: self.get_arxiv_id(),
            title: self.title.clone(),
            authors,
            summary: self.summary.clone(),
            published,
            updated,
            categories: self.get_categories(),
            arxiv_url: self.id.clone(),
            pdf_url: self.get_pdf_url(),
            primary_category: self.categories.first().map(|c| c.term.clone()).unwrap_or_default(),
        })
    }

    /// Download LaTeX source for this paper to a directory
    /// Returns the path to the downloaded LaTeX source file
    /// If the LaTeX source already exists locally, skips downloading and uses cached version
    pub async fn download_latex_source(&self, download_dir: &Path) -> Result<String, ArxivError> {
        use std::fs;
        use std::io::Write;
        use flate2::read::GzDecoder;
        use tar::Archive;

        let arxiv_id = self.get_arxiv_id();

        // Check if LaTeX source already exists locally
        let extract_dir = download_dir.join(&arxiv_id);
        if extract_dir.exists() {
            eprintln!("[download_latex_source] LaTeX source already exists at: {}", extract_dir.display());

            // Try to find the main .tex file in the existing directory
            if let Some(main_tex) = find_main_tex_file(&extract_dir) {
                eprintln!("[download_latex_source] Using cached LaTeX: {}", main_tex);
                return Ok(main_tex);
            } else {
                eprintln!("[download_latex_source] Cache directory exists but no .tex files found, re-downloading");
            }
        }

        // Cache miss - download from ArXiv
        let client = reqwest::Client::builder()
            .user_agent("PaperFuse/0.1 (https://github.com/paperfuse)")
            .build()?;

        // Construct the source download URL
        // Format: https://arxiv.org/e-print/ARXIV_ID
        let url = format!("https://arxiv.org/e-print/{}", arxiv_id);
        eprintln!("[download_latex_source] Downloading from: {}", url);

        let response = client.get(&url).send().await?;

        if !response.status().is_success() {
            return Err(ArxivError::LatexDownloadError(format!(
                "Failed to download LaTeX source: HTTP {}",
                response.status()
            )));
        }

        let bytes = response.bytes().await?;

        // Create download directory if it doesn't exist
        fs::create_dir_all(download_dir).map_err(|e| {
            ArxivError::LatexDownloadError(format!("Failed to create download directory: {}", e))
        })?;

        // Save the downloaded tar.gz file
        let tar_gz_path = download_dir.join(format!("{}.tar.gz", arxiv_id));
        let mut file = fs::File::create(&tar_gz_path).map_err(|e| {
            ArxivError::LatexDownloadError(format!("Failed to create tar.gz file: {}", e))
        })?;
        file.write_all(&bytes).map_err(|e| {
            ArxivError::LatexDownloadError(format!("Failed to write tar.gz file: {}", e))
        })?;

        // Extract the tar.gz file
        let tar_gz = fs::File::open(&tar_gz_path).map_err(|e| {
            ArxivError::LatexDownloadError(format!("Failed to open tar.gz file: {}", e))
        })?;
        let decoder = GzDecoder::new(tar_gz);
        let mut archive = Archive::new(decoder);

        let extract_dir = download_dir.join(&arxiv_id);
        fs::create_dir_all(&extract_dir).map_err(|e| {
            ArxivError::LatexDownloadError(format!("Failed to create extract directory: {}", e))
        })?;

        archive.unpack(&extract_dir).map_err(|e| {
            ArxivError::LatexDownloadError(format!("Failed to extract archive: {}", e))
        })?;

        // Clean up the tar.gz file
        fs::remove_file(&tar_gz_path).ok();

        // Find the main .tex file (usually the first .tex file in the directory)
        let main_tex = find_main_tex_file(&extract_dir).unwrap_or_else(|| {
            // If no specific main file found, return the directory path
            extract_dir.to_string_lossy().to_string()
        });

        eprintln!("[download_latex_source] Downloaded LaTeX to: {}", main_tex);

        Ok(main_tex)
    }
}

/// Find the main .tex file in a directory
/// Usually files with names like "main.tex", "paper.tex", or the first .tex file
fn find_main_tex_file(dir: &Path) -> Option<String> {
    let entries: Vec<std::fs::DirEntry> = std::fs::read_dir(dir)
        .ok()?
        .filter_map(|e| e.ok())
        .collect();

    // First look for common main file names
    for entry in &entries {
        let path = entry.path();
        if path.is_file() {
            if let Some(name) = path.file_name() {
                let name_str = name.to_string_lossy();
                if name_str == "main.tex" || name_str == "paper.tex" {
                    return Some(path.to_string_lossy().to_string());
                }
            }
        }
    }

    // Fallback: return first .tex file
    for entry in &entries {
        let path = entry.path();
        if path.is_file() {
            if let Some(ext) = path.extension() {
                if ext == "tex" {
                    return Some(path.to_string_lossy().to_string());
                }
            }
        }
    }

    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_arxiv_id() {
        let entry = ArxivEntry {
            id: "http://arxiv.org/abs/2301.12345v1".to_string(),
            title: "Test Paper".to_string(),
            summary: "Test summary".to_string(),
            published: "2023-01-15T00:00:00Z".to_string(),
            updated: "2023-01-15T00:00:00Z".to_string(),
            links: vec![],
            authors: vec![],
            categories: vec![],
        };

        assert_eq!(entry.get_arxiv_id(), "2301.12345");
    }

    #[test]
    fn test_construct_pdf_url() {
        let entry = ArxivEntry {
            id: "http://arxiv.org/abs/2301.12345v1".to_string(),
            title: "Test Paper".to_string(),
            summary: "Test summary".to_string(),
            published: "2023-01-15T00:00:00Z".to_string(),
            updated: "2023-01-15T00:00:00Z".to_string(),
            links: vec![],
            authors: vec![],
            categories: vec![],
        };

        assert_eq!(
            entry.get_pdf_url(),
            "http://arxiv.org/pdf/2301.12345.pdf"
        );
    }

    #[test]
    fn test_parse_published_date() {
        let entry = ArxivEntry {
            id: "http://arxiv.org/abs/2301.12345v1".to_string(),
            title: "Test Paper".to_string(),
            summary: "Test summary".to_string(),
            published: "2023-01-15T10:30:00Z".to_string(),
            updated: "2023-01-15T00:00:00Z".to_string(),
            links: vec![],
            authors: vec![],
            categories: vec![],
        };

        let result = entry.parse_published_date();
        assert!(result.is_ok());
    }
}
