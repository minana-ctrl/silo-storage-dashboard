-- Voiceflow Sessions Table (analytics-ready final state)
CREATE TABLE IF NOT EXISTS public.vf_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL UNIQUE,
  user_id text NULL,
  
  transcript_id text NULL,
  transcript_row_id uuid NULL REFERENCES public.vf_transcripts(id),
  
  typeuser text NULL CHECK (typeuser in ('tenant','investor','owneroccupier')),
  location_type text NULL CHECK (location_type in ('rental','investor','owneroccupier')),
  location_value text NULL,
  
  rating int NULL CHECK (rating between 1 and 5),
  feedback text NULL,
  CONSTRAINT feedback_rule CHECK (
    feedback IS NULL OR (rating IS NOT NULL AND rating between 1 and 3)
  ),
  
  started_at timestamptz NULL,
  ended_at timestamptz NULL,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vf_sessions_typeuser ON public.vf_sessions (typeuser);
CREATE INDEX IF NOT EXISTS idx_vf_sessions_location ON public.vf_sessions (location_type, location_value);
CREATE INDEX IF NOT EXISTS idx_vf_sessions_created_at ON public.vf_sessions (created_at);
CREATE INDEX IF NOT EXISTS idx_vf_sessions_transcript_id ON public.vf_sessions (transcript_id);

-- Voiceflow Events Table (funnel tracking + CTA visibility)
CREATE TABLE IF NOT EXISTS public.vf_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL REFERENCES public.vf_sessions(session_id),
  user_id text NULL,
  
  event_type text NOT NULL,
  event_ts timestamptz NOT NULL DEFAULT now(),
  
  typeuser text NULL CHECK (typeuser in ('tenant','investor','owneroccupier')),
  location_type text NULL CHECK (location_type in ('rental','investor','owneroccupier')),
  location_value text NULL,
  rating int NULL CHECK (rating between 1 and 5),
  feedback text NULL,
  
  cta_id text NULL,
  cta_name text NULL,
  
  meta jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_vf_events_session_ts ON public.vf_events (session_id, event_ts);
CREATE INDEX IF NOT EXISTS idx_vf_events_type_ts ON public.vf_events (event_type, event_ts);
CREATE INDEX IF NOT EXISTS idx_vf_events_cta_id ON public.vf_events (cta_id);

-- Voiceflow Transcripts Table (raw storage)
CREATE TABLE IF NOT EXISTS public.vf_transcripts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transcript_id text NULL UNIQUE,
  session_id text NOT NULL,
  user_id text NULL,
  
  source text NOT NULL DEFAULT 'voiceflow',
  
  started_at timestamptz NULL,
  ended_at timestamptz NULL,
  
  raw jsonb NOT NULL,
  raw_hash text NULL,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vf_transcripts_session_id ON public.vf_transcripts (session_id);
CREATE INDEX IF NOT EXISTS idx_vf_transcripts_transcript_id ON public.vf_transcripts (transcript_id);
CREATE INDEX IF NOT EXISTS idx_vf_transcripts_created_at ON public.vf_transcripts (created_at);

-- Voiceflow Turns Table (normalized messages)
CREATE TABLE IF NOT EXISTS public.vf_turns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transcript_row_id uuid NOT NULL REFERENCES public.vf_transcripts(id) ON DELETE CASCADE,
  session_id text NOT NULL,
  
  turn_index int NOT NULL,
  role text NOT NULL CHECK (role in ('user','assistant','system','tool','trace')),
  
  text text NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  
  timestamp timestamptz NULL,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE (transcript_row_id, turn_index)
);

CREATE INDEX IF NOT EXISTS idx_vf_turns_session_turn ON public.vf_turns (session_id, turn_index);
CREATE INDEX IF NOT EXISTS idx_vf_turns_transcript_id ON public.vf_turns (transcript_row_id);
CREATE INDEX IF NOT EXISTS idx_vf_turns_role ON public.vf_turns (role);

-- Full-text search for keywords/topics
ALTER TABLE public.vf_turns
ADD COLUMN IF NOT EXISTS text_tsv tsvector GENERATED ALWAYS AS (to_tsvector('english', COALESCE(text,''))) STORED;

CREATE INDEX IF NOT EXISTS idx_vf_turns_text_tsv ON public.vf_turns USING gin (text_tsv);
