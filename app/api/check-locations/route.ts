import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

/**
 * Debug endpoint to check location data in database
 * GET /api/check-locations
 */
export async function GET(request: NextRequest) {
  try {
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json({ error: 'Dev only' }, { status: 403 });
    }

    // Check sessions with location data
    const sessions = await query<{
      typeuser: string;
      location_type: string;
      location_value: string;
      count: string;
    }>(
      `SELECT 
        typeuser,
        location_type,
        location_value,
        COUNT(*) as count
      FROM vf_sessions
      WHERE location_type IS NOT NULL 
        OR location_value IS NOT NULL
      GROUP BY typeuser, location_type, location_value
      ORDER BY typeuser, location_type, location_value`
    );

    // Check raw data samples
    const samples = await query<{
      session_id: string;
      typeuser: string;
      location_type: string;
      location_value: string;
      started_at: string;
    }>(
      `SELECT 
        session_id,
        typeuser,
        location_type,
        location_value,
        started_at
      FROM vf_sessions
      ORDER BY started_at DESC
      LIMIT 10`
    );

    return NextResponse.json({
      locationCounts: sessions.rows,
      totalWithLocations: sessions.rowCount,
      recentSamples: samples.rows,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed' },
      { status: 500 }
    );
  }
}

