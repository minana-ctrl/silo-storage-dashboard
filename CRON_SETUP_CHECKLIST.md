# Railway Cron Job Setup Checklist

Follow these steps to set up your 15-minute cron job in Railway.

## ✅ Prerequisites Checklist

- [ ] Railway account created
- [ ] Next.js service deployed on Railway
- [ ] Database migration completed (`db/migrations/001_create_vf_tables.sql`)
- [ ] Environment variables set in Railway:
  - [ ] `DATABASE_URL` (auto-provided by Railway if using Railway Postgres)
  - [ ] `PROJECT_ID` (your Voiceflow project ID)
  - [ ] `VOICEFLOW_API_KEY` (your Voiceflow API key)
  - [ ] `CRON_SECRET` (generate a random secret - see below)

## 🔐 Step 1: Generate CRON_SECRET

Generate a secure random secret:

```bash
# Option 1: Using openssl (recommended)
openssl rand -hex 32

# Option 2: Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Option 3: Online generator
# Visit: https://www.random.org/strings/
```

**Save this secret** - you'll need it in the next steps.

## 🌐 Step 2: Set CRON_SECRET in Railway

1. Go to [Railway Dashboard](https://railway.app)
2. Select your **Next.js service**
3. Click on **Variables** tab
4. Click **+ New Variable**
5. Add:
   - **Name**: `CRON_SECRET`
   - **Value**: (paste the secret you generated)
6. Click **Add**

## ⏰ Step 3: Configure Cron Job

1. In Railway Dashboard, select your **Next.js service**
2. Click **Settings** tab
3. Scroll down to **Cron Jobs** section
4. Click **+ New Cron Job** or **Add Cron Job**
5. Configure:
   - **Schedule**: `*/15 * * * *`
   - **Command**: 
     ```bash
     curl -X POST https://$RAILWAY_PUBLIC_DOMAIN/api/sync-transcripts -H "Authorization: Bearer $CRON_SECRET"
     ```
6. Click **Save** or **Add**

**Important Notes:**
- Use `$RAILWAY_PUBLIC_DOMAIN` (Railway will substitute this automatically)
- Use `$CRON_SECRET` (Railway will substitute from Variables)
- Don't hardcode the secret in the command

## 🧪 Step 4: Test the Setup

### Option A: Test Locally (Development)

```bash
# Set environment variables
export CRON_SECRET="your-secret-here"
export RAILWAY_PUBLIC_DOMAIN="localhost:3000"  # Optional for local

# Run test script
chmod +x scripts/test-cron.sh
./scripts/test-cron.sh

# Or test manually
curl -X POST http://localhost:3000/api/sync-transcripts \
  -H "Authorization: Bearer $CRON_SECRET"
```

### Option B: Test on Railway (Production)

After deploying, test the endpoint:

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

## 📊 Step 5: Verify Cron Job is Running

1. Go to Railway Dashboard → **Deployments** tab
2. Look for cron job execution logs
3. You should see entries like:
   ```
   [Sync POST] Starting sync job...
   [Sync] Incremental sync: fetching transcripts updated since...
   [Sync] Total transcripts to sync: X
   [Sync] Complete: X synced, 0 failed
   ```

## 🔍 Step 6: Monitor and Verify Data

Check if transcripts are being synced to your database:

```sql
-- Count total transcripts
SELECT COUNT(*) FROM public.vf_transcripts;

-- Check most recent sync time
SELECT MAX(updated_at) as last_sync FROM public.vf_transcripts;

-- View recent transcripts
SELECT transcript_id, session_id, updated_at 
FROM public.vf_transcripts 
ORDER BY updated_at DESC 
LIMIT 10;
```

## 🐛 Troubleshooting

### Issue: "Unauthorized" (401)

**Problem:** CRON_SECRET doesn't match

**Solution:**
1. Verify `CRON_SECRET` in Railway Variables matches what you're using
2. Make sure cron command uses `$CRON_SECRET` (not hardcoded)
3. Check for extra spaces or quotes

### Issue: Cron job not appearing in logs

**Problem:** Cron job not configured or not running

**Solution:**
1. Verify cron job is saved in Settings → Cron Jobs
2. Check schedule is correct: `*/15 * * * *`
3. Wait 15 minutes and check again
4. Verify service is deployed and running

### Issue: "0 transcripts synced"

**Possible causes:**
- No new transcripts since last sync (normal for incremental sync)
- Voiceflow API credentials missing
- No transcripts in Voiceflow project

**Solution:**
1. Check Railway Variables: `PROJECT_ID` and `VOICEFLOW_API_KEY`
2. Verify Voiceflow project has transcripts
3. Check sync logs for error messages
4. Try a full sync by clearing the database (if needed)

### Issue: Database connection errors

**Solution:**
1. Verify `DATABASE_URL` is set in Railway Variables
2. Check database service is running
3. Verify database tables exist (run migration if needed)

## 📝 Cron Schedule Reference

- **Every 5 minutes**: `*/5 * * * *`
- **Every 15 minutes**: `*/15 * * * *` ← **Recommended**
- **Every 30 minutes**: `*/30 * * * *`
- **Every hour**: `0 * * * *`
- **Daily at midnight**: `0 0 * * *`
- **Daily at 2 AM**: `0 2 * * *`

## ✅ Completion Checklist

- [ ] CRON_SECRET generated and set in Railway Variables
- [ ] Cron job configured in Railway Settings
- [ ] Schedule set to `*/15 * * * *`
- [ ] Command uses `$RAILWAY_PUBLIC_DOMAIN` and `$CRON_SECRET`
- [ ] Tested endpoint manually (returns 200 OK)
- [ ] Verified cron job appears in Deployments logs
- [ ] Confirmed transcripts are syncing to database
- [ ] Monitored first few sync runs

---

**Need Help?** Check `CRON_SETUP_GUIDE.md` for detailed documentation.

