import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

/**
 * Test analytics query to debug date filtering
 * GET /api/test-analytics-query?date=2025-12-15
 */
export async function GET(request: NextRequest) {
  try {
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json({ error: 'Dev only' }, { status: 403 });
    }

    const url = new URL(request.url);
    const date = url.searchParams.get('date') || '2025-12-15';

    // Test the exact query from analyticsQueries
    const sessionResult = await query<{ count: string }>(
      `
      SELECT COUNT(*) as count
      FROM public.vf_sessions
      WHERE started_at >= $1::date AND started_at < ($2::date + INTERVAL '1 day')
      `,
      [date, date]
    );

    // Also get the actual sessions for this date
    const sessions = await query<{
      session_id: string;
      started_at: string;
    }>(
      `
      SELECT session_id, started_at
      FROM public.vf_sessions
      WHERE started_at >= $1::date AND started_at < ($2::date + INTERVAL '1 day')
      ORDER BY started_at
      `,
      [date, date]
    );

    // Check what timezone the server is using
    const timezoneInfo = await query(`SELECT NOW(), NOW()::date, CURRENT_TIMESTAMP`);

    return NextResponse.json({
      query_date: date,
      count_result: sessionResult.rows[0]?.count,
      parsed_count: parseInt(sessionResult.rows[0]?.count || '0', 10),
      sessions: sessions.rows,
      server_timezone: timezoneInfo.rows[0],
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed', stack: error instanceof Error ? error.stack : undefined },
      { status: 500 }
    );
  }
}


