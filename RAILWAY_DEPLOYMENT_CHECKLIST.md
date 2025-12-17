# Railway Deployment Checklist - Sydney Timezone

## ⚠️ Critical Issue Found

**The `getAnalyticsDataCombined()` function was NOT using Sydney timezone!**

This function was added but used UTC-based queries instead of Sydney timezone queries, causing different totals between local and Railway.

## ✅ Fixed

All queries in `getAnalyticsDataCombined()` now use Sydney timezone:

```sql
WHERE (started_at AT TIME ZONE 'UTC' AT TIME ZONE 'Australia/Sydney')::date >= $1::date 
  AND (started_at AT TIME ZONE 'UTC' AT TIME ZONE 'Australia/Sydney')::date <= $2::date
```

## 🔍 Testing Railway PostgreSQL Timezone Support

### Step 1: Deploy the test endpoint

The file `app/api/test-railway-tz/route.ts` has been created to test timezone support on Railway.

### Step 2: After deploying to Railway, test it

```bash
# Replace with your Railway URL
curl https://your-app.railway.app/api/test-railway-tz
```

### Step 3: Check the response

**If `timezone_available: true`:**
✅ Railway PostgreSQL has timezone data - everything will work

**If `timezone_available: false`:**
❌ Railway PostgreSQL doesn't have timezone data installed

### Step 4: If timezone data is missing on Railway

Railway's PostgreSQL might not have the timezone database. You have two options:

#### Option A: Use offset-based timezone (Recommended for Railway)

Replace `'Australia/Sydney'` with `'+11:00'` (AEDT) or `'+10:00'` (AEST):

```sql
-- Instead of:
(started_at AT TIME ZONE 'UTC' AT TIME ZONE 'Australia/Sydney')::date

-- Use:
(started_at AT TIME ZONE 'UTC' AT TIME ZONE '+11:00')::date
```

**Pros:**
- Works on all PostgreSQL installations
- No timezone database required

**Cons:**
- Doesn't automatically handle DST transitions
- Need to manually update offset when DST changes (April/October)

#### Option B: Install timezone data on Railway PostgreSQL

Contact Railway support or use a custom PostgreSQL instance with timezone data.

## 📋 Files to Check Before Deployment

### 1. Analytics Queries (`lib/analyticsQueries.ts`)
- [x] `getCategoryBreakdown` - Uses Sydney TZ
- [x] `getLocationBreakdown` - Uses Sydney TZ
- [x] `getSatisfactionScore` - Uses Sydney TZ
- [x] `getFeedback` - Uses Sydney TZ
- [x] `getFunnelBreakdown` - Uses Sydney TZ
- [x] `getConversationStats` - Uses Sydney TZ
- [x] `getCTAMetrics` - Uses Sydney TZ
- [x] `getCTABreakdown` - Uses Sydney TZ
- [x] `getAnalyticsDataCombined` - **NOW FIXED** ✅

### 2. Analytics Route (`app/api/analytics/route.ts`)
- [x] Date calculation uses Sydney time
- [x] Daily time series query uses Sydney TZ

### 3. Conversations Query (`lib/conversationQueries.ts`)
- [x] Date filtering uses Sydney TZ
- [x] Sorting by `started_at` (not `created_at`)

## 🚀 Deployment Steps

### 1. Commit and push changes

```bash
git add .
git commit -m "Fix: Add Sydney timezone to getAnalyticsDataCombined function"
git push
```

### 2. Deploy to Railway

Railway will automatically deploy from your git repository.

### 3. Test timezone support

```bash
curl https://your-app.railway.app/api/test-railway-tz
```

### 4. Compare local vs Railway

```bash
# Local
curl http://localhost:3005/api/analytics -X POST -H "Content-Type: application/json" -d '{"days": 7}'

# Railway
curl https://your-app.railway.app/api/analytics -X POST -H "Content-Type: application/json" -d '{"days": 7}'
```

**Numbers should now match!** ✅

## 🐛 If Numbers Still Don't Match

### Check 1: Database Sync Status

```bash
# Check if Railway database has same data as local
curl https://your-app.railway.app/api/audit-voiceflow
```

Look for:
- `missingFromDatabase` - Should be 0
- `totalSessions` - Should match Voiceflow

### Check 2: Timezone Conversion

```bash
# Test timezone conversion on Railway
curl https://your-app.railway.app/api/test-railway-tz
```

Look for:
- `timezone_available` - Should be true
- `session_counts.difference` - Shows impact of timezone conversion

### Check 3: Environment Variables

Verify Railway has correct env vars:
- `VOICEFLOW_PROJECT_ID`
- `VOICEFLOW_API_KEY`
- `DATABASE_URL`

### Check 4: Cron Sync

Check Railway logs to see if sync is running:
```bash
railway logs
```

Look for:
- `[Sync] Complete: X synced, Y failed`
- Any errors during sync

## 🔧 Quick Fix: Use UTC Offset Instead

If Railway doesn't support `Australia/Sydney` timezone, update all queries to use `+11:00`:

```bash
# Find and replace in all files
find . -name "*.ts" -type f -exec sed -i '' 's/Australia\/Sydney/+11:00/g' {} \;
```

**Note:** Remember to change to `+10:00` during AEST (April-October).

## ✅ Verification Checklist

After deployment:

- [ ] Test endpoint shows `timezone_available: true`
- [ ] Analytics API returns same counts as local
- [ ] Conversations page shows same counts as local
- [ ] "Today" filter shows current Sydney date
- [ ] Location breakdown shows data (if available)
- [ ] No console errors in browser
- [ ] Railway logs show no errors

## 📞 Support

If issues persist:

1. Check Railway logs: `railway logs --tail 100`
2. Test timezone endpoint: `/api/test-railway-tz`
3. Compare audit results: `/api/audit-voiceflow`
4. Verify database sync: `/api/debug-counts`

All endpoints work in production (not just development).


