import { query } from '@/lib/db';
import type { ConversationFilters, TranscriptSummary, TranscriptTurn } from '@/types/conversations';

/**
 * Fetch transcript summaries from database
 * Used by the Conversations page to show a list of conversations
 */
export async function fetchTranscriptSummariesFromDB(
  filters: ConversationFilters = {}
): Promise<{ items: TranscriptSummary[]; nextCursor?: string }> {
  const limit = Math.min(filters.limit || 20, 100);
  const offset = filters.cursor ? Number(filters.cursor) || 0 : 0;

  // Build where clause based on filters
  let whereClause = 't.created_at IS NOT NULL';
  const params: (string | number)[] = [];

  if (filters.query) {
    whereClause += ` AND (
      t.session_id ILIKE $${params.length + 1} OR
      t.user_id ILIKE $${params.length + 1} OR
      t.raw::text ILIKE $${params.length + 1}
    )`;
    params.push(`%${filters.query}%`);
  }

  if (filters.startTime) {
    whereClause += ` AND t.created_at >= $${params.length + 1}`;
    params.push(filters.startTime);
  }

  if (filters.endTime) {
    whereClause += ` AND t.created_at <= $${params.length + 1}`;
    params.push(filters.endTime);
  }

  if (filters.platform) {
    whereClause += ` AND t.raw::jsonb->'properties'->>'platform' = $${params.length + 1}`;
    params.push(filters.platform);
  }

  // Main query
  const baseParams = [...params];

  const result = await query<{
    id: string;
    transcript_id: string;
    session_id: string;
    user_id: string | null;
    createdAt: string;
    lastInteractionAt: string;
    properties: Record<string, any>;
    messageCount: string;
    durationSeconds: number | null;
  }>(
    `
    SELECT 
      t.id,
      t.transcript_id,
      t.session_id,
      t.user_id AS user_id,
      t.started_at as "createdAt",
      COALESCE(t.ended_at, t.updated_at, t.created_at) as "lastInteractionAt",
      t.raw->'properties' as properties,
      COUNT(vt.id)::text as "messageCount",
      EXTRACT(EPOCH FROM (t.ended_at - t.started_at))::int as "durationSeconds"
    FROM public.vf_transcripts t
    LEFT JOIN public.vf_turns vt ON vt.transcript_row_id = t.id
    WHERE ${whereClause}
    GROUP BY t.id, t.transcript_id, t.session_id, t.user_id, t.started_at, t.ended_at, t.updated_at, t.created_at
    ORDER BY t.created_at DESC
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `,
    [...baseParams, limit + 1, offset]
  );

  // Check if there are more results
  let hasMore = false;
  let items = result.rows;

  if (items.length > limit) {
    hasMore = true;
    items = items.slice(0, limit);
  }

  // Map database rows to TranscriptSummary
  const mappedItems: TranscriptSummary[] = items.map((row) => ({
    id: row.id,
    sessionId: row.session_id,
    userId: row.user_id || undefined,
    platform: row.properties?.platform ? String(row.properties.platform) : undefined,
    createdAt: row.createdAt,
    lastInteractionAt: row.lastInteractionAt,
    tags: [],
    properties: row.properties || {},
    firstUserMessagePreview: undefined,
    messageCount: parseInt(row.messageCount, 10),
    durationSeconds: row.durationSeconds || undefined,
    raw: undefined,
  }));

  return {
    items: mappedItems,
    nextCursor: hasMore ? String(offset + limit) : undefined,
  };
}

/**
 * Fetch full transcript dialog (turns/messages)
 * Used by ChatInterface to display conversation messages
 */
export async function fetchTranscriptDialogFromDB(transcriptId: string): Promise<TranscriptTurn[]> {
  const result = await query<{
    id: string;
    role: 'user' | 'assistant' | 'system' | 'tool' | 'trace';
    content: string | null;
    timestamp: string;
    raw: Record<string, unknown>;
  }>(
    `
    SELECT 
      id,
      role,
      text as content,
      timestamp,
      payload as raw
    FROM public.vf_turns
    WHERE transcript_row_id = (
      SELECT id FROM public.vf_transcripts WHERE transcript_id = $1 OR id::text = $1
    )
    ORDER BY turn_index ASC
    `,
    [transcriptId]
  );

  // Normalize roles: 'tool' and 'trace' should be mapped to valid TranscriptSpeaker types
  const normalizeRole = (role: string): 'user' | 'assistant' | 'system' => {
    if (role === 'user' || role === 'assistant' || role === 'system') {
      return role;
    }
    // Map 'tool' and 'trace' to 'assistant' (they're typically system-generated)
    if (role === 'tool' || role === 'trace') {
      return 'assistant';
    }
    return 'system';
  };

  return result.rows.map((row) => ({
    id: row.id,
    role: normalizeRole(row.role),
    content: row.content || '',
    timestamp: row.timestamp,
    traceType: undefined,
    channel: undefined,
    raw: row.raw,
  }));
}

/**
 * Fetch a single transcript summary by ID
 */
export async function fetchTranscriptByIdFromDB(transcriptId: string): Promise<TranscriptSummary | null> {
  const result = await query<{
    id: string;
    transcript_id: string;
    session_id: string;
    user_id: string | null;
    createdAt: string;
    lastInteractionAt: string;
    properties: Record<string, any>;
    messageCount: string;
    durationSeconds: number | null;
  }>(
    `
    SELECT 
      t.id,
      t.transcript_id,
      t.session_id,
      t.user_id AS user_id,
      t.started_at as "createdAt",
      COALESCE(t.ended_at, t.updated_at, t.created_at) as "lastInteractionAt",
      t.raw->'properties' as properties,
      COUNT(vt.id)::text as "messageCount",
      EXTRACT(EPOCH FROM (t.ended_at - t.started_at))::int as "durationSeconds"
    FROM public.vf_transcripts t
    LEFT JOIN public.vf_turns vt ON vt.transcript_row_id = t.id
    WHERE t.transcript_id = $1 OR t.id::text = $1
    GROUP BY t.id, t.transcript_id, t.session_id, t.user_id, t.started_at, t.ended_at, t.updated_at, t.created_at
    `,
    [transcriptId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: row.id,
    sessionId: row.session_id,
    userId: row.user_id || undefined,
    platform: row.properties?.platform ? String(row.properties.platform) : undefined,
    createdAt: row.createdAt,
    lastInteractionAt: row.lastInteractionAt,
    tags: [],
    properties: row.properties || {},
    firstUserMessagePreview: undefined,
    messageCount: parseInt(row.messageCount, 10),
    durationSeconds: row.durationSeconds || undefined,
    raw: undefined,
  };
}
