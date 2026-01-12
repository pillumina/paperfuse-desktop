-- Migration: Add schedule status tracking
-- This migration adds tables for tracking scheduler execution history

-- Schedule runs table - tracks execution history
CREATE TABLE IF NOT EXISTS schedule_runs (
    id TEXT PRIMARY KEY,
    started_at TEXT NOT NULL,
    completed_at TEXT,
    status TEXT NOT NULL,  -- 'pending', 'running', 'completed', 'failed'
    papers_fetched INTEGER NOT NULL DEFAULT 0,
    papers_saved INTEGER NOT NULL DEFAULT 0,
    error_message TEXT
);

-- Index for querying recent runs
CREATE INDEX IF NOT EXISTS idx_schedule_runs_started_at ON schedule_runs(started_at DESC);

-- Index for querying by status
CREATE INDEX IF NOT EXISTS idx_schedule_runs_status ON schedule_runs(status);
