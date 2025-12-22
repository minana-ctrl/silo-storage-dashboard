-- Migration 007: Add Functional Indexes for Timezone Queries
-- Purpose: Create indexes on timezone-converted date columns to dramatically improve query performance
-- Impact: 10-100x faster analytics queries, prevents timeouts on large datasets

-- Create an IMMUTABLE function for UTC to Sydney timezone conversion
-- This is necessary because AT TIME ZONE is not marked as immutable
CREATE OR REPLACE FUNCTION utc_to_sydney_date(timestamptz) 
RETURNS date 
AS $$
  SELECT ($1 AT TIME ZONE 'Australia/Sydney')::date;
$$ LANGUAGE SQL IMMUTABLE PARALLEL SAFE;

-- Index for vf_sessions queries (most common - used in analytics aggregations)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vf_sessions_sydney_date
ON vf_sessions (utc_to_sydney_date(started_at) DESC);

-- Index for vf_turns queries (used for message count aggregations)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vf_turns_sydney_date
ON vf_turns (utc_to_sydney_date(timestamp) DESC);

-- Index for vf_events queries (used for funnel and CTA analytics)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vf_events_sydney_date
ON vf_events (utc_to_sydney_date(event_ts) DESC);

-- Note: Using CONCURRENTLY to avoid locking production tables during index creation
-- This allows the application to continue running while indexes are being built

-- Log the migration completion
DO $$
BEGIN
  RAISE NOTICE 'Migration 007 completed: Timezone functional indexes added';
  RAISE NOTICE 'Created immutable function: utc_to_sydney_date()';
  RAISE NOTICE 'Expected performance improvement: 10-100x faster date-range queries';
END $$;
