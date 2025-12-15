import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

/**
 * Inspect a transcript's raw data to see what properties are available
 * GET /api/inspect-transcript?session_id=xxx
 */
export async function GET(request: NextRequest) {
  try {
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json({ error: 'Dev only' }, { status: 403 });
    }

    const url = new URL(request.url);
    const sessionId = url.searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.json({ error: 'Provide ?session_id=xxx' }, { status: 400 });
    }

    // Get transcript
    const transcript = await query<{
      transcript_id: string;
      session_id: string;
      raw: any;
    }>(
      `SELECT transcript_id, session_id, raw FROM vf_transcripts WHERE session_id = $1`,
      [sessionId]
    );

    if (transcript.rows.length === 0) {
      return NextResponse.json({ error: 'Transcript not found' }, { status: 404 });
    }

    const raw = transcript.rows[0].raw;

    // Get session state
    const session = await query<{
      typeuser: string;
      location_type: string;
      location_value: string;
    }>(
      `SELECT typeuser, location_type, location_value FROM vf_sessions WHERE session_id = $1`,
      [sessionId]
    );

    // Get turns
    const turns = await query<{
      turn_index: number;
      role: string;
      text: string;
      payload: any;
    }>(
      `SELECT turn_index, role, text, payload FROM vf_turns 
       WHERE session_id = $1 
       ORDER BY turn_index`,
      [sessionId]
    );

    return NextResponse.json({
      transcript_id: transcript.rows[0].transcript_id,
      session_id: sessionId,
      properties: raw.properties || [],
      logs_count: raw.logs?.length || 0,
      logs_sample: (raw.logs || []).slice(0, 5),
      session_state: session.rows[0] || null,
      turns: turns.rows,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed' },
      { status: 500 }
    );
  }
}

