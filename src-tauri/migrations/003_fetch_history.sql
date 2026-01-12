-- Migration: Add fetch history tracking
-- This migration adds a table for tracking manual fetch history

-- Fetch history table - tracks manual paper fetch operations
CREATE TABLE IF NOT EXISTS fetch_history (
    id TEXT PRIMARY KEY,
    started_at TEXT NOT NULL,
    completed_at TEXT,
    status TEXT NOT NULL,  -- 'completed', 'failed', 'cancelled'
    papers_fetched INTEGER NOT NULL DEFAULT 0,
    papers_analyzed INTEGER NOT NULL DEFAULT 0,
    papers_saved INTEGER NOT NULL DEFAULT 0,
    papers_filtered INTEGER NOT NULL DEFAULT 0,
    llm_provider TEXT,
    max_papers INTEGER,
    error_message TEXT
);

-- Index for querying recent fetches
CREATE INDEX IF NOT EXISTS idx_fetch_history_started_at ON fetch_history(started_at DESC);

-- Index for querying by status
CREATE INDEX IF NOT EXISTS idx_fetch_history_status ON fetch_history(status);
