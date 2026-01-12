-- Fix over-nested authors data caused by migration 014 running multiple times
-- This migration unwraps the nested structure to get back to the correct format

-- Check if this migration already ran by checking if we have the marker
-- If authors data is already in correct format (not nested), skip
-- We detect nested data by checking if any author has a "name" field that is an object

-- Only run if we detect nested authors
-- Create a temporary column
ALTER TABLE papers ADD COLUMN authors_fixed TEXT;

-- For each paper, extract and fix authors
-- We need to recursively extract the innermost name field from nested structures
UPDATE papers
SET authors_fixed = (
    SELECT '[' || GROUP_CONCAT(
        CASE
            -- Check if this author entry is already in correct format
            WHEN json_extract(j.value, '$.name') IS NOT NULL
                 AND json_type(json_extract(j.value, '$.name')) IN ('text', 'string', NULL)
            THEN
                json_extract(j.value, '$')
            -- Check if name field itself is nested (has its own name field)
            WHEN json_extract(j.value, '$.name') IS NOT NULL
                 AND json_type(json_extract(j.value, '$.name')) = 'object'
            THEN
                -- Recursively extract: use JSONPath to get the deepest name
                '{"name":' ||
                json_quote(
                    COALESCE(
                        -- Try deep paths
                        json_extract(j.value, '$.name.name.name.name.name'),
                        json_extract(j.value, '$.name.name.name.name'),
                        json_extract(j.value, '$.name.name.name'),
                        json_extract(j.value, '$.name.name'),
                        json_extract(j.value, '$.name'),
                        'Unknown'
                    )
                ) || ',"affiliation":null}'
            -- If it's a simple string, wrap it
            WHEN json_type(j.value) IN ('text', 'string')
            THEN
                '{"name":' || json_quote(j.value) || ',"affiliation":null}'
            ELSE
                '{"name":"Unknown","affiliation":null}'
        END,
        ','
    ) || ']'
    FROM json_each(papers.authors) as j
    WHERE json_valid(papers.authors)
)
WHERE json_valid(authors)
  AND authors IS NOT NULL
  AND authors != '[]'
  AND authors_fixed IS NULL;

-- For papers that weren't updated, copy existing data or set to empty array
-- First, copy records that are already in correct format (not nested)
UPDATE papers
SET authors_fixed = authors
WHERE authors_fixed IS NULL
  AND authors IS NOT NULL
  AND authors != '[]'
  AND json_valid(authors);

-- Then, set empty/invalid data to empty array
UPDATE papers
SET authors_fixed = '[]'
WHERE authors_fixed IS NULL;

-- Replace the old column
ALTER TABLE papers DROP COLUMN authors;
ALTER TABLE papers RENAME COLUMN authors_fixed TO authors;

-- Ensure no NULL values
UPDATE papers SET authors = '[]' WHERE authors IS NULL;

-- Rebuild FTS index
DROP TRIGGER IF EXISTS papers_fts_insert;
DROP TRIGGER IF EXISTS papers_fts_delete;
DROP TRIGGER IF EXISTS papers_fts_update;
DROP TABLE IF EXISTS papers_fts;

CREATE VIRTUAL TABLE papers_fts USING fts5(
    title,
    authors,
    summary,
    ai_summary,
    content='papers',
    content_rowid='rowid'
);

INSERT INTO papers_fts(rowid, title, authors, summary, ai_summary)
SELECT rowid, title, authors, COALESCE(summary, ''), COALESCE(ai_summary, '')
FROM papers;

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
