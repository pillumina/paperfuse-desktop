-- Initial database schema for PaperFuse Desktop
-- Migration: 001_initial

-- Papers table
CREATE TABLE IF NOT EXISTS papers (
    id TEXT PRIMARY KEY,                    -- arxiv_id
    title TEXT NOT NULL,
    authors TEXT NOT NULL,                  -- JSON array
    summary TEXT,                           -- Original abstract
    ai_summary TEXT,                        -- AI-generated summary
    key_insights TEXT,                      -- JSON array
    engineering_notes TEXT,
    code_links TEXT,                        -- JSON array
    tags TEXT NOT NULL DEFAULT '[]',        -- JSON array
    published_date TEXT NOT NULL,
    arxiv_url TEXT NOT NULL,
    pdf_url TEXT NOT NULL,
    filter_score INTEGER,
    filter_reason TEXT,
    is_deep_analyzed BOOLEAN DEFAULT 0,
    analysis_type TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Notes table (for Phase 2)
CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    paper_id TEXT NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Collections table (for Phase 2)
CREATE TABLE IF NOT EXISTS collections (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Collection papers junction table (for Phase 2)
CREATE TABLE IF NOT EXISTS collection_papers (
    collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    paper_id TEXT NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
    added_at TEXT NOT NULL,
    PRIMARY KEY (collection_id, paper_id)
);

-- Indexes for papers
CREATE INDEX IF NOT EXISTS idx_papers_published_date ON papers(published_date DESC);
CREATE INDEX IF NOT EXISTS idx_papers_tags ON papers(tags);
CREATE INDEX IF NOT EXISTS idx_papers_filter_score ON papers(filter_score DESC);

-- Indexes for notes
CREATE INDEX IF NOT EXISTS idx_notes_paper_id ON notes(paper_id);

-- Indexes for collection_papers
CREATE INDEX IF NOT EXISTS idx_collection_papers_collection ON collection_papers(collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_papers_paper ON collection_papers(paper_id);
