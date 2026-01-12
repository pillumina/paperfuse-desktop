-- Deep Analysis V2 - Two-phase architecture with structured scoring
-- Migration: 006_deep_analysis_v2

-- Add new score fields for structured quality assessment
ALTER TABLE papers ADD COLUMN novelty_score INTEGER;
ALTER TABLE papers ADD COLUMN novelty_reason TEXT;
ALTER TABLE papers ADD COLUMN effectiveness_score INTEGER;
ALTER TABLE papers ADD COLUMN effectiveness_reason TEXT;
ALTER TABLE papers ADD COLUMN experiment_completeness_score INTEGER;
ALTER TABLE papers ADD COLUMN experiment_completeness_reason TEXT;

-- Add code availability flag for easy filtering and display
ALTER TABLE papers ADD COLUMN code_available BOOLEAN DEFAULT 0;

-- Add algorithmic insights (for Full mode analysis)
ALTER TABLE papers ADD COLUMN algorithm_flowchart TEXT;
ALTER TABLE papers ADD COLUMN time_complexity TEXT;
ALTER TABLE papers ADD COLUMN space_complexity TEXT;

-- Add analysis mode tracking ('standard' or 'full')
ALTER TABLE papers ADD COLUMN analysis_mode TEXT;

-- Add incomplete analysis flag (LaTeX download failed)
ALTER TABLE papers ADD COLUMN analysis_incomplete BOOLEAN DEFAULT 0;

-- Create indexes for new fields
CREATE INDEX IF NOT EXISTS idx_papers_code_available ON papers(code_available);
CREATE INDEX IF NOT EXISTS idx_papers_novelty_score ON papers(novelty_score DESC);
CREATE INDEX IF NOT EXISTS idx_papers_effectiveness_score ON papers(effectiveness_score DESC);
CREATE INDEX IF NOT EXISTS idx_papers_analysis_mode ON papers(analysis_mode);
