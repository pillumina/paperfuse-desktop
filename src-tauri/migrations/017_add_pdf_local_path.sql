-- Add local PDF path tracking to papers table
-- This allows tracking whether a PDF has been downloaded locally

ALTER TABLE papers ADD COLUMN pdf_local_path TEXT;

-- Create index for faster queries on downloaded PDFs
CREATE INDEX IF NOT EXISTS idx_papers_pdf_local_path ON papers(pdf_local_path);
