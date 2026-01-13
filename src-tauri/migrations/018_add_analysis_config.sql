-- Migration: Add modular analysis configuration
-- This allows users to configure which analysis blocks are enabled

-- User analysis configuration table
CREATE TABLE IF NOT EXISTS user_analysis_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    block_id TEXT NOT NULL UNIQUE,
    enabled BOOLEAN NOT NULL DEFAULT 1,
    mode TEXT NOT NULL DEFAULT 'quick',
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Insert default configurations for all blocks
-- Basic modules (always enabled)
INSERT OR IGNORE INTO user_analysis_config (block_id, enabled, mode) VALUES
    ('ai_summary', 1, 'quick'),
    ('topics', 1, 'quick');

-- Core modules (enabled by default for quick mode)
INSERT OR IGNORE INTO user_analysis_config (block_id, enabled, mode) VALUES
    ('key_insights', 1, 'quick'),
    ('quality_assessment', 1, 'quick'),
    ('code_links', 1, 'quick'),
    ('engineering_notes', 1, 'quick'),
    ('related_papers', 1, 'quick');

-- Technical modules (disabled by default, full mode only)
INSERT OR IGNORE INTO user_analysis_config (block_id, enabled, mode) VALUES
    ('algorithms', 0, 'full'),
    ('complexity', 0, 'full'),
    ('flowchart', 0, 'full'),
    ('formulas', 0, 'full');
