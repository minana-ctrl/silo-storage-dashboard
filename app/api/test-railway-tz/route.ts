import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

/**
 * Test if Railway PostgreSQL supports Australia/Sydney timezone
 * GET /api/test-railway-tz
 */
export async function GET(request: NextRequest) {
  try {
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json({ error: 'Dev only' }, { status: 403 });
    }

    // Test 1: Check available timezones
    const tzCheck = await query(`
      SELECT name FROM pg_timezone_names 
      WHERE name = 'Australia/Sydney'
    `);

    // Test 2: Test timezone conversion with a sample timestamp
    const testTimestamp = '2025-12-15 14:00:00 UTC';
    const conversionTest = await query(`
      SELECT 
        $1::timestamptz as utc_time,
        ($1::timestamptz AT TIME ZONE 'UTC') as utc_no_tz,
        ($1::timestamptz AT TIME ZONE 'Australia/Sydney') as sydney_time,
        ($1::timestamptz AT TIME ZONE 'UTC' AT TIME ZONE 'Australia/Sydney')::date as sydney_date
    `, [testTimestamp]);

    // Test 3: Get current time in both timezones
    const currentTimes = await query(`
      SELECT 
        NOW() as server_utc,
        NOW() AT TIME ZONE 'Australia/Sydney' as server_sydney,
        CURRENT_DATE as utc_date,
        (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Australia/Sydney')::date as sydney_date
    `);

    // Test 4: Check actual session count with and without timezone conversion
    const withoutTZ = await query<{ count: string }>(
      `SELECT COUNT(*) as count
       FROM vf_sessions 
       WHERE started_at >= '2025-12-15'::date 
         AND started_at < '2025-12-15'::date + INTERVAL '1 day'`
    );

    const withTZ = await query<{ count: string }>(
      `SELECT COUNT(*) as count
       FROM vf_sessions 
       WHERE (started_at AT TIME ZONE 'UTC' AT TIME ZONE 'Australia/Sydney')::date = '2025-12-15'::date`
    );

    return NextResponse.json({
      timezone_available: tzCheck.rowCount && tzCheck.rowCount > 0,
      timezone_check: tzCheck.rows[0] || null,
      conversion_test: conversionTest.rows[0],
      current_times: currentTimes.rows[0],
      session_counts: {
        without_timezone_conversion: parseInt(withoutTZ.rows[0]?.count || '0', 10),
        with_sydney_timezone: parseInt(withTZ.rows[0]?.count || '0', 10),
        difference: parseInt(withoutTZ.rows[0]?.count || '0', 10) - parseInt(withTZ.rows[0]?.count || '0', 10),
      },
      note: 'If timezone_available is false, Railway PostgreSQL does not have timezone data installed',
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Test failed',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

