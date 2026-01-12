-- Add topics and tags to FTS search index
-- This allows searching by topics and tags

-- Drop existing FTS table
DROP TABLE IF EXISTS papers_fts;

-- Recreate FTS table with topics and tags included
-- Note: We use json_extract to access array elements for FTS indexing
CREATE VIRTUAL TABLE papers_fts USING fts5(
    title,
    authors,
    summary,
    ai_summary,
    topics,
    tags,
    content='papers',
    content_rowid='rowid',
    tokenize='porter unicode61'
);

-- Recreate triggers to keep FTS table in sync with papers table

-- Trigger for INSERT
CREATE TRIGGER papers_ai AFTER INSERT ON papers BEGIN
  INSERT INTO papers_fts(
    rowid,
    title,
    authors,
    summary,
    ai_summary,
    topics,
    tags
  )
  VALUES (
    new.rowid,
    new.title,
    new.authors,
    new.summary,
    new.ai_summary,
    new.topics,
    new.tags
  );
END;

-- Trigger for DELETE
CREATE TRIGGER papers_ad AFTER DELETE ON papers BEGIN
  INSERT INTO papers_fts(papers_fts, rowid, title, authors, summary, ai_summary, topics, tags)
  VALUES ('delete', old.rowid, old.title, old.authors, old.summary, old.ai_summary, old.topics, old.tags);
END;

-- Trigger for UPDATE
CREATE TRIGGER papers_au AFTER UPDATE ON papers BEGIN
  INSERT INTO papers_fts(papers_fts, rowid, title, authors, summary, ai_summary, topics, tags)
  VALUES ('delete', old.rowid, old.title, old.authors, old.summary, old.ai_summary, old.topics, old.tags);

  INSERT INTO papers_fts(
    rowid,
    title,
    authors,
    summary,
    ai_summary,
    topics,
    tags
  )
  VALUES (
    new.rowid,
    new.title,
    new.authors,
    new.summary,
    new.ai_summary,
    new.topics,
    new.tags
  );
END;

-- Rebuild the FTS index with existing data
INSERT INTO papers_fts(papers_fts)
VALUES ('rebuild');
