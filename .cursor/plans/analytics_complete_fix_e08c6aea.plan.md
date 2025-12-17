---
name: Analytics Complete Fix
overview: "Fix all 7 critical analytics issues: correct conversation/message counting, fix timezone handling, repair feedback queries, implement real intents, fix satisfaction trends, and ensure consistency with Voiceflow as source of truth."
todos:
  - id: fix-timezone-everywhere
    content: Replace hardcoded '+11:00' with 'Australia/Sydney' in all queries (analyticsQueries.ts, analytics route)
    status: completed
  - id: fix-conversation-definition
    content: Clarify that vf_sessions = conversations, remove incorrect Voiceflow unique_users logic
    status: completed
  - id: fix-messages-time-attribution
    content: Update daily query to count messages by their timestamp date, not session start date
    status: completed
  - id: fix-feedback-query
    content: Include all ratings 1-3 in feedback query, even without feedback text
    status: completed
  - id: fix-satisfaction-trend
    content: Calculate daily averages for satisfaction trend instead of raw rating values
    status: completed
  - id: replace-fake-intents
    content: Remove mock intent generation, use real Voiceflow API intents
    status: completed
  - id: centralize-date-logic
    content: Create single source of truth for date range calculation using Sydney timezone
    status: completed
  - id: create-validation-endpoint
    content: Build API endpoint to compare database analytics vs Voiceflow API source of truth
    status: completed
  - id: add-data-integrity-checks
    content: Add logging for orphan sessions, missing turns, and validation errors
    status: completed
  - id: test-consistency
    content: Run comprehensive tests for timezone, date boundaries, feedback, and Voiceflow comparison
    status: completed
---

# Analytics System Complete Overhaul

## Overview

Fix all 7 critical issues causing incorrect analytics data. Ensure consistency with Voiceflow API as the source of truth, fix date handling, repair feedback/satisfaction calculations, and implement proper data attribution.

---

## Issues to Fix

### 1. Conversations Definition & Counting

**Problem**: Database uses `vf_sessions` count as "conversations" but Voiceflow API uses `unique_users` as "sessions"

**Fix**:

- Change database model: 1 session = 1 conversation (Voiceflow transcript = 1 session = 1 conversation)
- Update [`lib/voiceflow.ts`](lib/voiceflow.ts) line 158: Remove incorrect `totalSessions = totalUsers` logic
- Fetch proper `sessions` metric from Voiceflow Analytics API (currently not fetched)
- Update [`lib/analyticsQueries.ts`](lib/analyticsQueries.ts) `getConversationStats`: Keep `vf_sessions` count as source of truth
- **Validation**: Compare against Voiceflow transcript count, not `unique_users`

### 2. Messages Attribution Across Time Boundaries

**Problem**: Messages counted on session start date, not on actual message date

**Fix**:

- Update [`app/api/analytics/route.ts`](app/api/analytics/route.ts) lines 258-288 daily query
- Separate conversation counting (by session start date) from message counting (by message timestamp)
- New query structure:
```sql
-- Get all dates in range
WITH date_range AS (
  SELECT generate_series($1::date, $2::date, '1 day'::interval)::date as date
),
-- Count sessions by start date (conversations counted once per session)
daily_sessions AS (
  SELECT 
    (started_at AT TIME ZONE 'UTC' AT TIME ZONE 'Australia/Sydney')::date as date,
    COUNT(DISTINCT session_id) as conversation_count
  FROM public.vf_sessions
  WHERE (started_at AT TIME ZONE 'UTC' AT TIME ZONE 'Australia/Sydney')::date >= $1::date 
    AND (started_at AT TIME ZONE 'UTC' AT TIME ZONE 'Australia/Sydney')::date <= $2::date
  GROUP BY date
),
-- Count messages by message timestamp date (messages attributed to send date)
daily_messages AS (
  SELECT 
    (timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Australia/Sydney')::date as date,
    COUNT(*) as message_count
  FROM public.vf_turns
  WHERE (timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Australia/Sydney')::date >= $1::date 
    AND (timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Australia/Sydney')::date <= $2::date
    AND role IN ('user', 'assistant')
  GROUP BY date
)
SELECT 
  d.date,
  COALESCE(s.conversation_count, 0) as conversations,
  COALESCE(m.message_count, 0) as messages
FROM date_range d
LEFT JOIN daily_sessions s ON d.date = s.date
LEFT JOIN daily_messages m ON d.date = m.date
ORDER BY d.date
```

- **Key principle**: Conversations counted ONCE on session start date; Messages counted on the date they were actually sent

### 3. Timezone Fixed Offset → Dynamic Timezone

**Problem**: Hardcoded `'+11:00'` doesn't handle DST (Australia/Sydney is +10 in winter, +11 in summer)

**Fix**:

- Replace ALL instances of `AT TIME ZONE 'UTC' AT TIME ZONE '+11:00'` 
- Use: `AT TIME ZONE 'UTC' AT TIME ZONE 'Australia/Sydney'`
- Files to update:
  - [`lib/analyticsQueries.ts`](lib/analyticsQueries.ts) - all 8 functions
  - [`app/api/analytics/route.ts`](app/api/analytics/route.ts) - daily query
  - [`lib/conversationQueries.ts`](lib/conversationQueries.ts) - lines 28, 33 (confirmed has timezone issues)
- Update date calculation in [`app/api/analytics/route.ts`](app/api/analytics/route.ts) lines 173-191
- Use proper timezone library or system timezone for Sydney

### 4. Feedback Query Missing Low Ratings Without Text

**Problem**: Query filters `feedback IS NOT NULL` causing ratings 1-3 without feedback text to be invisible

**Fix**:

- Update [`lib/analyticsQueries.ts`](lib/analyticsQueries.ts) `getSatisfactionScore` lines 88-151
- Include ALL ratings 1-5 in satisfaction calculation (current code is correct)
- Update `getFeedback` lines 156-186: Change query to show ALL ratings 1-3, even without feedback text
```sql
SELECT 
  rating,
  COALESCE(feedback, '(No feedback provided)') as text,
  started_at as timestamp,
  transcript_id as "transcriptId"
FROM public.vf_sessions
WHERE (started_at AT TIME ZONE 'UTC' AT TIME ZONE 'Australia/Sydney')::date >= $1::date 
  AND (started_at AT TIME ZONE 'UTC' AT TIME ZONE 'Australia/Sydney')::date <= $2::date
  AND rating IS NOT NULL
  AND rating <= 3
ORDER BY started_at DESC
```

- This ensures low ratings are visible even without feedback text

### 5. Top Intents Using Fake Data

**Problem**: Mock intent names generated from category counts instead of real Voiceflow intents

**Fix**:

- Remove mock intent generation in [`app/api/analytics/route.ts`](app/api/analytics/route.ts) lines 313-319
- Fetch real intents from Voiceflow API using `fetchIntents` (already exists)
- Update logic:
```typescript
const topIntents = await fetchIntents(projectId, apiKey, startDate, endDate);
```

- Handle empty intents gracefully (show "No intent data" instead of mock data)
- Store intent data in database for faster access:
  - Add `intent_name` column to `vf_sessions` table
  - Parse intent from transcript logs during ingestion in [`lib/transcriptIngestion.ts`](lib/transcriptIngestion.ts)

### 6. Satisfaction Trend Contains Raw Ratings

**Problem**: Trend array has raw values `[5, 4, 5, 3]` instead of daily averages

**Fix**:

- Update [`lib/analyticsQueries.ts`](lib/analyticsQueries.ts) `getSatisfactionScore` lines 88-151
- Change trend calculation from individual ratings to daily averages:
```typescript
// Group by date and calculate daily average
const dailyAverages = new Map<string, { sum: number; count: number }>();

for (const row of result.rows) {
  const date = row.date;
  const rating = row.rating;
  const count = parseInt(row.count, 10);
  
  const existing = dailyAverages.get(date) || { sum: 0, count: 0 };
  existing.sum += rating * count;
  existing.count += count;
  dailyAverages.set(date, existing);
}

// Convert to array of daily averages sorted by date
const trend = Array.from(dailyAverages.entries())
  .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
  .map(([date, { sum, count }]) => sum / count);
```


### 7. Date Calculation Consistency

**Problem**: Frontend sends days, backend calculates dates inconsistently

**Fix**:

- Centralize date calculation in [`lib/voiceflow.ts`](lib/voiceflow.ts) `getDateRange` function
- Update to use Sydney timezone:
```typescript
export function getDateRange(days: number): { startDate: string; endDate: string } {
  // Get current time in Sydney timezone
  const now = new Date();
  const sydneyTime = new Date(now.toLocaleString('en-US', { timeZone: 'Australia/Sydney' }));
  
  const endDate = sydneyTime.toISOString().split('T')[0];
  
  if (days === 0) {
    // Today only
    return { startDate: endDate, endDate };
  } else if (days === 1) {
    // Yesterday only
    const yesterday = new Date(sydneyTime);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    return { startDate: yesterdayStr, endDate: yesterdayStr };
  } else {
    // Last N days (inclusive of today)
    const startDateObj = new Date(sydneyTime);
    startDateObj.setDate(startDateObj.getDate() - (days - 1));
    return { 
      startDate: startDateObj.toISOString().split('T')[0], 
      endDate 
    };
  }
}
```

- Use this function in [`app/api/analytics/route.ts`](app/api/analytics/route.ts) instead of inline calculation

---

## Validation Strategy

### Compare Against Voiceflow Source

1. Add validation endpoint: `POST /api/analytics/validate`
2. Fetch data from both:

   - Database (current system)
   - Voiceflow Analytics API (source of truth)

3. Compare and report differences:

   - Conversation count: DB sessions vs VF transcripts count
   - Message count: DB turns vs VF interactions
   - Date ranges: Ensure consistent timezone

4. Log discrepancies for investigation

### Add Consistency Checks

1. In [`lib/transcriptIngestion.ts`](lib/transcriptIngestion.ts):

   - Log sessions without turns (orphan sessions)
   - Log turns without matching session (data integrity issue)
   - Validate rating + feedback rules

2. In [`app/api/analytics/route.ts`](app/api/analytics/route.ts):

   - Check for date boundary issues (sessions without messages)
   - Validate timezone conversions (log dates in both UTC and Sydney)

---

## Files to Modify

1. [`lib/voiceflow.ts`](lib/voiceflow.ts)

   - Fix session counting logic
   - Update `getDateRange` for Sydney timezone

2. [`lib/analyticsQueries.ts`](lib/analyticsQueries.ts)

   - Fix timezone in all queries (8+ functions)
   - Fix satisfaction trend calculation
   - Fix feedback query to include all low ratings

3. [`app/api/analytics/route.ts`](app/api/analytics/route.ts)

   - Fix daily time series query
   - Remove fake intent generation
   - Use real Voiceflow intents
   - Fix date calculation to use Sydney timezone

4. [`lib/conversationQueries.ts`](lib/conversationQueries.ts)

   - Fix timezone in lines 28, 33 (discovered during audit)
   - Replace `'+11:00'` with `'Australia/Sydney'`

5. [`lib/transcriptIngestion.ts`](lib/transcriptIngestion.ts)

   - Add intent extraction during ingestion (future enhancement)
   - Add data validation checks

6. Create new: `app/api/analytics/validate/route.ts`

   - Validation endpoint to compare DB vs Voiceflow API
   - Returns discrepancies report

---

## Testing Plan

1. **Timezone Test**: Run analytics at 11pm and 1am Sydney time on same day, verify same results
2. **Date Boundary Test**: Create test conversation with messages on different days, verify correct attribution
3. **Feedback Test**: Create ratings 1-3 with and without feedback text, verify both show up
4. **Voiceflow Comparison**: Run validation endpoint, verify <5% difference with Voiceflow API
5. **Consistency Test**: Run analytics multiple times in same hour, verify identical results

---

## Migration Notes

- No database schema changes required (all structure is already correct)
- No data migration needed (historical data will be correctly queried with new logic)
- **Behavioral change**: Daily conversation counts may be higher than before due to multi-day conversations being counted each active day (this is correct behavior)
- Total unique sessions/conversations remain unchanged
- Changes are backwards compatible (no breaking API changes)
- Recommend running validation endpoint before and after deployment to measure improvement

## Known Behavioral Changes

### Multi-Day Message Attribution

**Before:** All messages counted on session start date, regardless of when sent

**After:** Messages counted on the date they were actually sent

**Example:**

- Session starts Dec 16 at 11pm with 2 messages
- User returns Dec 17 at 9am with 3 more messages

**Old behavior (INCORRECT):**

- Dec 16: 1 conversation, 5 messages (all messages incorrectly attributed to session start)
- Dec 17: 0 conversations, 0 messages

**New behavior (CORRECT):**

- Dec 16: 1 conversation, 2 messages
- Dec 17: 0 conversations, 3 messages (session counted once; messages attributed correctly)

**Impact:**

- Daily message charts will show accurate distribution of when messages were sent
- Daily conversation counts remain unchanged (still counted once per session on start date)
- Total conversation and message counts remain exactly the same
- Charts will better reflect actual user activity patterns throughout the day