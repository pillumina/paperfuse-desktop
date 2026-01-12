-- Migration: Backfill fetch history for existing papers
-- This migration creates fetch history entries for papers that were saved before
-- the fetch history tracking feature was implemented.

-- Group papers by date and create one fetch history entry per day
WITH dated_papers AS (
    SELECT
        date(created_at) as fetch_date,
        MIN(created_at) as started_at,
        MAX(created_at) as completed_at,
        COUNT(*) as papers_fetched,
        COUNT(CASE WHEN filter_score IS NOT NULL THEN 1 END) as papers_analyzed,
        COUNT(*) as papers_saved,
        0 as papers_filtered,
        json_group_array(
            json_object(
                'id', id,
                'title', title,
                'arxiv_id', arxiv_id
            )
        ) as papers
    FROM papers
    WHERE NOT EXISTS (
        -- Only include papers that are not already tracked in fetch_history
        SELECT 1 FROM fetch_history
    )
    GROUP BY date(created_at)
    ORDER BY fetch_date DESC
)
INSERT INTO fetch_history (
    id,
    started_at,
    completed_at,
    status,
    papers_fetched,
    papers_analyzed,
    papers_saved,
    papers_filtered,
    llm_provider,
    max_papers,
    error_message,
    papers
)
SELECT
    lower(hex(randomblob(16))) as id,
    started_at,
    completed_at,
    'completed' as status,
    papers_fetched,
    papers_analyzed,
    papers_saved,
    papers_filtered,
    NULL as llm_provider,
    NULL as max_papers,
    NULL as error_message,
    papers
FROM dated_papers;
