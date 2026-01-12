-- Update authors column from JSON array of strings to JSON array of objects
-- Each author object has {name: string, affiliation: string | null}

-- Step 0: Clean up ALL old triggers and FTS table to avoid conflicts
DROP TRIGGER IF EXISTS papers_ai;
DROP TRIGGER IF EXISTS papers_ad;
DROP TRIGGER IF EXISTS papers_au;
DROP TRIGGER IF EXISTS papers_fts_insert;
DROP TRIGGER IF EXISTS papers_fts_delete;
DROP TRIGGER IF EXISTS papers_fts_update;
DROP TABLE IF EXISTS papers_fts;

-- Step 1: Try to add a temporary column (will fail if exists, which is OK)
ALTER TABLE papers ADD COLUMN authors_new TEXT;

-- Step 2: Migrate data from string array to object array format
-- Old format: ["Author 1", "Author 2"]
-- New format: [{"name": "Author 1", "affiliation": null}, {"name": "Author 2", "affiliation": null}]
-- IMPORTANT: Check if authors is already in new format to prevent re-migration
-- We detect old format by checking if first element is a string (not an object)
UPDATE papers
SET authors_new = (
    SELECT '[' || GROUP_CONCAT(
        '{"name":' || json_quote(json_extract(j.value, '$')) || ',"affiliation":null}',
        ','
    ) || ']'
    FROM json_each(papers.authors) as j
)
WHERE papers.authors IS NOT NULL
  AND papers.authors != ''
  AND papers.authors != '[]'
  AND json_valid(papers.authors)
  AND json_type(papers.authors) = 'array'
  AND papers.authors_new IS NULL
  -- Only update if first element is a string (old format), not an object (new format)
  AND json_type(json_extract(papers.authors, '$[0]')) IN ('text', 'string', NULL);

-- Step 3: Copy data that's already in new format, then handle empty/invalid
-- First, copy records that are already in new format (object array)
UPDATE papers
SET authors_new = authors
WHERE authors_new IS NULL
  AND authors IS NOT NULL
  AND authors != ''
  AND json_valid(authors)
  AND json_type(authors) = 'array'
  AND json_type(json_extract(authors, '$[0]')) = 'object';

-- Then, set empty/invalid data to empty array
UPDATE papers
SET authors_new = '[]'
WHERE authors_new IS NULL;

-- Step 4: Drop the old column
ALTER TABLE papers DROP COLUMN authors;

-- Step 5: Rename the new column
ALTER TABLE papers RENAME COLUMN authors_new TO authors;

-- Step 6: Ensure no NULL values
UPDATE papers SET authors = '[]' WHERE authors IS NULL;

-- Step 7: Recreate full-text search index with new authors format
CREATE VIRTUAL TABLE papers_fts USING fts5(
    title,
    authors,
    summary,
    ai_summary,
    content='papers',
    content_rowid='rowid'
);

-- Populate FTS table with all papers
INSERT INTO papers_fts(rowid, title, authors, summary, ai_summary)
SELECT rowid, title, authors, COALESCE(summary, ''), COALESCE(ai_summary, '')
FROM papers;

-- Step 8: Recreate triggers to keep FTS in sync
CREATE TRIGGER papers_fts_insert AFTER INSERT ON papers BEGIN
    INSERT INTO papers_fts(rowid, title, authors, summary, ai_summary)
    VALUES (NEW.rowid, NEW.title, NEW.authors, COALESCE(NEW.summary, ''), COALESCE(NEW.ai_summary, ''));
END;

CREATE TRIGGER papers_fts_delete AFTER DELETE ON papers BEGIN
    INSERT INTO papers_fts(papers_fts, rowid, title, authors, summary, ai_summary)
    VALUES ('delete', OLD.rowid, OLD.title, OLD.authors, COALESCE(OLD.summary, ''), COALESCE(NEW.ai_summary, ''));
END;

CREATE TRIGGER papers_fts_update AFTER UPDATE ON papers BEGIN
    UPDATE papers_fts
    SET title = NEW.title,
        authors = NEW.authors,
        summary = COALESCE(NEW.summary, ''),
        ai_summary = COALESCE(NEW.ai_summary, '')
    WHERE rowid = OLD.rowid;
END;
