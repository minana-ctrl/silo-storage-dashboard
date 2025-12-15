# 15-Minute Cron Job Setup Guide

This guide will help you set up an automated sync job that runs every 15 minutes to keep your database up-to-date with Voiceflow transcripts.

## Prerequisites

- ✅ Railway account with your Next.js service deployed
- ✅ Database migration completed
- ✅ Environment variables configured

## Step-by-Step Setup

### 1. Set Environment Variables in Railway

1. Go to your **Railway Dashboard**
2. Select your **Next.js service**
3. Go to **Variables** tab
4. Add/verify these variables:

```
CRON_SECRET=<generate-a-random-secret-string>
```

**Generate a secure secret:**
```bash
# Option 1: Using openssl
openssl rand -hex 32

# Option 2: Using node
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Option 3: Use any random string (at least 32 characters)
```

**Important:** Make sure `CRON_SECRET` matches what you'll use in the cron command.

### 2. Configure the Cron Job

1. In Railway Dashboard, go to your **Next.js service**
2. Click **Settings** → **Cron Jobs**
3. Click **Add Cron Job**
4. Configure:
   - **Schedule**: `*/15 * * * *` (every 15 minutes)
   - **Command**: 
     ```bash
     curl -X POST https://$RAILWAY_PUBLIC_DOMAIN/api/sync-transcripts -H "Authorization: Bearer $CRON_SECRET"
     ```

**Cron Schedule Explanation:**
- `*/15 * * * *` = Every 15 minutes
- Format: `minute hour day month weekday`
- `*/15` = every 15 minutes
- `*` = every hour, day, month, weekday

### 3. Verify Setup

After deploying, check the cron job execution:

1. Go to **Deployments** tab in Railway
2. Look for cron job execution logs
3. You should see logs like:
   ```
   [Sync POST] Starting sync job...
   [Sync] Incremental sync: fetching transcripts updated since...
   [Sync] Total transcripts to sync: X
   [Sync] Complete: X synced, 0 failed
   ```

### 4. Test Manually (Optional)

Test the endpoint manually to verify it works:

```bash
# Replace with your actual values
export RAILWAY_PUBLIC_DOMAIN="your-app.railway.app"
export CRON_SECRET="your-secret-here"

curl -X POST https://$RAILWAY_PUBLIC_DOMAIN/api/sync-transcripts \
  -H "Authorization: Bearer $CRON_SECRET"
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

## How It Works

### Incremental Sync
- **First run**: Fetches all transcripts (full sync)
- **Subsequent runs**: Only fetches transcripts created/updated since the last sync
- **Efficiency**: Much faster than re-processing all transcripts every time

### Duplicate Prevention
- Transcripts, sessions, and turns use `ON CONFLICT` upserts
- Safe to run multiple times - no duplicates
- Events may accumulate if transcripts are updated

### Schedule Options

If you want to change the frequency:

- **Every 5 minutes**: `*/5 * * * *`
- **Every 15 minutes**: `*/15 * * * *` (recommended)
- **Every 30 minutes**: `*/30 * * * *`
- **Every hour**: `0 * * * *`
- **Daily at midnight**: `0 0 * * *`

## Troubleshooting

### Issue: "Unauthorized" error

**Cause:** `CRON_SECRET` doesn't match or is missing

**Solution:**
1. Check Railway Variables - ensure `CRON_SECRET` is set
2. Verify the cron command uses `$CRON_SECRET` (not a hardcoded value)
3. Make sure the secret matches exactly (no extra spaces)

### Issue: Cron job not running

**Solution:**
1. Check Railway Cron Jobs settings - verify schedule is correct
2. Check Deployments tab for cron execution logs
3. Verify your service is deployed and running

### Issue: "0 transcripts synced"

**Possible causes:**
- No new transcripts since last sync (normal for incremental sync)
- Voiceflow API credentials missing
- No transcripts in Voiceflow project

**Solution:**
1. Check Railway Variables: `PROJECT_ID` and `VOICEFLOW_API_KEY`
2. Verify Voiceflow project has transcripts
3. Check sync logs for error messages

### Issue: Database connection errors

**Solution:**
1. Verify `DATABASE_URL` is set in Railway Variables
2. Check database is running and accessible
3. Verify database tables exist (run migration if needed)

## Monitoring

### Check Sync Status

View recent sync results in Railway logs:
- Go to **Deployments** → **View Logs**
- Filter for `[Sync]` messages

### Verify Data

Check if transcripts are being synced:

```sql
-- Count total transcripts
SELECT COUNT(*) FROM public.vf_transcripts;

-- Check most recent sync
SELECT MAX(updated_at) as last_sync FROM public.vf_transcripts;

-- View recent transcripts
SELECT transcript_id, session_id, updated_at 
FROM public.vf_transcripts 
ORDER BY updated_at DESC 
LIMIT 10;
```

## Next Steps

1. ✅ Set up cron job (this guide)
2. ✅ Monitor first few syncs
3. ✅ Verify data appears in dashboard
4. ✅ Set up alerts if needed (Railway Pro)

---

**Note:** The sync job is now optimized with incremental syncing, so it will only fetch new/updated transcripts since the last sync, making it very efficient even with thousands of transcripts.

