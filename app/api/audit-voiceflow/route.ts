import { NextRequest, NextResponse } from 'next/server';
import { getApiKey, getProjectId } from '@/lib/env';
import { fetchAnalytics } from '@/lib/voiceflow';
import { query } from '@/lib/db';

/**
 * Comprehensive audit endpoint to compare Voiceflow data with database
 * Shows exactly what's available in Voiceflow vs what's in the database
 * 
 * GET /api/audit-voiceflow
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

    if (!projectId || !apiKey) {
      return NextResponse.json({
        error: 'Missing Voiceflow credentials (PROJECT_ID or API_KEY)',
      }, { status: 400 });
    }

    console.log('\n=== VOICEFLOW COMPREHENSIVE AUDIT ===\n');

    // 1. Check Voiceflow Analytics API (last 90 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 90);

    console.log(`Fetching Analytics API data (${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]})...`);
    
    const analyticsData = await fetchAnalytics(
      projectId,
      apiKey,
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0]
    );

    // 2. Check Voiceflow Transcript API
    console.log('Fetching Transcript API data...');
    const transcriptUrl = `https://analytics-api.voiceflow.com/v1/transcript/project/${projectId}`;
    const transcriptResp = await fetch(transcriptUrl, {
      method: 'POST',
      headers: {
        'authorization': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    if (!transcriptResp.ok) {
      throw new Error(`Transcript API failed: ${transcriptResp.status}`);
    }

    const transcriptData = await transcriptResp.json();
    const allTranscripts = transcriptData.transcripts || [];

    // Filter transcripts to last 90 days for fair comparison
    const transcripts90Days = allTranscripts.filter((t: any) => {
      const created = new Date(t.createdAt);
      return created >= startDate && created <= endDate;
    });

    console.log(`Found ${allTranscripts.length} total transcripts, ${transcripts90Days.length} in last 90 days`);

    // 3. Get database counts
    const dbCounts = await query<{
      total_sessions: string;
      total_transcripts: string;
      sessions_90d: string;
      transcripts_90d: string;
      oldest_session: string;
      newest_session: string;
    }>(
      `
      SELECT 
        (SELECT COUNT(*) FROM public.vf_sessions) as total_sessions,
        (SELECT COUNT(*) FROM public.vf_transcripts) as total_transcripts,
        (SELECT COUNT(*) FROM public.vf_sessions WHERE started_at >= NOW() - INTERVAL '90 days') as sessions_90d,
        (SELECT COUNT(*) FROM public.vf_transcripts WHERE started_at >= NOW() - INTERVAL '90 days') as transcripts_90d,
        (SELECT MIN(started_at) FROM public.vf_sessions) as oldest_session,
        (SELECT MAX(started_at) FROM public.vf_sessions) as newest_session
      `
    );

    const db = dbCounts.rows[0];

    // 4. Get list of transcript IDs in database
    const dbTranscriptIds = await query<{ transcript_id: string }>(
      `SELECT DISTINCT transcript_id FROM public.vf_transcripts WHERE transcript_id IS NOT NULL`
    );
    const dbTranscriptIdSet = new Set(dbTranscriptIds.rows.map(r => r.transcript_id));

    // 5. Identify missing transcripts
    const missingTranscripts = transcripts90Days.filter((t: any) => {
      const id = t.id || t._id;
      return !dbTranscriptIdSet.has(id);
    });

    // 6. Analyze transcript properties
    const transcriptAnalysis = {
      total: allTranscripts.length,
      last90Days: transcripts90Days.length,
      withSessionID: transcripts90Days.filter((t: any) => t.sessionID).length,
      withUserID: transcripts90Days.filter((t: any) => t.userId).length,
      withProperties: transcripts90Days.filter((t: any) => t.properties && t.properties.length > 0).length,
      dateRange: transcripts90Days.length > 0 ? {
        oldest: transcripts90Days.map((t: any) => t.createdAt).sort()[0],
        newest: transcripts90Days.map((t: any) => t.createdAt).sort().reverse()[0],
      } : null,
    };

    // 7. Build comprehensive report
    const report = {
      timestamp: new Date().toISOString(),
      dateRange: {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0],
        days: 90,
      },
      voiceflow: {
        analytics: {
          totalSessions: analyticsData.usage.sessions,
          totalMessages: analyticsData.usage.messages,
          totalUsers: analyticsData.usage.users,
          note: 'This includes ALL user interactions (test sessions, abandoned chats, etc.)',
        },
        transcripts: {
          totalAvailable: allTranscripts.length,
          last90Days: transcripts90Days.length,
          withSessionID: transcriptAnalysis.withSessionID,
          withUserID: transcriptAnalysis.withUserID,
          withProperties: transcriptAnalysis.withProperties,
          dateRange: transcriptAnalysis.dateRange,
          isDemo: transcriptData.isDemo || false,
          note: 'Only saved/complete transcripts with full data',
        },
      },
      database: {
        totalSessions: parseInt(db.total_sessions || '0', 10),
        totalTranscripts: parseInt(db.total_transcripts || '0', 10),
        sessions90Days: parseInt(db.sessions_90d || '0', 10),
        transcripts90Days: parseInt(db.transcripts_90d || '0', 10),
        dateRange: {
          oldest: db.oldest_session,
          newest: db.newest_session,
        },
      },
      gaps: {
        analyticsVsTranscripts: {
          difference: analyticsData.usage.sessions - transcripts90Days.length,
          percentage: transcripts90Days.length > 0 
            ? ((analyticsData.usage.sessions - transcripts90Days.length) / transcripts90Days.length * 100).toFixed(1) + '%'
            : 'N/A',
          explanation: 'Analytics tracks ALL interactions, Transcripts only has saved conversations',
        },
        transcriptsVsDatabase: {
          missing: missingTranscripts.length,
          percentage: transcripts90Days.length > 0
            ? ((missingTranscripts.length / transcripts90Days.length) * 100).toFixed(1) + '%'
            : '0%',
          explanation: missingTranscripts.length > 0 
            ? `${missingTranscripts.length} transcripts in Voiceflow are not in database - sync needed`
            : 'Database is in sync with Voiceflow transcripts',
        },
      },
      missingTranscriptSample: missingTranscripts.slice(0, 5).map((t: any) => ({
        id: t.id || t._id,
        sessionID: t.sessionID,
        createdAt: t.createdAt,
        properties: t.properties,
      })),
      recommendations: [] as Array<{
        priority: string;
        action: string;
        command?: string;
        reason?: string;
        impact?: string;
      }>,
    };

    // Add recommendations based on findings
    if (missingTranscripts.length > 0) {
      report.recommendations.push({
        priority: 'HIGH',
        action: 'Run full sync to fetch missing transcripts',
        command: 'curl http://localhost:3005/api/sync-transcripts',
        reason: `${missingTranscripts.length} transcripts from Voiceflow are missing in database`,
      });
    }

    if (analyticsData.usage.sessions > transcripts90Days.length * 2) {
      report.recommendations.push({
        priority: 'MEDIUM',
        action: 'Enable auto-save in Voiceflow settings',
        reason: 'Many sessions are not generating saved transcripts',
        impact: 'Analytics shows many more sessions than available transcripts',
      });
    }

    if (missingTranscripts.length === 0 && parseInt(db.sessions_90d || '0', 10) === transcripts90Days.length) {
      report.recommendations.push({
        priority: 'INFO',
        action: 'System is in sync',
        reason: 'Database matches Voiceflow transcript data',
      });
    }

    console.log('\n=== AUDIT COMPLETE ===');
    console.log(`Voiceflow Analytics: ${analyticsData.usage.sessions} sessions`);
    console.log(`Voiceflow Transcripts: ${transcripts90Days.length} transcripts (last 90 days)`);
    console.log(`Database: ${db.sessions_90d} sessions (last 90 days)`);
    console.log(`Missing in DB: ${missingTranscripts.length} transcripts\n`);

    return NextResponse.json(report, { 
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      }
    });
  } catch (error) {
    console.error('[Audit] Error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Audit failed',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

