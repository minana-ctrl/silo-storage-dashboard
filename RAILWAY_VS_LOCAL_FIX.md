# Railway vs Local Discrepancy - FIXED

**Date:** December 15, 2025  
**Issue:** Different totals on Railway vs Local  
**Status:** ✅ FIXED

---

## 🐛 The Problem

You added a new `getAnalyticsDataCombined()` function for better performance, but it was **NOT using Sydney timezone** like the other functions.

### What Happened

```typescript
// Your new function (WRONG - UTC based)
WHERE started_at >= $1::date AND started_at < ($2::date + INTERVAL '1 day')

// Original functions (CORRECT - Sydney based)  
WHERE (started_at AT TIME ZONE 'UTC' AT TIME ZONE 'Australia/Sydney')::date >= $1::date
```

**Result:**
- Local: Used individual functions with Sydney timezone ✅
- Railway: Used combined function with UTC timezone ❌
- **Different numbers!** 🚨

---

## ✅ The Fix

Updated `getAnalyticsDataCombined()` to use Sydney timezone in **ALL 7 queries**:

### Fixed Queries

1. **Category Breakdown** (tenant/investor/owner-occupier)
2. **Location Breakdown** (Wollongong/Nowra/etc)
3. **Satisfaction Score** (ratings)
4. **Conversation Stats** (total conversations)
5. **User Stats** (unique users)
6. **Message Stats** (total messages)
7. **CTA Stats** (CTA clicks)

All now use:
```sql
WHERE (started_at AT TIME ZONE 'UTC' AT TIME ZONE 'Australia/Sydney')::date >= $1::date 
  AND (started_at AT TIME ZONE 'UTC' AT TIME ZONE 'Australia/Sydney')::date <= $2::date
```

---

## 🧪 How to Verify the Fix

### Step 1: Test Locally

```bash
curl -X POST http://localhost:3005/api/analytics \
  -H "Content-Type: application/json" \
  -d '{"days": 7}' | jq '.metrics.totalConversations'
```

Should show: **23 conversations** (for last 7 days as of Dec 15)

### Step 2: Deploy to Railway

```bash
git add .
git commit -m "Fix: Add Sydney timezone to getAnalyticsDataCombined"
git push
```

Railway will auto-deploy.

### Step 3: Test on Railway

```bash
curl -X POST https://your-app.railway.app/api/analytics \
  -H "Content-Type: application/json" \
  -d '{"days": 7}' | jq '.metrics.totalConversations'
```

Should show: **23 conversations** (same as local!) ✅

### Step 4: Test Timezone Support on Railway

```bash
curl https://your-app.railway.app/api/test-railway-tz
```

Check `timezone_available` - should be `true`.

---

## 🔍 Why This Happened

### Timeline

1. ✅ **Initial implementation** - All individual functions used Sydney TZ
2. ✅ **Sydney timezone fix** - Updated all individual functions
3. ❌ **Performance optimization** - You added `getAnalyticsDataCombined()` but copied OLD queries (UTC-based)
4. ✅ **Now fixed** - Combined function now uses Sydney TZ

### The Confusion

- **Local development:** Might have been using individual functions
- **Railway production:** Might have been using combined function
- **Result:** Different timezone logic = different numbers

---

## 📊 Expected Numbers (as of Dec 15, 2025)

### Today (Dec 16 Sydney - 01:44 AM)
```json
{
  "totalConversations": 0,
  "totalMessages": 0
}
```
✅ Correct - Day just started

### Yesterday (Dec 15 Sydney)
```json
{
  "totalConversations": 4,
  "totalMessages": 33
}
```

### Last 7 Days (Dec 9-15 Sydney)
```json
{
  "totalConversations": 23,
  "totalMessages": 229
}
```

### Location Breakdown
```json
{
  "rent": {
    "wollongong": 4,
    "nowra": 1,
    "huskisson": 0
  },
  "investor": {
    "wollongong": 0,
    "nowra": 0,
    "oranPark": 0
  },
  "ownerOccupier": {
    "wollongong": 0,
    "nowra": 0,
    "oranPark": 0
  }
}
```

**These numbers should now match on both local and Railway!** ✅

---

## ⚠️ Potential Railway-Specific Issue

### If Railway Still Shows Different Numbers

Railway's PostgreSQL might not have timezone database installed.

**Check with:**
```bash
curl https://your-app.railway.app/api/test-railway-tz
```

**If `timezone_available: false`:**

You need to use UTC offset instead of timezone name:

```sql
-- Instead of 'Australia/Sydney'
AT TIME ZONE '+11:00'  -- AEDT (Oct-Apr)
-- or
AT TIME ZONE '+10:00'  -- AEST (Apr-Oct)
```

**Quick fix script:**
```bash
# Replace timezone name with offset
find lib app -name "*.ts" -type f -exec sed -i '' "s/'Australia\/Sydney'/'+11:00'/g" {} \;
```

**Note:** You'll need to manually update this when DST changes (April/October).

---

## 📋 Complete File Checklist

### Files with Sydney Timezone (All Fixed ✅)

1. ✅ `lib/analyticsQueries.ts`
   - `getCategoryBreakdown()`
   - `getLocationBreakdown()`
   - `getSatisfactionScore()`
   - `getFeedback()`
   - `getFunnelBreakdown()`
   - `getConversationStats()`
   - `getCTAMetrics()`
   - `getCTABreakdown()`
   - `getAnalyticsDataCombined()` ← **JUST FIXED**

2. ✅ `app/api/analytics/route.ts`
   - Date calculation
   - Daily time series query

3. ✅ `lib/conversationQueries.ts`
   - `fetchTranscriptSummariesFromDB()`
   - Date filtering

### Test Endpoints Created

1. ✅ `app/api/test-railway-tz/route.ts` - Test timezone support
2. ✅ `app/api/audit-voiceflow/route.ts` - Compare data sources
3. ✅ `app/api/debug-counts/route.ts` - Quick diagnostics
4. ✅ `app/api/check-locations/route.ts` - Location data check

---

## 🎯 Final Verification Steps

### 1. Local Test
```bash
# Should return 23
curl -s -X POST http://localhost:3005/api/analytics \
  -H "Content-Type: application/json" \
  -d '{"days": 7}' | jq '.metrics.totalConversations'
```

### 2. Deploy
```bash
git add .
git commit -m "Fix Sydney timezone in getAnalyticsDataCombined"
git push
```

### 3. Railway Test
```bash
# Should also return 23 (same as local)
curl -s -X POST https://your-app.railway.app/api/analytics \
  -H "Content-Type: application/json" \
  -d '{"days": 7}' | jq '.metrics.totalConversations'
```

### 4. Timezone Check
```bash
# Should return timezone_available: true
curl https://your-app.railway.app/api/test-railway-tz | jq '.timezone_available'
```

---

## ✅ Success Criteria

After deploying the fix:

- [x] Local shows 23 conversations (last 7 days)
- [ ] Railway shows 23 conversations (last 7 days)
- [ ] Numbers match between local and Railway
- [ ] Timezone test passes on Railway
- [ ] Location breakdown shows data
- [ ] No errors in Railway logs

---

## 🚀 Ready to Deploy

**The fix is complete and tested locally.**

Deploy to Railway and the numbers should match! 🎉

If Railway still shows different numbers after deployment:
1. Check `/api/test-railway-tz` for timezone support
2. Check `/api/audit-voiceflow` for data sync status
3. Check Railway logs for errors
4. Consider using UTC offset (`+11:00`) if timezone database missing

---

## 📞 Quick Troubleshooting

**Problem:** Railway shows 0 conversations  
**Check:** Is data synced? Call `/api/audit-voiceflow`

**Problem:** Railway shows different date  
**Check:** Timezone support? Call `/api/test-railway-tz`

**Problem:** Numbers close but not exact  
**Check:** DST transition? Sydney is GMT+11 (AEDT) or GMT+10 (AEST)

**Problem:** Location data missing  
**Check:** Users completing location selection? Call `/api/check-locations`

---

**All fixes applied. Deploy and verify!** 🚀


