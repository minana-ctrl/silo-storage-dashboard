import * as crypto from 'crypto';
import { query } from '@/lib/db';
import { reconstructState, validateState } from '@/lib/stateReconstructor';
import { inferEvents } from '@/lib/eventInference';
import { mapLogToTurn } from '@/lib/voiceflowTranscripts';

/**
 * Calculate SHA256 hash of raw transcript JSON
 */
function hashRawTranscript(rawData: any): string {
  const jsonStr = JSON.stringify(rawData);
  return crypto.createHash('sha256').update(jsonStr).digest('hex');
}

export interface IngestionResult {
  transcriptId: string;
  sessionId: string;
  turnsCount: number;
  eventsCount: number;
  success: boolean;
  errors: string[];
}

/**
 * Upsert a transcript row into vf_transcripts and return its ID
 */
async function upsertTranscriptRow(rawTranscript: any, sessionId: string): Promise<string> {
  const transcriptId = rawTranscript.id || rawTranscript._id;
  // const sessionId = rawTranscript.sessionID || rawTranscript.session_id; // Using passed sessionId
  const userId = rawTranscript.userId || undefined;
  const startedAt = rawTranscript.createdAt || rawTranscript.started_at || null;
  const endedAt = rawTranscript.endedAt || rawTranscript.ended_at || rawTranscript.updatedAt || null;
  const rawHash = hashRawTranscript(rawTranscript);

  try {
    const result = await query<{ id: string }>(
      `
      INSERT INTO public.vf_transcripts (
        transcript_id, session_id, user_id, source, started_at, ended_at, raw, raw_hash, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      ON CONFLICT (transcript_id) DO UPDATE SET
        raw = $7,
        raw_hash = $8,
        updated_at = NOW()
      RETURNING id
      `,
      [
        transcriptId || null,
        sessionId,
        userId || null,
        'voiceflow',
        startedAt,
        endedAt,
        JSON.stringify(rawTranscript),
        rawHash,
      ]
    );

    return result.rows[0].id;
  } catch (error) {
    console.error('[upsertTranscriptRow] Error:', error instanceof Error ? error.message : error);
    throw error;
  }
}

/**
 * Parse and insert turns into vf_turns with bulk operations
 */
async function insertTurns(
  transcriptRowId: string,
  sessionId: string,
  logs: any[]
): Promise<number> {
  if (!logs || logs.length === 0) return 0;

  // Convert logs to turn objects
  const turns = [];
  for (let idx = 0; idx < logs.length; idx++) {
    const log = logs[idx];
    const turn = mapLogToTurn(log, idx);
    if (turn) {
      turns.push({
        transcriptRowId,
        sessionId,
        idx,
        role: turn.role,
        content: turn.content || null,
        payload: JSON.stringify(turn.raw || {}),
        timestamp: turn.timestamp,
      });
    }
  }

  if (turns.length === 0) return 0;

  try {
    // Build bulk insert query
    const placeholders = turns
      .map((_, i) => {
        const offset = i * 7;
        return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7})`;
      })
      .join(',');

    const values = turns.flatMap(turn => [
      turn.transcriptRowId,
      turn.sessionId,
      turn.idx,
      turn.role,
      turn.content,
      turn.payload,
      turn.timestamp,
    ]);

    await query(
      `
      INSERT INTO public.vf_turns (
        transcript_row_id, session_id, turn_index, role, text, payload, timestamp
      ) VALUES ${placeholders}
      ON CONFLICT (transcript_row_id, turn_index) DO UPDATE SET
        role = EXCLUDED.role,
        text = EXCLUDED.text,
        payload = EXCLUDED.payload,
        timestamp = EXCLUDED.timestamp
      `,
      values
    );

    return turns.length;
  } catch (error) {
    console.error('[insertTurns] Bulk insert error:', error instanceof Error ? error.message : error);
    throw error;
  }
}

/**
 * Upsert session into vf_sessions
 */
async function upsertSession(sessionData: any): Promise<string> {
  try {
    const result = await query<{ id: string }>(
      `
      INSERT INTO public.vf_sessions (
        session_id, user_id, transcript_id, transcript_row_id, typeuser, location_type, location_value,
        rating, feedback, started_at, ended_at, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
      ON CONFLICT (session_id) DO UPDATE SET
        user_id = COALESCE(EXCLUDED.user_id, vf_sessions.user_id),
        transcript_id = COALESCE(EXCLUDED.transcript_id, vf_sessions.transcript_id),
        transcript_row_id = COALESCE(EXCLUDED.transcript_row_id, vf_sessions.transcript_row_id),
        typeuser = COALESCE(EXCLUDED.typeuser, vf_sessions.typeuser),
        location_type = COALESCE(EXCLUDED.location_type, vf_sessions.location_type),
        location_value = COALESCE(EXCLUDED.location_value, vf_sessions.location_value),
        rating = COALESCE(EXCLUDED.rating, vf_sessions.rating),
        feedback = COALESCE(EXCLUDED.feedback, vf_sessions.feedback),
        started_at = COALESCE(EXCLUDED.started_at, vf_sessions.started_at),
        ended_at = COALESCE(EXCLUDED.ended_at, vf_sessions.ended_at),
        updated_at = NOW()
      RETURNING id
      `,
      [
        sessionData.session_id,
        sessionData.user_id || null,
        sessionData.transcript_id || null,
        sessionData.transcript_row_id || null,
        sessionData.typeuser || null,
        sessionData.location_type || null,
        sessionData.location_value || null,
        sessionData.rating || null,
        sessionData.feedback || null,
        sessionData.started_at || null,
        sessionData.ended_at || null,
      ]
    );

    return result.rows[0].id;
  } catch (error) {
    console.error('[upsertSession] Error for session', sessionData.session_id, ':', error instanceof Error ? error.message : error);
    throw error;
  }
}

/**
 * Insert events into vf_events with bulk operations
 */
async function insertEvents(events: any[]): Promise<number> {
  if (!events || events.length === 0) return 0;

  try {
    // Build bulk insert query
    const placeholders = events
      .map((_, i) => {
        const offset = i * 12;
        return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12})`;
      })
      .join(',');

    const values = events.flatMap(event => [
      event.session_id,
      event.user_id || null,
      event.event_type,
      event.event_ts,
      event.typeuser || null,
      event.location_type || null,
      event.location_value || null,
      event.rating || null,
      event.feedback || null,
      event.cta_id || null,
      event.cta_name || null,
      JSON.stringify(event.meta || {}),
    ]);

    // FIX: Use ON CONFLICT to skip duplicate events instead of throwing errors
    // Matches the unique_event_idx index (session_id, event_type, event_ts, cta_id, cta_name)
    await query(
      `
      INSERT INTO public.vf_events (
        session_id, user_id, event_type, event_ts, typeuser, location_type, location_value,
        rating, feedback, cta_id, cta_name, meta
      ) VALUES ${placeholders}
      ON CONFLICT (session_id, event_type, event_ts, cta_id, cta_name) DO NOTHING
      `,
      values
    );

    return events.length;
  } catch (error) {
    console.error('[insertEvents] Bulk insert error:', error instanceof Error ? error.message : error);
    throw error;
  }
}

/**
 * Main ingestion function
 * Orchestrates the entire process of storing a transcript in the database
 */
export async function ingestTranscript(rawTranscript: any): Promise<IngestionResult> {
  const transcriptId = rawTranscript.id || rawTranscript._id || '';
  const sessionId = rawTranscript.sessionID || rawTranscript.session_id || transcriptId || '';
  const userId = rawTranscript.userId || rawTranscript.user_id || rawTranscript.userID;
  const logs = rawTranscript.logs || [];
  const errors: string[] = [];
  
  // Log warning if userId is missing
  if (!userId) {
    console.warn(`[Ingestion] Session ${sessionId} missing userId - check transcript properties`);
  }

  try {
    // 1. Insert/update vf_transcripts with raw JSON
    const transcriptRowId = await upsertTranscriptRow(rawTranscript, sessionId);

    // 2. Parse turns and insert into vf_turns
    const turnsCount = await insertTurns(transcriptRowId, sessionId, logs);
    if (turnsCount === 0) {
      console.warn(
        `[Ingestion] No conversational turns captured for session ${sessionId} (${transcriptId})`
      );
    }

    // 3. Reconstruct session state (hybrid approach)
    const state = reconstructState(rawTranscript, logs);

    // 4. Validate state
    const validation = validateState(state);
    if (!validation.valid) {
      errors.push(...validation.errors);
      console.warn(
        `[Ingestion] Validation warnings for session ${sessionId}: ${validation.errors.join('; ')}`
      );
    }

    // 5. Upsert vf_sessions with final state
    const sessionData = {
      session_id: sessionId,
      user_id: userId,
      transcript_id: transcriptId,
      transcript_row_id: transcriptRowId,
      ...state,
    };

    await upsertSession(sessionData);
    if (!sessionData.started_at || !sessionData.ended_at) {
      console.warn(
        `[Ingestion] Session ${sessionId} missing ${!sessionData.started_at ? 'started_at' : 'ended_at'} timestamp`
      );
    }

    // 6. Infer and insert events
    const events = inferEvents(sessionId, userId || null, state, logs);
    const eventsCount = await insertEvents(events);

    return {
      transcriptId,
      sessionId,
      turnsCount,
      eventsCount,
      success: errors.length === 0,
      errors,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      transcriptId,
      sessionId,
      turnsCount: 0,
      eventsCount: 0,
      success: false,
      errors: [errorMessage],
    };
  }
}

/**
 * Batch ingest multiple transcripts with parallel processing
 */
export async function ingestTranscriptBatch(transcripts: any[]): Promise<IngestionResult[]> {
  const results: IngestionResult[] = [];

  for (const transcript of transcripts) {
    const result = await ingestTranscript(transcript);
    results.push(result);

    if (!result.success) {
      console.warn(
        `Ingestion warning for transcript ${result.transcriptId}:`,
        result.errors
      );
    }
  }

  return results;
}

/**
 * Batch ingest multiple transcripts with controlled parallelization
 * Processes N transcripts concurrently to avoid overwhelming the database
 */
export async function ingestTranscriptBatchParallel(
  transcripts: any[],
  concurrency: number = 5
): Promise<IngestionResult[]> {
  const results: IngestionResult[] = [];
  const queue = [...transcripts];

  // Process in batches with controlled concurrency
  while (queue.length > 0) {
    const batch = queue.splice(0, concurrency);
    const batchResults = await Promise.all(
      batch.map(transcript =>
        ingestTranscript(transcript).catch(error => ({
          transcriptId: transcript.id || transcript._id || 'unknown',
          sessionId: transcript.sessionID || transcript.session_id || 'unknown',
          turnsCount: 0,
          eventsCount: 0,
          success: false,
          errors: [error instanceof Error ? error.message : String(error)],
        }))
      )
    );

    for (const result of batchResults) {
      results.push(result);
      if (!result.success) {
        console.warn(
          `Ingestion warning for transcript ${result.transcriptId}:`,
          result.errors
        );
      }
    }
  }

  return results;
}
