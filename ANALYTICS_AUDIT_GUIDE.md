# Analytics Audit & Recovery Guide

## Overview

A comprehensive audit and recovery system has been implemented to diagnose and fix issues with Customer Satisfaction and other analytics metrics in the Silo Storage Dashboard.

## Audit Tools Created

### 1. **Comprehensive Data Audit Endpoint**
**Endpoint:** `GET /api/audit-analytics`

Performs deep analysis of data quality in the database:
- Counts sessions with/without key fields (rating, typeuser, location, feedback)
- Identifies business logic violations
- Analyzes rating distribution and average
- Calculates data completeness score
- Provides specific recommendations

**Example Response:**
```json
{
  "summary": {
    "totalSessions": 100,
    "sessionsWithRating": 45,
    "sessionsWithTypeuser": 80,
    "sessionsWithLocation": 35,
    "dataCompletenessScore": 65
  },
  "ratingAnalysis": {
    "distribution": { "1": 5, "2": 8, "3": 12, "4": 15, "5": 5 },
    "average": 3.67,
    "totalRatings": 45
  },
  "recommendations": ["⚠️ Only 45% of sessions have ratings..."]
}
```

### 2. **Rating Extraction Test Endpoint**
**Endpoint:** `GET /api/test-rating-extraction`

Tests rating extraction logic on actual transcripts in your database:
- Parses properties from 30 recent transcripts
- Tests extraction against state reconstruction
- Identifies format issues
- Reports success rate and problems

**Key Metrics:**
- `extractionSuccessRate` - Percentage of transcripts with successfully extracted ratings
- `ratingsFound` - Count of transcripts with rating in properties
- `ratingsExtracted` - Count successfully converted to 1-5 scale

### 3. **Query Validation Endpoint**
**Endpoint:** `POST /api/validate-queries`

Tests all analytics queries for correctness:
- Runs `getSatisfactionScore()` and returns actual average
- Validates category breakdown calculation
- Tests location breakdown mapping
- Checks funnel progression
- Compares database counts vs query results

**Request Body (optional):**
```json
{
  "startDate": "2025-12-01",
  "endDate": "2025-12-31"
}
```

### 4. **Raw Data Inspector Endpoint**
**Endpoint:** `GET /api/inspect-raw-data`

Examines raw transcript properties from Voiceflow:
- Lists all property keys found across transcripts
- Analyzes rating formats (1/5, 1, percentage, etc.)
- Identifies alternative property names
- Shows most common keys

**Example Output:**
```json
{
  "propertyStats": {
    "propertiesPresent": 45,
    "commonKeys": {
      "rating": 45,
      "typeuser": 42,
      "feedback": 15,
      "location": 38
    }
  },
  "ratingFormats": {
    "1/5": 20,
    "4/5": 15,
    "5": 10
  }
}
```

### 5. **Backfill Ratings Endpoint**
**Endpoint:** `POST /api/backfill-ratings`

Re-extracts ratings from transcripts and updates sessions:
- Finds all sessions without ratings
- Re-runs state reconstruction on their transcripts
- Updates database with newly extracted ratings
- Reports changes and success rate

**Response Includes:**
```json
{
  "sessionsBefore": {
    "total": 100,
    "withRating": 45,
    "withoutRating": 55
  },
  "successCount": 20,
  "sessionsChanged": 20,
  "averageRatingBefore": 3.5,
  "averageRatingAfter": 3.6
}
```

## How to Use the Audit System

### Step 1: Run Initial Audit
```bash
curl http://localhost:3005/api/audit-analytics | jq
```

**Look for:**
- Low `sessionsWithRating` percentage (less than 50%)
- High `validationErrorCount`
- Red flags in `recommendations`

### Step 2: Inspect Raw Data
```bash
curl http://localhost:3005/api/inspect-raw-data | jq
```

**Check for:**
- Are rating properties present in transcripts?
- What formats are ratings in? (1/5, 1, percentage)
- Are there alternative property names?

### Step 3: Test Rating Extraction
```bash
curl http://localhost:3005/api/test-rating-extraction | jq
```

**Evaluate:**
- What's the extraction success rate?
- Are there format issues?
- Do properties match reconstructed state?

### Step 4: Validate Analytics Queries
```bash
curl -X POST http://localhost:3005/api/validate-queries \
  -H "Content-Type: application/json" \
  -d '{"startDate": "2025-12-01", "endDate": "2025-12-31"}' | jq
```

**Verify:**
- Are queries returning expected data?
- Is timezone filtering working?
- Do metrics make sense?

### Step 5: Backfill Missing Ratings
Once you've confirmed the extraction logic works, backfill missing ratings:

```bash
curl -X POST http://localhost:3005/api/backfill-ratings | jq
```

**Monitor:**
- How many sessions were updated?
- Did average rating change significantly?
- Any error patterns?

### Step 6: Run Audit Again
```bash
curl http://localhost:3005/api/audit-analytics | jq
```

**Compare:**
- Did data completeness score improve?
- Are there fewer validation errors?
- Is the satisfaction average now reasonable?

## Enhanced Rating Extraction

### What Was Improved

The rating extraction logic now handles:
1. **Standard format**: `"1/5"` ✅
2. **Bare number**: `"1"` ✅ (new)
3. **Alternative names**: `satisfaction`, `score`, `satisfaction_score` ✅ (new)
4. **Message content**: Extracts from user/assistant messages if needed ✅ (new)
5. **Percentage scores**: `"80%"` → converts to 4/5 ✅ (new)

### Files Modified

- **`lib/propertyParser.ts`**
  - Enhanced `extractRatingScore()` to handle more formats
  - Updated property parsing to accept "satisfaction" and "score" keys
  - More lenient validation for rating formats

- **`lib/stateReconstructor.ts`**
  - Enhanced `findVariableInTraces()` with alternate property names
  - Added message content inspection for ratings
  - Better fallback chain for extraction

## Troubleshooting

### Issue: "Only 10% of sessions have ratings"

**Solution:**
1. Check raw data: `curl http://localhost:3005/api/inspect-raw-data | jq '.ratingFormats'`
2. Are rating properties even present in Voiceflow transcripts?
3. If not, check Voiceflow project settings for rating capture configuration

### Issue: "Satisfaction score is 0/5"

**Likely Cause:** No ratings extracted from database

**Solutions:**
1. Run `POST /api/backfill-ratings` to extract from transcripts
2. Check if ratings are in "unusual" format in raw data
3. Verify Voiceflow bot is actually capturing ratings

### Issue: "Query returns 0 but database has data"

**Check:**
1. Date range in query (Sydney timezone: UTC+11)
2. Are `started_at` timestamps being set in sessions?
3. Try broader date range: `2025-01-01` to `2025-12-31`

### Issue: "Satisfaction goes down after backfill"

**This is OK!** 
- Means you had missing low ratings before
- Backfill adds the real data
- Final average is now more accurate

## Recommendations

### After Running Audit

Based on findings, follow one of these paths:

**Path A: High Data Quality (>80% complete)**
- ✅ System working well
- Monitor regularly with monthly audits
- Optional: enable additional logging

**Path B: Moderate Data Quality (50-80% complete)**
- ⚠️ Run backfill to improve ratings
- Check Voiceflow settings for rating capture
- May need to re-sync recent transcripts

**Path C: Low Data Quality (<50% complete)**
- 🔴 Investigate Voiceflow setup
- Verify rating variables are properly configured
- Check if users are actually submitting ratings
- May need to enable "Save Transcript" setting

## Performance Considerations

- All audit endpoints are read-only (safe for production)
- Backfill runs in single thread (safe for concurrent operations)
- Limit queries to specific date ranges for faster results
- Consider running backfill during low-traffic periods

## Monitoring Going Forward

To prevent future issues:

1. **Weekly Check:**
   ```bash
   curl http://localhost:3005/api/audit-analytics | jq '.summary'
   ```

2. **Monthly Deep Dive:**
   - Run all 5 audit endpoints
   - Compare trends
   - Document findings

3. **Set Alerts For:**
   - Data completeness score drops below 50%
   - Validation error count spikes
   - Satisfaction score goes to 0

## Architecture

```
Transcript (Raw from Voiceflow)
    ↓
[Enhanced Extraction Logic]
    ├─ Properties parsing (handles multiple formats)
    ├─ Trace inspection (looks for alternate names)
    └─ Message content (fallback extraction)
    ↓
Reconstructed State
    ↓
vf_sessions table (rating + all fields)
    ↓
[Analytics Queries]
    ├─ getSatisfactionScore()
    ├─ getCategoryBreakdown()
    └─ Other metrics
    ↓
Dashboard Display
```

## Support

All endpoints are development-mode only. For production monitoring, consider:
1. Scheduled audit jobs (cron)
2. Metrics export to monitoring system
3. Alerts for data quality degradation
4. Regular backfill schedule

---

**Last Updated:** December 2025  
**Status:** Complete audit system implemented  
**Next Step:** Run initial audit with `curl http://localhost:3005/api/audit-analytics`

