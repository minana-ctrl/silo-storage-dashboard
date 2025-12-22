import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

/**
 * Simple diagnostic endpoint to check what dates conversations are stored under
 * No authentication required for quick debugging
 */
export async function GET() {
  try {
    // Get current Sydney time
    const now = new Date();
    const sydneyNow = new Date(now.toLocaleString('en-US', { timeZone: 'Australia/Sydney' }));
    const todaySydney = sydneyNow.toISOString().split('T')[0];

    const yesterday = new Date(sydneyNow);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdaySydney = yesterday.toISOString().split('T')[0];

    // Get all sessions from last 7 days with their Sydney dates
    const sessions = await query<{
      session_id: string;
      started_at_utc: string;
      sydney_date: string;
      typeuser: string;
    }>(
      `
      SELECT
        session_id,
        started_at as started_at_utc,
        (started_at AT TIME ZONE 'UTC' AT TIME ZONE 'Australia/Sydney')::date as sydney_date,
        typeuser
      FROM vf_sessions
      WHERE started_at >= NOW() - INTERVAL '7 days'
      ORDER BY started_at DESC
      LIMIT 20
      `
    );

    // Group by Sydney date
    const byDate: Record<string, number> = {};
    sessions.rows.forEach(row => {
      const date = row.sydney_date;
      byDate[date] = (byDate[date] || 0) + 1;
    });

    return NextResponse.json({
      currentTime: {
        utc: now.toISOString(),
        sydney: sydneyNow.toISOString(),
        todaySydney,
        yesterdaySydney,
      },
      totalSessions: sessions.rows.length,
      sessionsByDate: byDate,
      recentSessions: sessions.rows.map(row => ({
        session_id: row.session_id.substring(0, 20) + '...',
        started_at_utc: row.started_at_utc,
        sydney_date: row.sydney_date,
        typeuser: row.typeuser,
      })),
      diagnosis: {
        yesterdayCount: byDate[yesterdaySydney] || 0,
        todayCount: byDate[todaySydney] || 0,
        message: byDate[yesterdaySydney]
          ? `Found ${byDate[yesterdaySydney]} sessions for yesterday (${yesterdaySydney})`
          : `No sessions found for yesterday (${yesterdaySydney}). Data might be on a different date.`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
