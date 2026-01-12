-- Add arxiv_id column to papers table
-- Migration: 004_add_arxiv_id

-- Add arxiv_id column (nullable initially for existing records)
ALTER TABLE papers ADD COLUMN arxiv_id TEXT;

-- Copy existing id values to arxiv_id for existing records
UPDATE papers SET arxiv_id = id WHERE arxiv_id IS NULL;

-- Make the column NOT NULL after populating it
-- SQLite doesn't support ALTER COLUMN directly, so we'll rely on application logic
-- to ensure arxiv_id is always set going forward
