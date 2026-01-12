-- Add Full-Text Search support using FTS5
-- Migration: 008_add_fts_search

-- Create FTS5 virtual table for papers full-text search
-- This dramatically improves search performance compared to LIKE queries
CREATE VIRTUAL TABLE IF NOT EXISTS papers_fts USING fts5(
    title,
    summary,
    ai_summary,
    content='papers',
    content_rowid='rowid',
    tokenize='porter unicode61'
);

-- Create triggers to keep FTS table in sync with papers table

-- Trigger: Insert new paper into FTS
CREATE TRIGGER IF NOT EXISTS papers_fts_insert AFTER INSERT ON papers 
BEGIN
    INSERT INTO papers_fts(rowid, title, summary, ai_summary)
    VALUES (new.rowid, new.title, COALESCE(new.summary, ''), COALESCE(new.ai_summary, ''));
END;

-- Trigger: Update paper in FTS
CREATE TRIGGER IF NOT EXISTS papers_fts_update AFTER UPDATE ON papers 
BEGIN
    UPDATE papers_fts
    SET title = new.title,
        summary = COALESCE(new.summary, ''),
        ai_summary = COALESCE(new.ai_summary, '')
    WHERE rowid = old.rowid;
END;

-- Trigger: Delete paper from FTS
CREATE TRIGGER IF NOT EXISTS papers_fts_delete AFTER DELETE ON papers 
BEGIN
    DELETE FROM papers_fts WHERE rowid = old.rowid;
END;

-- Populate FTS table with existing data
INSERT INTO papers_fts(rowid, title, summary, ai_summary)
SELECT rowid, title, COALESCE(summary, ''), COALESCE(ai_summary, '')
FROM papers
WHERE NOT EXISTS (SELECT 1 FROM papers_fts WHERE papers_fts.rowid = papers.rowid);

-- Create indexes for common query patterns to improve performance
CREATE INDEX IF NOT EXISTS idx_papers_published_date ON papers(published_date DESC);
CREATE INDEX IF NOT EXISTS idx_papers_filter_score ON papers(filter_score DESC) WHERE filter_score IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_papers_is_deep_analyzed ON papers(is_deep_analyzed) WHERE is_deep_analyzed = 1;
CREATE INDEX IF NOT EXISTS idx_papers_created_at ON papers(created_at DESC);

