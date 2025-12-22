# Development Guide

This document replaces the scattered status markdowns in the repo. Follow it whenever you set up a new environment, run migrations, or operate the sync pipeline.

## 1. Prerequisites

- Node.js 18+ and npm 9+
- PostgreSQL 14+ (managed instances fine)
- Voiceflow Dialog Manager account with Analytics API enabled
- `.env.local` with the variables below

## 2. Environment Variables

Create `.env.local` at the project root:

| Key | Usage | Notes |
| --- | --- | --- |
| `DATABASE_URL` | `lib/db.ts`, scripts | Postgres connection string with SSL when hosted (Railway/Neon/etc). |
| `PROJECT_ID`, `API_KEY`, `VERSION_ID` | `lib/env.ts`, Voiceflow clients | Accepts alternates (`VOICEFLOW_PROJECT_ID`, `VOICEFLOW_API_KEY`, `VOICEFLOW_VERSION_ID`). Required for real analytics/syncs. |
| `JWT_SECRET` | `lib/auth.ts`, middleware | 32+ chars. Used for auth cookies and `/api/sync-transcripts` fallback auth. |
| `CRON_SECRET` | `/api/sync-transcripts` | Optional. Bearer token that scheduled jobs or scripts use when no session cookie exists. Falls back to `JWT_SECRET`. |
| `NEXT_PUBLIC_BASE_URL` (optional) | Links & redirects | Helpful when deploying behind custom domains. |

Keep secrets out of version control. Example:

```
DATABASE_URL=postgres://user:pass@localhost:5432/silo
PROJECT_ID=xxxx
VERSION_ID=xxxx
API_KEY=VF.DM.xxxxxxxxx
JWT_SECRET=change-me-now-super-long
CRON_SECRET=separate-cron-token
```

## 3. Install & Run

```bash
npm install
npm run dev        # Next.js dev server (localhost:3000)
npm run lint       # ESLint via next lint
npm run build      # Production build
npm start          # Runs scripts/start.js (migrations + next start)
```

`scripts/start.js` automatically runs `scripts/migrate.js` before launching the production server, guaranteeing database schema alignment on deploy.

## 4. Database & Migrations

- `scripts/migrate.js`: runs every SQL file in `db/migrations` in order. Invoke manually with `node scripts/migrate.js`.
- `scripts/seed-admin.js`: creates a default admin user (email `admin@silostorage.com`, password `Admin123!`). Update the credentials immediately after first login.
- `scripts/seed-additional-admins.js`: bulk creates admins from a JSON list.

### Resetting Data

- `scripts/full-reset-and-sync.js`: wipes `vf_*` tables, triggers a forced `/api/sync-transcripts`, and prints validation stats.
- `scripts/force-full-sync.js`: hits `/api/sync-transcripts` with `{ force: true }` without clearing tables first.
- `scripts/cleanup-test-data.js`: removes demo objects created during manual testing.

Each script expects `.env.local` to be loaded; they call `dotenv` themselves.

## 5. Voiceflow Sync Workflow

1. Dashboard users press **Refresh Data** in `app/analytics/page.tsx`, or a scheduled job posts to `/api/sync-transcripts`.
2. `/api/sync-transcripts/route.ts` authenticates via `CRON_SECRET` header or the `auth-token` cookie, then calls `performSync` in `lib/sync.ts`.
3. `performSync`:
   - Determines the last synced timestamp (or fetches everything when `force=true`).
   - Pages through transcript summaries via `lib/voiceflowTranscripts.ts`.
   - Downloads full transcripts in batches (10 concurrent requests).
   - Ingests transcripts/turns/events with parallel workers (5 concurrent) defined in `lib/transcriptIngestion.ts`.
   - Writes derived session analytics for use by `lib/analyticsQueries.ts`.
4. On success, the route calls `clearAnalyticsCache()` so `/api/analytics` serves fresh aggregates.

For local testing without Voiceflow credentials, the app automatically returns demo data (see `app/api/analytics` and `app/api/conversations`).

## 6. Authentication & Access

- Login lives at `/login` and talks to `/api/auth/login`.
- Successful logins set an HTTP-only `auth-token` cookie (7 day TTL).
- `middleware.ts` blocks access to everything except `/login`, `/api/auth/*`, and static assets when the cookie is missing.
- Admin-only APIs (`/api/users`, `/api/auth/change-password`, `/api/sync-transcripts` when using cookies) verify the JWT payload server-side.

## 7. Scripts & Tooling Reference

| Script | Command | Purpose |
| --- | --- | --- |
| `scripts/start.js` | `npm start` | Run migrations, then `next start`. |
| `scripts/migrate.js` | `node scripts/migrate.js` | Apply outstanding SQL migrations. |
| `scripts/seed-admin.js` | `node scripts/seed-admin.js` | Seed default admin account. |
| `scripts/full-reset-and-sync.js` | `node scripts/full-reset-and-sync.js` | Clear vf tables, trigger forced sync, print counts. |
| `scripts/force-full-sync.js` | `node scripts/force-full-sync.js` | Trigger forced sync without wiping data. |
| `scripts/check-satisfaction.js` | `node scripts/check-satisfaction.js` | Spot-check satisfaction scores and ratings. |
| `scripts/test-cron.sh` | `./scripts/test-cron.sh` | Curl `/api/sync-transcripts` with the cron token (used by Railway cron jobs). |

## 8. Deployment

- Railway is the primary target (`railway.json`). The `start` command already handles migrations, so Railway can simply run `npm start`.
- Configure **variables** in Railway’s dashboard: `DATABASE_URL`, `PROJECT_ID`, `API_KEY`, `VERSION_ID`, `JWT_SECRET`, `CRON_SECRET`.
- Add a scheduled job (e.g., every 15 minutes) that hits `/api/sync-transcripts` with the Bearer token to keep data fresh.
- Monitor logs for `[Sync]` and `[Analytics]` prefixes to understand ingestion health.

## 9. Troubleshooting

- `npm run lint` fails immediately when imports reference deleted files—run it after major refactors.
- Analytics returning demo data? Validate that `PROJECT_ID`, `API_KEY`, and `VERSION_ID` are all set in the runtime environment.
- Sync stuck? Use `scripts/full-reset-and-sync.js` locally to verify Voiceflow credentials before debugging production.

This guide should replace the many `*_COMPLETE.md` and audit files that previously documented tribal knowledge. Update it whenever you add a new workflow.




