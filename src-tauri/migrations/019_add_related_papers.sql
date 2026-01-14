-- Add related_papers column to papers table
-- This stores the list of related papers identified during analysis

ALTER TABLE papers ADD COLUMN related_papers TEXT;

-- Create index for faster queries (optional, since we query by ID mostly)
-- CREATE INDEX IF NOT EXISTS idx_papers_related_papers ON papers(related_papers);
