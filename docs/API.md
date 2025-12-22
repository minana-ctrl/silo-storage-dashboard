# API Reference

The dashboard exposes a small set of internal APIs under `/api`. All routes are implemented as Next.js Route Handlers inside `app/api/**`. This document focuses on the production endpoints that matter after the cleanup.

## Authentication

| Endpoint | Method | Auth | Description |
| --- | --- | --- | --- |
| `/api/auth/login` | `POST` | None | Verifies credentials, sets the `auth-token` HTTP-only cookie, and returns user metadata. |
| `/api/auth/logout` | `POST` | Cookie | Clears the auth cookie. |
| `/api/auth/me` | `GET` | Cookie | Returns the currently authenticated user or `401`. |
| `/api/auth/change-password` | `POST` | Cookie | Allows logged-in users to rotate their password (requires current password). |

### Login Request

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@silostorage.com",
  "password": "••••••••"
}
```

Responses:
- `200 OK` with `{ success: true, user: { ... } }` on success
- `401 Unauthorized` for invalid credentials (rate limited via `lib/rate-limit.ts`)

## Analytics & Data

| Endpoint | Method | Auth | Body | Description |
| --- | --- | --- | --- | --- |
| `/api/analytics` | `POST` | Cookie | `{ "days": number }` or `{ "startDate": "YYYY-MM-DD", "endDate": "YYYY-MM-DD" }` | Aggregates conversation, message, satisfaction, funnel, and click-through metrics. |
| `/api/conversations` | `GET` | Cookie | Query params: `limit`, `cursor`, `q`, `platform`, `startTime`, `endTime` | Returns paginated transcript summaries backed by Postgres with Voiceflow fallback. |
| `/api/conversations/[id]` | `GET` | Cookie | Path parameter `id` | Returns turns/messages for a single transcript. |
| `/api/topics`, `/api/knowledge-base`, etc. | `GET` | Cookie | — | Support pages fetch their own data from the same Voiceflow-derived tables. |

### `/api/analytics` Example

```http
POST /api/analytics
Content-Type: application/json

{ "days": 30 }
```

Returns:
```json
{
  "metrics": {
    "totalConversations": 142,
    "incomingMessages": 601,
    "averageInteractions": 4.2,
    "conversationsChange": 12.5,
    "messagesChange": -8.1
  },
  "timeSeries": [ { "date": "2025-12-10", "conversations": 8, "messages": 22 }, ... ],
  "clickThrough": { "rent": 120, "sales": 48, "ownerOccupier": 22, "investor": 19 },
  "locationBreakdown": { "rent": { "huskisson": 12, ... }, ... },
  "topIntents": [ { "name": "book_tour", "count": 31 }, ... ],
  "funnel": { "rent": { "clicks": 120, "locationSelection": 45 }, ... },
  "isDemo": false
}
```

Notes:
- When Voiceflow credentials are missing, the API returns deterministic demo data with `isDemo: true`.
- Results are cached for 5 minutes via `lib/queryCache.ts`. Triggering `/api/sync-transcripts` clears the cache.

### `/api/conversations` Query Parameters

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `limit` | number | 25 | Max transcripts per page (clamped to 100). |
| `cursor` | string | — | Pagination cursor returned from previous calls. |
| `q` | string | — | Full-text search term (matches `vf_turns.text_tsv`). |
| `platform` | `"web" \| "whatsapp" \| ...` | — | Filters by Voiceflow platform metadata. |
| `startTime` / `endTime` | ISO date string | — | Date range filter (UTC). |

## Sync & Data Maintenance

| Endpoint | Method | Auth | Body | Description |
| --- | --- | --- | --- | --- |
| `/api/sync-transcripts` | `POST` | `Authorization: Bearer <CRON_SECRET>` **or** `auth-token` cookie | `{ "force": boolean }` | Runs the Voiceflow sync pipeline (`lib/sync.ts`). When `force=true`, ignores the last sync timestamp and fetches everything. |

- The same route exposes `GET` for local development to trigger a sync without auth (guarded by `NODE_ENV === 'development'`).
- Sync responses include `{ success, synced, failed, errors[] }`. Successful runs call `clearAnalyticsCache()` so charts refresh automatically.

## User Administration

| Endpoint | Method | Auth | Description |
| --- | --- | --- | --- |
| `/api/users` | `GET` | Admin cookie | Lists all users. |
| `/api/users` | `POST` | Admin cookie | Creates a new user, auto-generates a temporary password, and returns it in the response. |
| `/api/users?id=<userId>` | `DELETE` | Admin cookie | Soft-deletes a user (sets `is_active=false`). Prevents removing the last admin. |

These routes all live in `app/api/users/route.ts` and reuse the helpers from `lib/auth.ts`.

## Error Handling

- All endpoints return JSON with an `error` string on failure.
- Unexpected exceptions bubble to `500` with `{ error: "Internal server error" }`.
- Authentication failures use standard codes:
  - `401 Unauthorized`: missing or invalid credentials
  - `403 Forbidden`: authenticated but lacks privileges

## Deprecations

Development-only routes such as `/api/test-*`, `/api/debug-*`, and `/api/inspect-*` will be removed during the cleanup to avoid context rot. Do not build new features on top of them.

Keep this file updated whenever you introduce or retire an API route.




