import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

/**
 * Diagnostic endpoint to debug yesterday's data not showing
 * This helps identify timezone and date range issues
 */
export async function GET() {
  try {
    // Get current time in different timezones
    const now = new Date();
    const utcNow = now.toISOString();
    const sydneyNow = new Date(now.toLocaleString('en-US', { timeZone: 'Australia/Sydney' }));
    const sydneyDate = sydneyNow.toISOString().split('T')[0];

    // Calculate yesterday in Sydney time
    const yesterday = new Date(sydneyNow);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayDate = yesterday.toISOString().split('T')[0];

    // Calculate last 7 days range (current logic)
    const startDateObj = new Date(sydneyNow);
    startDateObj.setDate(startDateObj.getDate() - 6); // 7 days including today
    const last7DaysStart = startDateObj.toISOString().split('T')[0];

    // Query database for session counts by Sydney date
    const sessionsByDate = await query<{ sydney_date: string; count: string }>(
      `
      SELECT
        (started_at AT TIME ZONE 'UTC' AT TIME ZONE 'Australia/Sydney')::date as sydney_date,
        COUNT(*) as count
      FROM vf_sessions
      WHERE started_at >= NOW() - INTERVAL '30 days'
      GROUP BY sydney_date
      ORDER BY sydney_date DESC
      LIMIT 30
      `
    );

    // Query for yesterday specifically
    const yesterdayData = await query<{ count: string }>(
      `
      SELECT COUNT(*) as count
      FROM vf_sessions
      WHERE (started_at AT TIME ZONE 'UTC' AT TIME ZONE 'Australia/Sydney')::date = $1
      `,
      [yesterdayDate]
    );

    // Query for today specifically
    const todayData = await query<{ count: string }>(
      `
      SELECT COUNT(*) as count
      FROM vf_sessions
      WHERE (started_at AT TIME ZONE 'UTC' AT TIME ZONE 'Australia/Sydney')::date = $1
      `,
      [sydneyDate]
    );

    // Get latest session timestamp
    const latestSession = await query<{ started_at: string; sydney_date: string }>(
      `
      SELECT
        started_at,
        (started_at AT TIME ZONE 'UTC' AT TIME ZONE 'Australia/Sydney')::date as sydney_date
      FROM vf_sessions
      ORDER BY started_at DESC
      LIMIT 1
      `
    );

    return NextResponse.json({
      timestamp: {
        utc: utcNow,
        sydney: sydneyNow.toISOString(),
        sydneyDate: sydneyDate,
        yesterdayDate: yesterdayDate,
      },
      dateRanges: {
        today: sydneyDate,
        yesterday: yesterdayDate,
        last7DaysStart: last7DaysStart,
        last7DaysEnd: sydneyDate,
      },
      counts: {
        yesterday: parseInt(yesterdayData.rows[0]?.count || '0', 10),
        today: parseInt(todayData.rows[0]?.count || '0', 10),
        total: sessionsByDate.rows.reduce((sum, row) => sum + parseInt(row.count, 10), 0),
      },
      latestSession: latestSession.rows[0] || null,
      sessionsByDate: sessionsByDate.rows.map(row => ({
        date: row.sydney_date,
        count: parseInt(row.count, 10),
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
