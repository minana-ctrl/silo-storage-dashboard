import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getApiKey, getProjectId } from '@/lib/env';
import { fetchAnalytics } from '@/lib/voiceflow';

/**
 * Debug endpoint to compare database counts with Voiceflow API
 * Only available in development mode for security
 * 
 * GET /api/debug-counts
 */
export async function GET(request: NextRequest) {
  try {
    // Only allow in development
    if (process.env.NODE_ENV !== 'development') {
      return new NextResponse(
        JSON.stringify({ error: 'Only available in development mode' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const projectId = getProjectId();
    const apiKey = getApiKey();

    // Get database counts
    const dbCounts = await query<{
      total_sessions: string;
      total_transcripts: string;
      total_turns: string;
      total_events: string;
      oldest_session: string;
      newest_session: string;
      last_transcript_update: string;
    }>(
      `
      SELECT 
        (SELECT COUNT(*) FROM public.vf_sessions) as total_sessions,
        (SELECT COUNT(*) FROM public.vf_transcripts) as total_transcripts,
        (SELECT COUNT(*) FROM public.vf_turns) as total_turns,
        (SELECT COUNT(*) FROM public.vf_events) as total_events,
        (SELECT MIN(started_at) FROM public.vf_sessions) as oldest_session,
        (SELECT MAX(started_at) FROM public.vf_sessions) as newest_session,
        (SELECT MAX(updated_at) FROM public.vf_transcripts) as last_transcript_update
      `
    );

    const dbData = dbCounts.rows[0] || {};

    // Get distribution by date (last 30 days)
    const distributionResult = await query<{ date: string; count: string }>(
      `
      SELECT 
        started_at::date as date,
        COUNT(*) as count
      FROM public.vf_sessions
      WHERE started_at >= NOW() - INTERVAL '30 days'
      GROUP BY started_at::date
      ORDER BY started_at::date DESC
      LIMIT 30
      `
    );

    const sessionsByDate = distributionResult.rows.map(row => ({
      date: row.date,
      count: parseInt(row.count, 10)
    }));

    // Get sessions by typeuser
    const typeuserResult = await query<{ typeuser: string; count: string }>(
      `
      SELECT 
        typeuser,
        COUNT(*) as count
      FROM public.vf_sessions
      WHERE typeuser IS NOT NULL
      GROUP BY typeuser
      `
    );

    const sessionsByTypeuser = typeuserResult.rows.reduce((acc, row) => {
      acc[row.typeuser || 'unknown'] = parseInt(row.count, 10);
      return acc;
    }, {} as Record<string, number>);

    const result: any = {
      database: {
        totalSessions: parseInt(dbData.total_sessions || '0', 10),
        totalTranscripts: parseInt(dbData.total_transcripts || '0', 10),
        totalTurns: parseInt(dbData.total_turns || '0', 10),
        totalEvents: parseInt(dbData.total_events || '0', 10),
        dateRange: {
          oldest: dbData.oldest_session,
          newest: dbData.newest_session,
        },
        lastSync: dbData.last_transcript_update,
        sessionsByDate,
        sessionsByTypeuser,
      },
      voiceflow: null,
      comparison: null,
    };

    // Try to fetch from Voiceflow API if credentials are available
    if (projectId && apiKey) {
      try {
        // Get last 30 days from Voiceflow
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);

        const voiceflowData = await fetchAnalytics(
          projectId,
          apiKey,
          startDate.toISOString().split('T')[0],
          endDate.toISOString().split('T')[0]
        );

        result.voiceflow = {
          totalSessions: voiceflowData.usage.sessions,
          totalMessages: voiceflowData.usage.messages,
          totalUsers: voiceflowData.usage.users,
          dateRange: voiceflowData.period,
          timeSeries: voiceflowData.interactionsTimeSeries,
        };

        // Calculate comparison
        const dbSessionsLast30Days = sessionsByDate.reduce((sum, item) => sum + item.count, 0);
        const sessionsDiff = result.voiceflow.totalSessions - dbSessionsLast30Days;
        const sessionsDiffPercent = dbSessionsLast30Days > 0 
          ? ((sessionsDiff / dbSessionsLast30Days) * 100).toFixed(2)
          : 'N/A';

        result.comparison = {
          sessionsDifference: sessionsDiff,
          sessionsDifferencePercent: sessionsDiffPercent,
          dbSessions30Days: dbSessionsLast30Days,
          voiceflowSessions30Days: result.voiceflow.totalSessions,
          status: Math.abs(sessionsDiff) < 5 ? 'MATCH' : 'MISMATCH',
          message: Math.abs(sessionsDiff) < 5 
            ? 'Database and Voiceflow counts are in sync'
            : `Database is missing ${sessionsDiff > 0 ? sessionsDiff : Math.abs(sessionsDiff)} sessions compared to Voiceflow`
        };
      } catch (voiceflowError) {
        result.voiceflow = {
          error: voiceflowError instanceof Error ? voiceflowError.message : 'Failed to fetch from Voiceflow API',
        };
      }
    } else {
      result.voiceflow = {
        error: 'Voiceflow credentials not configured (PROJECT_ID or API_KEY missing)',
      };
    }

    return NextResponse.json(result, { 
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      }
    });
  } catch (error) {
    console.error('[Debug Counts] Error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to fetch debug counts',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

