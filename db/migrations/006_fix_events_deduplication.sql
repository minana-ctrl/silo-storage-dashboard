-- Migration 006: Fix Events Table Deduplication
-- Purpose: Remove duplicate events and add unique constraint to prevent future duplicates
-- Impact: Fixes inflated CTA metrics and funnel conversion rates

-- First, remove existing duplicates (keep the earliest by id)
-- Using all relevant columns to identify true duplicates
DELETE FROM vf_events a
USING vf_events b
WHERE a.id > b.id
  AND a.session_id = b.session_id
  AND a.event_type = b.event_type
  AND a.event_ts = b.event_ts
  AND COALESCE(a.cta_id, '') = COALESCE(b.cta_id, '')
  AND COALESCE(a.cta_name, '') = COALESCE(b.cta_name, '');

-- Add unique constraint to prevent future duplicates
-- Use a composite unique index with NULLS NOT DISTINCT (PostgreSQL 15+)
-- This treats NULL values as equal for uniqueness checks
CREATE UNIQUE INDEX unique_event_idx
ON vf_events (session_id, event_type, event_ts, cta_id, cta_name)
NULLS NOT DISTINCT;

-- Log the migration completion
DO $$
BEGIN
  RAISE NOTICE 'Migration 006 completed: Events deduplication index added';
  RAISE NOTICE 'Duplicate events removed and future duplicates prevented';
END $$;
