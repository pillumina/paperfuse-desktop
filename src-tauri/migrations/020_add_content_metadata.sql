-- Add content source tracking
-- Tracks where the analysis content came from: "html", "latex", "abstract"
ALTER TABLE papers ADD COLUMN content_source TEXT;

-- Add token estimation
-- Estimated token count of the analyzed content
ALTER TABLE papers ADD COLUMN estimated_tokens INTEGER;

-- Add available sections (JSON array)
-- Sections that were available in the source
ALTER TABLE papers ADD COLUMN available_sections TEXT;

-- Create index for content source queries
CREATE INDEX IF NOT EXISTS idx_papers_content_source ON papers(content_source);
