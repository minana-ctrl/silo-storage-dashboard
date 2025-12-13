import { NextRequest, NextResponse } from 'next/server';
import { fetchTranscriptSummaries } from '@/lib/voiceflowTranscripts';
import { ingestTranscriptBatch } from '@/lib/transcriptIngestion';
import { getApiKey, getProjectId } from '@/lib/env';

/**
 * Sync transcripts from Voiceflow to local database
 * 
 * POST - Requires CRON_SECRET header for security (for automated cron)
 * GET - Only available in development for manual testing
 */

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
    console.log('[Sync] Fetching transcripts from Voiceflow...');
    
    // Fetch all transcripts (with pagination if needed)
    const transcriptResponse = await fetchTranscriptSummaries(projectId, apiKey, {
      limit: 100,
    });

    if (!transcriptResponse.items || transcriptResponse.items.length === 0) {
      console.log('[Sync] No transcripts found');
      return { synced: 0, failed: 0, errors: [] };
    }

    console.log(`[Sync] Fetched ${transcriptResponse.items.length} transcript summaries`);

    // For each summary, fetch the full transcript with logs
    const fullTranscripts = [];
    for (const summary of transcriptResponse.items) {
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
