-- Performance Optimization Indexes (Phase 1)
-- These indexes significantly improve query performance for analytics and conversation endpoints
-- Created: API Performance Optimization Plan

-- Critical date range query optimization for analytics
CREATE INDEX IF NOT EXISTS idx_vf_sessions_started_at ON public.vf_sessions (started_at DESC);
CREATE INDEX IF NOT EXISTS idx_vf_sessions_started_typeuser ON public.vf_sessions (started_at, typeuser);
CREATE INDEX IF NOT EXISTS idx_vf_sessions_started_location ON public.vf_sessions (started_at, location_type, location_value);

-- Event timestamp queries for funnel analysis
CREATE INDEX IF NOT EXISTS idx_vf_events_ts ON public.vf_events (event_ts DESC);

-- Turn timestamp and text filtering for conversations
CREATE INDEX IF NOT EXISTS idx_vf_turns_timestamp ON public.vf_turns (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_vf_transcripts_updated_at ON public.vf_transcripts (updated_at DESC);

-- Covering index for transcript summaries (reduces joins)
CREATE INDEX IF NOT EXISTS idx_vf_transcripts_summary ON public.vf_transcripts (created_at DESC, session_id, user_id);

-- User-based filtering for conversations
CREATE INDEX IF NOT EXISTS idx_vf_sessions_user_id ON public.vf_sessions (user_id);

-- Additional composite index for common filter combinations
CREATE INDEX IF NOT EXISTS idx_vf_sessions_typeuser_location ON public.vf_sessions (typeuser, location_type, location_value);


