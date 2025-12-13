# Database Refactor - Testing & Validation Guide

## Phase 6: Testing & Migration Complete

All core implementation is now complete. This guide will help you test and validate the database-backed transcript storage system.

---

## Files Created

### Database & Connection
- ✅ `db/migrations/001_create_vf_tables.sql` - Schema with 4 tables
- ✅ `lib/db.ts` - Postgres connection pool

### Ingestion Pipeline
- ✅ `lib/stateReconstructor.ts` - Hybrid state reconstruction (properties + traces)
- ✅ `lib/eventInference.ts` - Event inference for funnel tracking
- ✅ `lib/transcriptIngestion.ts` - Core ingestion orchestration

### Sync Endpoint
- ✅ `app/api/sync-transcripts/route.ts` - POST (Railway Cron) + GET (local dev)

### Analytics Refactor
- ✅ `lib/analyticsQueries.ts` - SQL queries for all analytics metrics
- ✅ `app/api/analytics/route.ts` - Updated to use database queries

### Conversations Refactor
- ✅ `lib/conversationQueries.ts` - Transcript retrieval queries
- ✅ `app/api/conversations/route.ts` - Updated to query vf_transcripts
- ✅ `app/api/conversations/[id]/route.ts` - Updated to query vf_turns

### Dependencies
- ✅ `pg` and `@types/pg` - Installed

---

## Quick Start

### 1. Set Up Railway Postgres Database

**In Railway Dashboard:**

1. Go to your project
2. Click **+ Create** → **Database** → **PostgreSQL**
3. Railway automatically creates `DATABASE_URL` environment variable
4. Copy the connection string to your `.env.local`

### 2. Run Database Migration

**Option A: Via Railway CLI**

```bash
# Copy connection string from Railway dashboard
export DATABASE_URL="postgresql://user:password@host:port/db"

# Run migration using psql
psql $DATABASE_URL < db/migrations/001_create_vf_tables.sql
```

**Option B: Programmatically (from Node)**

```bash
psql -U user -h host -d database -f db/migrations/001_create_vf_tables.sql
```

### 3. Verify Schema

Connect to your database and run:

```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name LIKE 'vf_%';

-- Should show: vf_sessions, vf_events, vf_transcripts, vf_turns
```

### 4. Test Initial Sync (Local Development)

```bash
# Start dev server
npm run dev

# In another terminal, trigger manual sync
curl http://localhost:3000/api/sync-transcripts

# Response should be:
# {
#   "success": true,
#   "synced": 0,
#   "failed": 0,
#   "errors": []
# }
```

**Note:** If you have no Voiceflow credentials set, this returns empty. Set `VOICEFLOW_API_KEY` and `PROJECT_ID` in `.env.local`.

---

## Full Test Sequence

### Step 1: Add Voiceflow Credentials

```bash
# .env.local
PROJECT_ID=your_voiceflow_project_id
VOICEFLOW_API_KEY=VF.DM_xxxx
DATABASE_URL=postgresql://...
CRON_SECRET=your_random_secret_here
```

### Step 2: Sync Transcripts

```bash
# Development mode (GET)
curl http://localhost:3000/api/sync-transcripts

# Or with curl options for debugging
curl -v http://localhost:3000/api/sync-transcripts

# Production mode (POST with secret)
curl -X POST http://your-app.railway.app/api/sync-transcripts \
  -H "Authorization: Bearer your_cron_secret"
```

Expected response:
```json
{
  "success": true,
  "synced": 5,
  "failed": 0,
  "errors": []
}
```

### Step 3: Verify Database Population

Connect to your Railway Postgres database:

```sql
-- Check sessions
SELECT COUNT(*) FROM vf_sessions;
-- Should show N sessions

-- Check events
SELECT COUNT(*) FROM vf_events;
-- Should show M events

-- Check transcripts
SELECT COUNT(*) FROM vf_transcripts;
-- Should show N transcripts

-- Check turns
SELECT COUNT(*) FROM vf_turns;
-- Should show P turns

-- View sample session with state
SELECT 
  session_id, typeuser, location_type, location_value, rating, feedback
FROM vf_sessions 
LIMIT 5;

-- View sample events
SELECT 
  session_id, event_type, event_ts, typeuser
FROM vf_events 
LIMIT 10;
```

### Step 4: Test Analytics Endpoint

```bash
# Fetch analytics for last 7 days
curl -X POST http://localhost:3000/api/analytics \
  -H "Content-Type: application/json" \
  -d '{ "days": 7 }'

# Or with custom date range
curl -X POST http://localhost:3000/api/analytics \
  -H "Content-Type: application/json" \
  -d '{
    "startDate": "2024-12-01",
    "endDate": "2024-12-13"
  }'
```

Expected response includes:
- ✅ `metrics.totalConversations` (from vf_sessions count)
- ✅ `metrics.incomingMessages` (from vf_turns count)
- ✅ `satisfactionScore.average` (from rating calculations)
- ✅ `clickThrough` breakdown (tenant, investor, owneroccupier)
- ✅ `locationBreakdown` (rent, investor, owneroccupier locations)
- ✅ `funnel` breakdown (clicks vs location selections)
- ✅ `isDemo: false` (confirms DB data is being used)

### Step 5: Test Conversations Endpoint

```bash
# Fetch conversation summaries
curl "http://localhost:3000/api/conversations?limit=10"

# Search conversations
curl "http://localhost:3000/api/conversations?q=user123&limit=20"

# Fetch with pagination
curl "http://localhost:3000/api/conversations?limit=10&cursor=0"
```

Expected response:
```json
{
  "items": [
    {
      "id": "transcript-uuid",
      "sessionId": "session-id",
      "userId": "user123",
      "platform": "web",
      "createdAt": "2024-12-13T10:00:00Z",
      "lastInteractionAt": "2024-12-13T10:10:00Z",
      "messageCount": 15,
      "durationSeconds": 600,
      ...
    }
  ],
  "nextCursor": "10",
  "isDemo": false
}
```

### Step 6: Test Individual Transcript Dialog

```bash
# Fetch transcript messages
curl "http://localhost:3000/api/conversations/{transcript-id}"
```

Expected response:
```json
{
  "messages": [
    {
      "id": "turn-uuid",
      "role": "user",
      "content": "Hi, I want to rent a property",
      "timestamp": "2024-12-13T10:00:00Z"
    },
    {
      "id": "turn-uuid-2",
      "role": "assistant",
      "content": "Great! Which location interests you?",
      "timestamp": "2024-12-13T10:00:30Z"
    }
  ],
  "isDemo": false
}
```

---

## Data Validation Checks

### Check 1: State Reconstruction

Verify that typeuser, location, rating, and feedback are correctly extracted:

```sql
-- Should show typeuser is not null for most sessions
SELECT 
  typeuser, 
  COUNT(*) as count
FROM vf_sessions 
WHERE typeuser IS NOT NULL 
GROUP BY typeuser;

-- Expected output shows tenant, investor, owneroccupier counts
```

### Check 2: Location Mapping

Verify location_type matches typeuser:

```sql
-- Validation: all locations should match typeuser
SELECT DISTINCT 
  typeuser, 
  location_type
FROM vf_sessions 
WHERE location_type IS NOT NULL;

-- Expected:
-- tenant -> rental
-- investor -> investor
-- owneroccupier -> owneroccupier
```

### Check 3: Feedback Rule

Verify feedback only exists for ratings 1-3:

```sql
-- Should return 0 rows (no violations)
SELECT COUNT(*) as violations
FROM vf_sessions 
WHERE feedback IS NOT NULL 
AND rating > 3;
```

### Check 4: Event Sequence

Verify events are in order:

```sql
-- Sample event timeline for a session
SELECT 
  event_type, 
  event_ts, 
  typeuser, 
  location_value, 
  rating
FROM vf_events 
WHERE session_id = 'your-session-id' 
ORDER BY event_ts ASC;

-- Expected order:
-- 1. typeuser_selected
-- 2. location_selected
-- 3. rating_submitted
-- 4. feedback_submitted (if rating 1-3)
```

---

## Performance Baseline

### Query Performance Targets

After syncing 100+ transcripts, run:

```bash
# Measure analytics query time
time curl -X POST http://localhost:3000/api/analytics -H "Content-Type: application/json" -d '{ "days": 7 }'
# Target: < 500ms

# Measure conversations list query time
time curl "http://localhost:3000/api/conversations?limit=50"
# Target: < 200ms
```

---

## Configure Railway Cron

Once tested locally, set up automated syncing:

### In Railway Dashboard

1. **Go to your Next.js service**
2. **Settings** → **Cron Jobs**
3. **Add Cron Job**:
   - **Schedule**: `*/15 * * * *` (every 15 minutes)
   - **Command**: 
   ```
   curl -X POST https://$RAILWAY_PUBLIC_DOMAIN/api/sync-transcripts \
     -H "Authorization: Bearer $CRON_SECRET"
   ```

4. **Go to Variables**:
   - Add `CRON_SECRET` = `your_random_secret_string`

5. **Deploy** and verify cron runs:
   - Check **Deployments** tab for cron execution logs

---

## Troubleshooting

### Issue: "DATABASE_URL is not set"

**Solution:**
```bash
# Check if variable is set
echo $DATABASE_URL

# If empty, add to .env.local or Railway Variables:
DATABASE_URL=postgresql://user:pass@host:port/db
```

### Issue: "Tables do not exist"

**Solution:**
```bash
# Re-run migration
psql $DATABASE_URL < db/migrations/001_create_vf_tables.sql

# Or verify tables exist
psql $DATABASE_URL -c "\dt public.vf_*"
```

### Issue: "0 transcripts synced, no errors"

**Cause:** Voiceflow API credentials missing or project has no transcripts

**Solution:**
```bash
# Verify credentials
echo $PROJECT_ID
echo $VOICEFLOW_API_KEY

# Test Voiceflow API manually
curl -X POST https://analytics-api.voiceflow.com/v1/transcript/project/$PROJECT_ID \
  -H "authorization: $VOICEFLOW_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Issue: "Analytics endpoint returns mock data (isDemo: true)"

**Cause:** Database query failed (empty DB or connection error)

**Solution:**
1. Run sync first: `curl http://localhost:3000/api/sync-transcripts`
2. Check database has data:
   ```sql
   SELECT COUNT(*) FROM vf_sessions;
   ```
3. Check database logs for errors

---

## Next Steps After Validation

1. **Monitor**: Track sync job success rate in Railway logs
2. **Optimize**: Run EXPLAIN ANALYZE on queries to find bottlenecks
3. **Enhance**: Add CTA tracking, keyword extraction, custom dashboards
4. **Backup**: Set up automated Postgres backups in Railway
5. **Archive**: Plan data retention (e.g., archive transcripts > 90 days)

---

## Rollback Plan

If issues arise, you can temporarily fall back to Voiceflow API:

```bash
# In app/api/analytics/route.ts:
# Replace database query with API call:
# const data = await fetchAnalytics(projectId, apiKey, startDate, endDate);
```

The system has graceful fallbacks to mock data, so UI will never break.

---

## Success Criteria

✅ Sync endpoint imports Voiceflow transcripts  
✅ Database stores raw + parsed data  
✅ Analytics queries use database (not API)  
✅ Conversations display database transcripts  
✅ Funnel metrics calculated from events  
✅ Railway Cron keeps database fresh  
✅ Query response times < 500ms  
✅ No data loss during ingestion  

---

**You're all set!** Start with Step 1 above and work through the test sequence.
