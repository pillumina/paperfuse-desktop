-- Add classification cache table to avoid redundant LLM calls
-- Migration: 005_add_classification_cache

-- Create classification cache table
CREATE TABLE IF NOT EXISTS classification_cache (
    arxiv_id TEXT NOT NULL,
    topics_hash TEXT NOT NULL,  -- Hash of topics configuration
    classification_result TEXT NOT NULL,  -- JSON: {score, reason, suggested_tags, suggested_topics, is_relevant}
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (arxiv_id, topics_hash)
);

CREATE INDEX IF NOT EXISTS idx_classification_cache_topics_hash ON classification_cache(topics_hash);
CREATE INDEX IF NOT EXISTS idx_classification_cache_created_at ON classification_cache(created_at);
