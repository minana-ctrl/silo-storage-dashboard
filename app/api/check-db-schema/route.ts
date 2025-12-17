import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

/**
 * Check if database tables exist and are properly set up
 * GET /api/check-db-schema
 */
export async function GET(request: NextRequest) {
  try {
    // Check if tables exist
    const tables = await query<{ table_name: string }>(
      `SELECT table_name 
       FROM information_schema.tables 
       WHERE table_schema = 'public' 
         AND table_name IN ('vf_sessions', 'vf_transcripts', 'vf_turns', 'vf_events')
       ORDER BY table_name`
    );

    const existingTables = tables.rows.map(r => r.table_name);

    // Check row counts
    const counts: Record<string, number> = {};
    for (const table of existingTables) {
      const result = await query<{ count: string }>(`SELECT COUNT(*) as count FROM public.${table}`);
      counts[table] = parseInt(result.rows[0]?.count || '0', 10);
    }

    // Check indexes
    const indexes = await query<{ tablename: string; indexname: string }>(
      `SELECT tablename, indexname 
       FROM pg_indexes 
       WHERE schemaname = 'public' 
         AND tablename IN ('vf_sessions', 'vf_transcripts', 'vf_turns', 'vf_events')
       ORDER BY tablename, indexname`
    );

    const indexesByTable = indexes.rows.reduce((acc, row) => {
      if (!acc[row.tablename]) acc[row.tablename] = [];
      acc[row.tablename].push(row.indexname);
      return acc;
    }, {} as Record<string, string[]>);

    return NextResponse.json({
      status: existingTables.length === 4 ? 'COMPLETE' : 'INCOMPLETE',
      tables: {
        expected: ['vf_sessions', 'vf_transcripts', 'vf_turns', 'vf_events'],
        existing: existingTables,
        missing: ['vf_sessions', 'vf_transcripts', 'vf_turns', 'vf_events'].filter(
          t => !existingTables.includes(t)
        ),
      },
      row_counts: counts,
      indexes: indexesByTable,
      ready: existingTables.length === 4 && counts.vf_sessions >= 0,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to check schema',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}


