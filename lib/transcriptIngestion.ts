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
async function upsertTranscriptRow(rawTranscript: any): Promise<string> {
  const transcriptId = rawTranscript.id || rawTranscript._id;
  const sessionId = rawTranscript.sessionID || rawTranscript.session_id;
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
 * Parse and insert turns into vf_turns
 */
async function insertTurns(
  transcriptRowId: string,
  sessionId: string,
  logs: any[]
): Promise<number> {
  if (!logs || logs.length === 0) return 0;

  let insertCount = 0;

  for (let idx = 0; idx < logs.length; idx++) {
    const log = logs[idx];
    const turn = mapLogToTurn(log, idx);

    if (!turn) continue;

    try {
      await query(
        `
        INSERT INTO public.vf_turns (
          transcript_row_id, session_id, turn_index, role, text, payload, timestamp, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        ON CONFLICT (transcript_row_id, turn_index) DO UPDATE SET
          role = $4,
          text = $5,
          payload = $6,
          timestamp = $7
        `,
        [
          transcriptRowId,
          sessionId,
          idx,
          turn.role,
          turn.content || null,
          JSON.stringify(turn.raw || {}),
          turn.timestamp,
        ]
      );

      insertCount++;
    } catch (error) {
      console.error('[insertTurns] Error at turn index', idx, ':', error instanceof Error ? error.message : error);
      throw error;
    }
  }

  return insertCount;
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
 * Insert events into vf_events
 */
async function insertEvents(events: any[]): Promise<number> {
  if (!events || events.length === 0) return 0;

  let insertCount = 0;

  for (const event of events) {
    await query(
      `
      INSERT INTO public.vf_events (
        session_id, user_id, event_type, event_ts, typeuser, location_type, location_value,
        rating, feedback, cta_id, cta_name, meta
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `,
      [
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
      ]
    );

    insertCount++;
  }

  return insertCount;
}

/**
 * Main ingestion function
 * Orchestrates the entire process of storing a transcript in the database
 */
export async function ingestTranscript(rawTranscript: any): Promise<IngestionResult> {
  const sessionId = rawTranscript.sessionID || rawTranscript.session_id || '';
  const transcriptId = rawTranscript.id || rawTranscript._id || '';
  const userId = rawTranscript.userId;
  const logs = rawTranscript.logs || [];
  const errors: string[] = [];

  try {
    // 1. Insert/update vf_transcripts with raw JSON
    const transcriptRowId = await upsertTranscriptRow(rawTranscript);

    // 2. Parse turns and insert into vf_turns
    const turnsCount = await insertTurns(transcriptRowId, sessionId, logs);

    // 3. Reconstruct session state (hybrid approach)
    const state = reconstructState(rawTranscript, logs);

    // 4. Validate state
    const validation = validateState(state);
    if (!validation.valid) {
      errors.push(...validation.errors);
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
 * Batch ingest multiple transcripts
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
