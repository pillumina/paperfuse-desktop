-- Add topics field for paper categorization
-- Migration: 007_add_topics

-- Add topics column to store which topics each paper belongs to
ALTER TABLE papers ADD COLUMN topics TEXT DEFAULT '[]';

-- Create index for topics filtering
CREATE INDEX IF NOT EXISTS idx_papers_topics ON papers(topics);
