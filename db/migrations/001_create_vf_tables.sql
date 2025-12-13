-- Voiceflow Sessions Table (analytics-ready final state)
create table if not exists public.vf_sessions (
  id uuid primary key default gen_random_uuid(),
  session_id text not null unique,
  user_id text null,
  
  transcript_id text null,
  transcript_row_id uuid null references public.vf_transcripts(id),
  
  typeuser text null check (typeuser in ('tenant','investor','owneroccupier')),
  location_type text null check (location_type in ('rental','investor','owneroccupier')),
  location_value text null,
  
  rating int null check (rating between 1 and 5),
  feedback text null,
  constraint feedback_rule check (
    feedback is null OR (rating is not null and rating between 1 and 3)
  ),
  
  started_at timestamptz null,
  ended_at timestamptz null,
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_vf_sessions_typeuser on public.vf_sessions (typeuser);
create index if not exists idx_vf_sessions_location on public.vf_sessions (location_type, location_value);
create index if not exists idx_vf_sessions_created_at on public.vf_sessions (created_at);
create index if not exists idx_vf_sessions_transcript_id on public.vf_sessions (transcript_id);

---

-- Voiceflow Events Table (funnel tracking + CTA visibility)
create table if not exists public.vf_events (
  id uuid primary key default gen_random_uuid(),
  session_id text not null references public.vf_sessions(session_id),
  user_id text null,
  
  event_type text not null,
  event_ts timestamptz not null default now(),
  
  typeuser text null check (typeuser in ('tenant','investor','owneroccupier')),
  location_type text null check (location_type in ('rental','investor','owneroccupier')),
  location_value text null,
  rating int null check (rating between 1 and 5),
  feedback text null,
  
  cta_id text null,
  cta_name text null,
  
  meta jsonb not null default '{}'::jsonb
);

create index if not exists idx_vf_events_session_ts on public.vf_events (session_id, event_ts);
create index if not exists idx_vf_events_type_ts on public.vf_events (event_type, event_ts);
create index if not exists idx_vf_events_cta_id on public.vf_events (cta_id);

---

-- Voiceflow Transcripts Table (raw storage)
create table if not exists public.vf_transcripts (
  id uuid primary key default gen_random_uuid(),
  transcript_id text null unique,
  session_id text not null,
  user_id text null,
  
  source text not null default 'voiceflow',
  
  started_at timestamptz null,
  ended_at timestamptz null,
  
  raw jsonb not null,
  raw_hash text null,
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_vf_transcripts_session_id on public.vf_transcripts (session_id);
create index if not exists idx_vf_transcripts_transcript_id on public.vf_transcripts (transcript_id);
create index if not exists idx_vf_transcripts_created_at on public.vf_transcripts (created_at);

---

-- Voiceflow Turns Table (normalized messages)
create table if not exists public.vf_turns (
  id uuid primary key default gen_random_uuid(),
  transcript_row_id uuid not null references public.vf_transcripts(id) on delete cascade,
  session_id text not null,
  
  turn_index int not null,
  role text not null check (role in ('user','assistant','system','tool','trace')),
  
  text text null,
  payload jsonb not null default '{}'::jsonb,
  
  timestamp timestamptz null,
  
  created_at timestamptz not null default now(),
  
  unique (transcript_row_id, turn_index)
);

create index if not exists idx_vf_turns_session_turn on public.vf_turns (session_id, turn_index);
create index if not exists idx_vf_turns_transcript_id on public.vf_turns (transcript_row_id);
create index if not exists idx_vf_turns_role on public.vf_turns (role);

-- Full-text search for keywords/topics
alter table public.vf_turns
add column if not exists text_tsv tsvector generated always as (to_tsvector('english', coalesce(text,''))) stored;

create index if not exists idx_vf_turns_text_tsv on public.vf_turns using gin (text_tsv);
