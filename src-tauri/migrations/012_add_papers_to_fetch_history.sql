-- Migration: Add papers field to fetch_history
-- This migration adds a JSON field to track papers saved in each fetch

-- Add papers column (JSON array of paper summaries: {id, title, arxiv_id})
ALTER TABLE fetch_history ADD COLUMN papers TEXT;

-- Add index for querying by completion time
CREATE INDEX IF NOT EXISTS idx_fetch_history_completed_at ON fetch_history(completed_at DESC);
