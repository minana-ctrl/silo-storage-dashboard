import { NextRequest, NextResponse } from 'next/server';
import { fetchTranscriptSummaries } from '@/lib/voiceflowTranscripts';
import { ingestTranscriptBatch } from '@/lib/transcriptIngestion';
import { getApiKey, getProjectId } from '@/lib/env';
import { query } from '@/lib/db';

/**
 * Sync transcripts from Voiceflow to local database
 * 
 * POST - Requires CRON_SECRET header for security (for automated cron)
 * GET - Only available in development for manual testing
 */

/**
 * Get the timestamp of the most recently synced transcript
 * Returns null if no transcripts exist (for initial sync)
 */
async function getLastSyncTime(): Promise<string | null> {
  try {
    const result = await query<{ updated_at: string }>(
      `SELECT MAX(updated_at) as updated_at FROM public.vf_transcripts`
    );
    
    if (result.rows.length === 0 || !result.rows[0].updated_at) {
      return null;
    }
    
    return result.rows[0].updated_at;
  } catch (error) {
    console.warn('[Sync] Could not determine last sync time, fetching all transcripts:', error);
    return null;
  }
}

async function performSync(): Promise<{ synced: number; failed: number; errors: string[] }> {
  const projectId = getProjectId();
  const apiKey = getApiKey();

  if (!projectId || !apiKey) {
    return {
      synced: 0,
      failed: 0,
      errors: ['Missing Voiceflow credentials (PROJECT_ID or API_KEY)'],
    };
  }

  const syncErrors: string[] = [];
  let totalSynced = 0;
  let totalFailed = 0;

  try {
    // Get last sync time for incremental sync
    const lastSyncTime = await getLastSyncTime();
    const syncMode = lastSyncTime ? 'incremental' : 'full';
    
    if (lastSyncTime) {
      console.log(`[Sync] Incremental sync: fetching transcripts updated since ${lastSyncTime}`);
    } else {
      console.log('[Sync] Full sync: fetching all transcripts (first time or no previous sync)');
    }
    
    // Fetch transcripts with pagination
    // For incremental sync, filter by startTime to only get new/updated transcripts
    const allTranscriptSummaries = [];
    let cursor: string | undefined = undefined;
    let hasMore = true;
    const pageSize = 100;

    while (hasMore) {
      const transcriptResponse = await fetchTranscriptSummaries(projectId, apiKey, {
        limit: pageSize,
        cursor,
        // Only fetch transcripts created/updated since last sync
        // This filters client-side, but significantly reduces processing
        startTime: lastSyncTime || undefined,
      });

      if (transcriptResponse.items && transcriptResponse.items.length > 0) {
        allTranscriptSummaries.push(...transcriptResponse.items);
        console.log(`[Sync] Fetched page: ${transcriptResponse.items.length} transcripts (total so far: ${allTranscriptSummaries.length})`);
      }

      cursor = transcriptResponse.nextCursor;
      hasMore = !!cursor;

      // Safety limit: prevent infinite loops
      if (allTranscriptSummaries.length > 10000) {
        console.warn('[Sync] Reached safety limit of 10,000 transcripts. Stopping pagination.');
        break;
      }
    }

    if (allTranscriptSummaries.length === 0) {
      console.log('[Sync] No transcripts found');
      return { synced: 0, failed: 0, errors: [] };
    }

    console.log(`[Sync] Total transcripts to sync: ${allTranscriptSummaries.length}`);

    // For each summary, fetch the full transcript with logs
    const fullTranscripts = [];
    for (const summary of allTranscriptSummaries) {
      try {
        const url = `https://analytics-api.voiceflow.com/v1/transcript/${summary.id}`;
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            authorization: apiKey,
            Accept: 'application/json',
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.warn(`[Sync] Failed to fetch transcript ${summary.id}: ${response.status}`);
          syncErrors.push(`Failed to fetch transcript ${summary.id}: ${response.status} - ${errorText}`);
          totalFailed++;
          continue;
        }

        const transcriptData = await response.json();
        
        // Map the API response to our transcript format
        const fullTranscript = {
          id: summary.id,
          _id: summary.id,
          sessionID: summary.sessionId,
          session_id: summary.sessionId,
          userId: summary.userId,
          createdAt: summary.createdAt,
          endedAt: summary.lastInteractionAt,
          updatedAt: summary.lastInteractionAt,
          properties: summary.properties,
          logs: transcriptData.transcript?.logs || [],
        };

        fullTranscripts.push(fullTranscript);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[Sync] Error fetching transcript ${summary.id}:`, errorMessage);
        syncErrors.push(`Error fetching transcript ${summary.id}: ${errorMessage}`);
        totalFailed++;
      }
    }

    console.log(`[Sync] Fetched ${fullTranscripts.length} full transcripts, ingesting...`);

    // Ingest all transcripts
    if (fullTranscripts.length > 0) {
      const results = await ingestTranscriptBatch(fullTranscripts);

      for (const result of results) {
        if (result.success) {
          totalSynced++;
          console.log(
            `[Sync] ✓ Ingested transcript ${result.transcriptId}: ${result.turnsCount} turns, ${result.eventsCount} events`
          );
        } else {
          totalFailed++;
          console.warn(`[Sync] ✗ Failed to ingest transcript ${result.transcriptId}:`, result.errors);
          syncErrors.push(
            `Failed to ingest transcript ${result.transcriptId}: ${result.errors.join(', ')}`
          );
        }
      }
    }

    console.log(`[Sync] Complete: ${totalSynced} synced, ${totalFailed} failed`);

    return {
      synced: totalSynced,
      failed: totalFailed,
      errors: syncErrors,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[Sync] Fatal error:', errorMessage);
    return {
      synced: 0,
      failed: 0,
      errors: [errorMessage],
    };
  }
}

/**
 * POST handler - for Railway Cron or external triggers
 * Requires CRON_SECRET header for security
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;

    if (authHeader !== expectedAuth) {
      console.warn('[Sync POST] Unauthorized sync request');
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Sync POST] Starting sync job...');
    const result = await performSync();

    return NextResponse.json(
      {
        success: result.errors.length === 0,
        synced: result.synced,
        failed: result.failed,
        errors: result.errors,
      },
      { status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[Sync POST] Unexpected error:', errorMessage);
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

/**
 * GET handler - for local development manual testing only
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

    console.log('[Sync GET] Starting manual sync job (development only)...');
    const result = await performSync();

    return NextResponse.json(
      {
        success: result.errors.length === 0,
        synced: result.synced,
        failed: result.failed,
        errors: result.errors,
      },
      { status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[Sync GET] Unexpected error:', errorMessage);
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
