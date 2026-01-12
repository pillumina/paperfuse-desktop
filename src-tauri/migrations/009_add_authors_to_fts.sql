-- Add authors field to FTS5 search
-- Migration: 009_add_authors_to_fts

-- Drop existing FTS table and triggers
DROP TRIGGER IF EXISTS papers_fts_insert;
DROP TRIGGER IF EXISTS papers_fts_update;
DROP TRIGGER IF EXISTS papers_fts_delete;
DROP TABLE IF EXISTS papers_fts;

-- Recreate FTS5 virtual table with authors field
CREATE VIRTUAL TABLE papers_fts USING fts5(
    title,
    authors,
    summary,
    ai_summary,
    content='papers',
    content_rowid='rowid',
    tokenize='porter unicode61'
);

-- Recreate triggers to keep FTS table in sync with papers table

-- Trigger: Insert new paper into FTS
CREATE TRIGGER papers_fts_insert AFTER INSERT ON papers 
BEGIN
    INSERT INTO papers_fts(rowid, title, authors, summary, ai_summary)
    VALUES (
        new.rowid, 
        new.title, 
        new.authors,
        COALESCE(new.summary, ''), 
        COALESCE(new.ai_summary, '')
    );
END;

-- Trigger: Update paper in FTS
CREATE TRIGGER papers_fts_update AFTER UPDATE ON papers 
BEGIN
    UPDATE papers_fts
    SET title = new.title,
        authors = new.authors,
        summary = COALESCE(new.summary, ''),
        ai_summary = COALESCE(new.ai_summary, '')
    WHERE rowid = old.rowid;
END;

-- Trigger: Delete paper from FTS
CREATE TRIGGER papers_fts_delete AFTER DELETE ON papers 
BEGIN
    DELETE FROM papers_fts WHERE rowid = old.rowid;
END;

-- Populate FTS table with existing data including authors
INSERT INTO papers_fts(rowid, title, authors, summary, ai_summary)
SELECT rowid, title, authors, COALESCE(summary, ''), COALESCE(ai_summary, '')
FROM papers;

