import { fetchTranscriptSummaries } from '@/lib/voiceflowTranscripts';
import { ingestTranscriptBatchParallel } from '@/lib/transcriptIngestion';
import { getApiKey, getProjectId } from '@/lib/env';
import { query } from '@/lib/db';
import { TranscriptSummary } from '@/types/conversations';

// Format date to ISO string for Voiceflow API
function formatDate(date: Date): string {
    return date.toISOString();
}

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

/**
 * Fetch full transcript from Voiceflow API
 */
async function fetchFullTranscript(transcriptId: string, apiKey: string): Promise<any> {
    const url = `https://analytics-api.voiceflow.com/v1/transcript/${transcriptId}`;
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            authorization: apiKey,
            Accept: 'application/json',
        },
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch transcript ${transcriptId}: ${response.status} - ${errorText}`);
    }

    return response.json();
}

/**
 * Batch fetch transcripts from Voiceflow with controlled parallelism
 */
async function batchFetchTranscripts(
    transcriptIds: string[],
    apiKey: string,
    concurrency: number = 10
): Promise<{ successful: any[]; failed: Array<{ id: string; error: string }> }> {
    const successful = [];
    const failed = [];
    const queue = [...transcriptIds];

    while (queue.length > 0) {
        const batch = queue.splice(0, concurrency);
        const promises = batch.map(id =>
            fetchFullTranscript(id, apiKey)
                .then(data => ({ success: true, id, data }))
                .catch(error => ({ success: false, id, error: error.message }))
        );

        const results = await Promise.all(promises);

        for (const result of results) {
            if (result.success) {
                successful.push((result as { success: true; id: string; data: any }).data);
            } else {
                failed.push({ id: result.id, error: (result as { success: false; id: string; error: string }).error });
                console.warn(`[Sync] Failed to fetch transcript ${result.id}: ${(result as { success: false; id: string; error: string }).error}`);
            }
        }
    }

    return { successful, failed };
}

export async function performSync(options: { force?: boolean } = {}): Promise<{ synced: number; failed: number; errors: string[] }> {
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
        // Get database counts before sync for comparison
        const beforeCounts = await query<{ sessions: string; transcripts: string }>(
            `SELECT 
        (SELECT COUNT(*) FROM public.vf_sessions) as sessions,
        (SELECT COUNT(*) FROM public.vf_transcripts) as transcripts`
        );
        const beforeSessionsCount = parseInt(beforeCounts.rows[0]?.sessions || '0', 10);
        const beforeTranscriptsCount = parseInt(beforeCounts.rows[0]?.transcripts || '0', 10);

        console.log(`[Sync] Database state before sync: ${beforeSessionsCount} sessions, ${beforeTranscriptsCount} transcripts`);

        // Get last sync time for incremental sync
        // If force is true, we ignore last sync time and fetch everything
        let lastSyncTime: string | null = null;

        if (!options.force) {
            lastSyncTime = await getLastSyncTime();
        } else {
            console.log('[Sync] Force sync enabled: Ignoring last sync time and fetching ALL transcripts');
        }

        if (lastSyncTime) {
            console.log(`[Sync] Incremental sync: fetching transcripts updated since ${lastSyncTime}`);
        } else {
            console.log('[Sync] Full sync: fetching all transcripts (first time, no previous sync, or forced)');
        }

        // Fetch transcript summaries with pagination (using take/skip query parameters)
        // Filter by VERSION_ID to get only production environment
        const versionId = process.env.VERSION_ID;
        const allTranscriptSummaries: TranscriptSummary[] = [];
        let skip = 0;
        const take = 100;
        let hasMore = true;

        console.log(`[Sync] Filtering by environment: ${versionId || 'ALL (WARNING: No VERSION_ID set - will sync all environments)'}`);
        if (!versionId) {
            console.warn('[Sync] VERSION_ID not set! This will fetch transcripts from ALL environments. Set VERSION_ID to filter only production.');
        }

        while (hasMore) {
            const transcriptResponse = await fetchTranscriptSummaries(projectId, apiKey, {
                limit: take,
                cursor: String(skip),
                environmentID: versionId, // Filter by production environment
                startTime: lastSyncTime || undefined,
            });

            if (transcriptResponse.items && transcriptResponse.items.length > 0) {
                allTranscriptSummaries.push(...transcriptResponse.items);
                console.log(`[Sync] Fetched page (skip=${skip}): ${transcriptResponse.items.length} transcripts (total so far: ${allTranscriptSummaries.length})`);
            }

            // Check if there are more pages
            hasMore = transcriptResponse.items.length === take;
            skip += take;

            // Safety limit: prevent infinite loops
            if (skip > 10000) {
                console.warn('[Sync] Reached safety limit of 10,000 transcripts. Stopping pagination.');
                break;
            }
        }

        if (allTranscriptSummaries.length === 0) {
            console.log('[Sync] No transcripts found from Voiceflow API');
            return { synced: 0, failed: 0, errors: [] };
        }

        console.log(`[Sync] Total transcripts fetched from Voiceflow: ${allTranscriptSummaries.length}`);
        console.log(`[Sync] Date range of transcripts: ${allTranscriptSummaries[0]?.createdAt} to ${allTranscriptSummaries[allTranscriptSummaries.length - 1]?.createdAt}`);

        // Batch fetch full transcripts with parallelism (10 concurrent requests)
        console.log('[Sync] Fetching full transcript details in parallel batches...');
        const transcriptIds = allTranscriptSummaries.map(s => s.id);
        const { successful: fullTranscripts, failed: failedFetches } = await batchFetchTranscripts(transcriptIds, apiKey, 10);

        if (failedFetches.length > 0) {
            totalFailed += failedFetches.length;
            failedFetches.forEach(f => syncErrors.push(`Failed to fetch transcript ${f.id}: ${f.error}`));
        }

        console.log(`[Sync] Successfully fetched ${fullTranscripts.length} full transcripts`);

        // Map API responses to transcript format
        const mappedTranscripts = fullTranscripts.map(transcriptData => {
            const summary = allTranscriptSummaries.find(s => s.id === (transcriptData.id || transcriptData.transcript?.id));
            const transcript = transcriptData.transcript || transcriptData;
            
            return {
                id: transcript.id || summary?.id,
                _id: transcript.id || summary?.id,
                sessionID: transcript.sessionID || summary?.sessionId,
                session_id: transcript.sessionID || summary?.sessionId,
                userId: transcript.userId || summary?.userId,
                createdAt: transcript.createdAt || summary?.createdAt,
                endedAt: transcript.endedAt || summary?.lastInteractionAt,
                updatedAt: transcript.updatedAt || summary?.lastInteractionAt,
                properties: summary?.properties,
                logs: transcript.logs || [],
            };
        });

        console.log(`[Sync] Ingesting ${mappedTranscripts.length} transcripts with parallelism...`);

        // Ingest all transcripts in parallel batches (5 concurrent ingestions)
        if (mappedTranscripts.length > 0) {
            const results = await ingestTranscriptBatchParallel(mappedTranscripts, 5);

            for (const result of results) {
                if (result.success) {
                    totalSynced++;
                } else {
                    totalFailed++;
                    console.warn(`[Sync] ✗ Failed to ingest transcript ${result.transcriptId}:`, result.errors);
                    syncErrors.push(
                        `Failed to ingest transcript ${result.transcriptId}: ${result.errors.join(', ')}`
                    );
                }
            }
        }

        // Get database counts after sync for comparison
        const afterCounts = await query<{ sessions: string; transcripts: string }>(
            `SELECT 
        (SELECT COUNT(*) FROM public.vf_sessions) as sessions,
        (SELECT COUNT(*) FROM public.vf_transcripts) as transcripts`
        );
        const afterSessionsCount = parseInt(afterCounts.rows[0]?.sessions || '0', 10);
        const afterTranscriptsCount = parseInt(afterCounts.rows[0]?.transcripts || '0', 10);

        const sessionsAdded = afterSessionsCount - beforeSessionsCount;
        const transcriptsAdded = afterTranscriptsCount - beforeTranscriptsCount;

        console.log(`[Sync] Complete: ${totalSynced} synced, ${totalFailed} failed`);
        console.log(`[Sync] Database state after sync: ${afterSessionsCount} sessions (+${sessionsAdded}), ${afterTranscriptsCount} transcripts (+${transcriptsAdded})`);

        if (totalSynced > 0 && sessionsAdded === 0) {
            console.warn('[Sync] WARNING: Transcripts were synced but no new sessions were added - possible data issue');
        }

        // Clear analytics cache after successful sync to ensure fresh data
        if (totalSynced > 0) {
            const { clearAnalyticsCache } = await import('./queryCache');
            clearAnalyticsCache();
            console.log('[Sync] Analytics cache cleared - users will see fresh data');
        }

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
