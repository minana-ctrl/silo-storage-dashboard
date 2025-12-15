import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

/**
 * Debug endpoint to see what's in the database
 * GET /api/db-transcripts
 */
export async function GET(request: NextRequest) {
  try {
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json({ error: 'Dev only' }, { status: 403 });
    }

    const transcripts = await query<{
      transcript_id: string;
      session_id: string;
      started_at: string;
      ended_at: string;
      source: string;
      created_at: string;
    }>(
      `SELECT 
        transcript_id,
        session_id,
        started_at,
        ended_at,
        source,
        created_at
      FROM vf_transcripts
      WHERE started_at >= NOW() - INTERVAL '90 days'
      ORDER BY started_at DESC`
    );

    return NextResponse.json({
      total: transcripts.rowCount,
      transcripts: transcripts.rows,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed' },
      { status: 500 }
    );
  }
}

