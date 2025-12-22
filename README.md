# Silo Storage Dashboard

A Next.js 14 dashboard for monitoring AI agent analytics, troubleshooting conversation flows, and keeping Voiceflow data in sync with a PostgreSQL warehouse.

## Documentation

The previous ad-hoc audit/checklist markdowns have been replaced with a dedicated `docs/` folder:

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) – high-level system overview, data flow, and directories
- [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md) – setup, environment variables, scripts, and deployment
- [`docs/API.md`](docs/API.md) – internal API reference for the dashboard
- [`docs/voiceflow/`](docs/voiceflow) – Voiceflow API reference material

## Quick Start

### Prerequisites

- Node.js ≥18 and npm ≥9
- Running PostgreSQL instance
- Voiceflow Dialog Manager project with Analytics API access

### Install & Run

1. Install dependencies
   ```bash
   npm install
   ```
2. Create `.env.local` with at least:
   ```
   DATABASE_URL=postgres://user:pass@localhost:5432/silo
   PROJECT_ID=your_voiceflow_project
   VERSION_ID=your_voiceflow_env
   API_KEY=VF.DM.your_api_key
   JWT_SECRET=change-me-super-long
   CRON_SECRET=optional-cron-token
   ```
   See [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md#2-environment-variables) for the full list and details.
3. Start the dev server
   ```bash
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000)

### Build & Lint

```bash
npm run lint
npm run build
npm start   # runs scripts/start.js (migrations + next start)
```

## Features

- **Analytics Dashboard** – conversations, message volume, satisfaction score, click-through, and funnel stats
- **Time Range Controls** – rolling presets (7/14/30/90 days) or custom date selection
- **Conversation Explorer** – list and inspect raw transcripts with debug toggles and local notes
- **Voiceflow Integration** – syncs transcripts/events via `/api/sync-transcripts`, falls back to live Voiceflow APIs when DB data is missing
- **Admin Tools** – manage users, passwords, and trigger data refreshes directly from the UI

## Project Structure

```
├── app/
│   ├── analytics/            # Analytics dashboard page
│   ├── conversations/        # Transcript explorer
│   ├── login/                # Auth shell
│   ├── api/                  # Route handlers (analytics, sync, auth, users, etc.)
│   └── layout.tsx            # Application shell + fonts
├── components/               # Reusable UI (charts, cards, inspectors)
├── lib/                      # Database, Voiceflow clients, query cache, sync, auth helpers
├── db/migrations/            # SQL schema for vf_* tables and auth/users
├── scripts/                  # Migration/startup/sync utilities
├── docs/                     # Architecture, development, API, and Voiceflow references
└── public/                   # Static assets
```

## Design System

- Primary: `#ec2f2f`
- Secondary: `#000000`
- Typography: Metropolis (body) + Robostic Futuristic (headings) loaded in `app/layout.tsx`

## Voiceflow Integration

`lib/voiceflow.ts` uses the Voiceflow Analytics v2 endpoint to fetch interactions, users, sessions, and top intents. Transcript ingestion relies on `lib/voiceflowTranscripts.ts` for summaries and dialog turns. See [`docs/API.md`](docs/API.md) and [`docs/voiceflow/AnalyticsApi.md`](docs/voiceflow/AnalyticsApi.md) for payload details.

## Deployment Notes

- Production `npm start` runs `scripts/start.js`, which applies database migrations before launching `next start`.
- Schedule a cron (Railway or similar) to hit `/api/sync-transcripts` with `Authorization: Bearer <CRON_SECRET>` so analytics stay fresh.









