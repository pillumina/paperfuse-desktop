-- Add spam/archived functionality to papers
-- This allows users to mark papers as spam (unwanted) without deleting them
-- Spam papers won't appear in main list but will be kept to prevent re-fetching

-- Add is_spam column to papers table
ALTER TABLE papers ADD COLUMN is_spam BOOLEAN DEFAULT 0;

-- Create index for faster spam filtering
CREATE INDEX IF NOT EXISTS idx_papers_is_spam ON papers(is_spam);

-- Update FTS triggers to include spam status (optional, for search)
DROP TRIGGER IF EXISTS papers_fts_insert;
DROP TRIGGER IF EXISTS papers_fts_delete;
DROP TRIGGER IF EXISTS papers_fts_update;

CREATE TRIGGER papers_fts_insert AFTER INSERT ON papers BEGIN
    INSERT INTO papers_fts(rowid, title, authors, summary, ai_summary)
    VALUES (NEW.rowid, NEW.title, NEW.authors, COALESCE(NEW.summary, ''), COALESCE(NEW.ai_summary, ''));
END;

CREATE TRIGGER papers_fts_delete AFTER DELETE ON papers BEGIN
    INSERT INTO papers_fts(papers_fts, rowid, title, authors, summary, ai_summary)
    VALUES ('delete', OLD.rowid, OLD.title, OLD.authors, COALESCE(OLD.summary, ''), COALESCE(OLD.ai_summary, ''));
END;

CREATE TRIGGER papers_fts_update AFTER UPDATE ON papers BEGIN
    UPDATE papers_fts
    SET title = NEW.title,
        authors = NEW.authors,
        summary = COALESCE(NEW.summary, ''),
        ai_summary = COALESCE(NEW.ai_summary, '')
    WHERE rowid = OLD.rowid;
END;
