-- Critical Performance Indexes (Phase 2)
-- These indexes address slow analytics queries identified in API performance audit
-- Created: 2025-12-16 - API Performance Optimization
-- Note: CONCURRENTLY removed to allow running in transaction

-- Index for rating filtering in satisfaction score queries
-- This speeds up queries that filter by started_at and rating together
CREATE INDEX IF NOT EXISTS idx_vf_sessions_started_rating 
ON public.vf_sessions (started_at DESC, rating) 
WHERE rating IS NOT NULL;

-- Index for session_id on vf_turns (improves join performance)
-- This was missing and causing slow lookups when joining turns to sessions
CREATE INDEX IF NOT EXISTS idx_vf_turns_session_id 
ON public.vf_turns (session_id);

-- Covering index for common analytics queries
-- Allows index-only scans for most analytics queries, avoiding table access
CREATE INDEX IF NOT EXISTS idx_vf_sessions_analytics_covering 
ON public.vf_sessions (started_at DESC, typeuser, location_type, location_value, rating) 
INCLUDE (user_id, feedback);

-- Index for timestamp-based filtering on turns (with role filter)
-- Speeds up message count queries with date ranges
CREATE INDEX IF NOT EXISTS idx_vf_turns_timestamp_role 
ON public.vf_turns (timestamp DESC, role) 
WHERE role IN ('user', 'assistant');

-- Partial index for sessions with location data (frequently queried)
CREATE INDEX IF NOT EXISTS idx_vf_sessions_with_location 
ON public.vf_sessions (started_at DESC, location_type, location_value) 
WHERE location_type IS NOT NULL AND location_value IS NOT NULL;

-- Index for user_id lookups with date filtering
CREATE INDEX IF NOT EXISTS idx_vf_sessions_user_started 
ON public.vf_sessions (user_id, started_at DESC) 
WHERE user_id IS NOT NULL;
