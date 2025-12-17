import { randomUUID } from 'crypto';
import { ConversationFilters, TranscriptListResponse, TranscriptSummary, TranscriptTurn } from '@/types/conversations';

const VOICEFLOW_ANALYTICS_API = 'https://analytics-api.voiceflow.com';
const TRANSCRIPT_BASE_URL = `${VOICEFLOW_ANALYTICS_API}/v1/transcript`;
const DEFAULT_LIMIT = 20;

interface VoiceflowTranscriptProperty {
  name?: string;
  value?: string | number | boolean | null;
  type?: string;
}

interface VoiceflowTranscriptListItem {
  id?: string;
  _id?: string;
  sessionID?: string;
  projectID?: string;
  environmentID?: string;
  createdAt?: string;
  updatedAt?: string;
  endedAt?: string;
  properties?: VoiceflowTranscriptProperty[];
  recordingsURL?: string;
}

interface VoiceflowTranscriptSearchResponse {
  transcripts?: VoiceflowTranscriptListItem[];
  isDemo?: boolean;
}

interface VoiceflowTranscriptLog {
  _id?: string;
  id?: string;
  type?: string;
  role?: string;
  channel?: string;
  timestamp?: string;
  createdAt?: string;
  updatedAt?: string;
  data?: {
    type?: string;
    payload?: unknown;
    createdAt?: string;
  };
}

interface VoiceflowTranscriptDialogResponse {
  transcript?: {
    logs?: VoiceflowTranscriptLog[];
  };
}

function mapProperties(
  properties?: VoiceflowTranscriptProperty[]
): Record<string, string | number | boolean | null | undefined> {
  if (!properties || properties.length === 0) return {};

  return properties.reduce<Record<string, string | number | boolean | null | undefined>>(
    (acc, property) => {
      if (!property?.name) return acc;
      let value: string | number | boolean | null | undefined = property.value;

      if (property.type === 'number' && typeof property.value === 'string') {
        const parsed = Number(property.value);
        value = Number.isNaN(parsed) ? property.value : parsed;
      }

      acc[property.name] = value;
      return acc;
    },
    {}
  );
}

function mapTranscriptSummary(item: VoiceflowTranscriptListItem): TranscriptSummary {
  const createdAt = item.createdAt ?? new Date().toISOString();
  const lastInteraction = item.updatedAt ?? item.endedAt ?? createdAt;
  const props = mapProperties(item.properties);

  return {
    id: item.id ?? item._id ?? randomUUID(),
    sessionId: item.sessionID,
    userId: props.userId || props.user_id || props.userID || props.vf_user_id || undefined,
    platform: typeof props.platform === 'string' ? (props.platform as string) : undefined,
    createdAt,
    lastInteractionAt: lastInteraction,
    tags: [],
    properties: props,
    firstUserMessagePreview: typeof props.preview === 'string' ? (props.preview as string) : undefined,
    messageCount: typeof props.turns === 'number' ? (props.turns as number) : undefined,
    durationSeconds: typeof props.duration === 'number' ? (props.duration as number) : undefined,
    raw: item,
  };
}

function normalizeSpeaker(speaker?: string): TranscriptTurn['role'] {
  const normalized = speaker?.toLowerCase();
  if (normalized === 'user' || normalized === 'assistant' || normalized === 'system') {
    return normalized;
  }

  if (normalized?.includes('agent') || normalized?.includes('assistant')) {
    return 'assistant';
  }

  if (normalized?.includes('user') || normalized?.includes('customer')) {
    return 'user';
  }

  return 'system';
}

function flattenRichText(node: unknown): string {
  if (!node) return '';
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return node.map(flattenRichText).join('');

  if (typeof node === 'object') {
    const obj = node as Record<string, unknown>;
    if (typeof obj.text === 'string') return obj.text;
    if (Array.isArray(obj.children)) return obj.children.map(flattenRichText).join('');
    if (Array.isArray(obj.content)) return obj.content.map(flattenRichText).join('');
  }

  return '';
}

function extractTextFromPayload(payload: unknown): string | undefined {
  if (!payload) return undefined;
  if (typeof payload === 'string') return payload.trim();
  if (typeof payload === 'number') return payload.toString();
  if (typeof payload !== 'object') return undefined;

  const obj = payload as Record<string, unknown>;

  if (typeof obj.message === 'string') return obj.message;
  if (typeof obj.text === 'string') return obj.text;
  if (typeof obj.label === 'string') return obj.label;
  if (typeof obj.value === 'string') return obj.value;
  if (typeof obj.response === 'string') return obj.response;

  if (obj.slate) {
    const flattened = flattenRichText(obj.slate);
    if (flattened.trim()) return flattened.trim();
  }

  if (Array.isArray(obj.content)) {
    const flattened = flattenRichText(obj.content);
    if (flattened.trim()) return flattened.trim();
  }

  return undefined;
}

export function mapLogToTurn(log: VoiceflowTranscriptLog, idx: number): TranscriptTurn | null {
  const payloadFromRoot = (log as unknown as { payload?: unknown }).payload;
  let content: string | undefined;
  let role: TranscriptTurn['role'] = 'system';
  let traceType: string | undefined;

  if (
    log.type === 'action' ||
    (log.role && log.role.toLowerCase() === 'user')
  ) {
    const payload = log.data?.payload ?? payloadFromRoot;
    content = extractTextFromPayload(payload);
    role = 'user';
  } else if (
    log.type === 'trace' ||
    (log.role && log.role.toLowerCase() === 'assistant')
  ) {
    const inner = log.data;
    content = extractTextFromPayload(inner?.payload ?? payloadFromRoot);
    if (inner?.type) traceType = inner.type;
    role = traceType === 'debug' ? 'system' : 'assistant';
  }

  if (!content || !content.trim()) return null;
  if (role === 'system') return null;

  return {
    id: log._id ?? log.id ?? `turn-${idx}`,
    role,
    content: content.trim(),
    timestamp:
      log.createdAt ??
      log.timestamp ??
      (log as unknown as { data?: { createdAt?: string } }).data?.createdAt ??
      new Date().toISOString(),
    traceType: traceType ?? log.type,
    channel: log.channel,
    raw: log,
  };
}

export async function fetchTranscriptSummaries(
  projectId: string,
  apiKey: string,
  filters: ConversationFilters = {}
): Promise<TranscriptListResponse> {
  // Use query parameters for pagination (take/skip)
  const take = filters.limit || 100;
  const skip = filters.cursor ? Number(filters.cursor) || 0 : 0;
  const url = `${TRANSCRIPT_BASE_URL}/project/${projectId}?take=${take}&skip=${skip}`;

  console.log(`[fetchTranscriptSummaries] Fetching transcripts for project ${projectId}`);
  console.log(`[fetchTranscriptSummaries] Pagination: take=${take}, skip=${skip}`);
  console.log(`[fetchTranscriptSummaries] Filters:`, JSON.stringify(filters));

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      authorization: apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({}),
    cache: 'no-store',
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[fetchTranscriptSummaries] Failed: ${response.status} - ${errorText}`);
    throw new Error(`Voiceflow transcripts search failed: ${response.status} - ${errorText}`);
  }

  const data: VoiceflowTranscriptSearchResponse = await response.json();
  const items = data.transcripts ?? [];
  
  console.log(`[fetchTranscriptSummaries] Received ${items.length} transcripts from Voiceflow API`);
  console.log(`[fetchTranscriptSummaries] isDemo: ${data.isDemo}`);
  
  if (items.length === 0) {
    console.warn(`[fetchTranscriptSummaries] No transcripts returned - this may indicate an API issue or empty project`);
  }

  const filtered = items
    .map(mapTranscriptSummary)
    .filter((summary) => {
      // Filter by environmentID if specified (to get only production/deployed transcripts)
      if (filters.environmentID && summary.raw?.environmentID !== filters.environmentID) {
        return false;
      }
      
      if (filters.platform && summary.platform?.toLowerCase() !== filters.platform.toLowerCase()) {
        return false;
      }

      if (filters.query) {
        const needle = filters.query.toLowerCase();
        const haystack = [
          summary.userId ?? '',
          summary.sessionId ?? '',
          summary.firstUserMessagePreview ?? '',
        ]
          .concat(
            Object.entries(summary.properties).flatMap(([key, value]) => [
              key,
              typeof value === 'string' ? value : '',
            ])
          )
          .join(' ')
          .toLowerCase();

        if (!haystack.includes(needle)) {
          return false;
        }
      }

      if (filters.startTime) {
        const start = new Date(filters.startTime).getTime();
        if (new Date(summary.createdAt).getTime() < start) {
          return false;
        }
      }

      if (filters.endTime) {
        const end = new Date(filters.endTime).getTime();
        if (new Date(summary.createdAt).getTime() > end) {
          return false;
        }
      }

      return true;
    })
    .sort((a, b) => b.lastInteractionAt.localeCompare(a.lastInteractionAt));

  // Return all filtered items (pagination already handled by API)
  return {
    items: filtered,
    nextCursor: items.length === take ? String(skip + take) : undefined,
    isDemo: data.isDemo,
  };
}

export async function fetchTranscriptDialog(
  transcriptId: string,
  apiKey: string
): Promise<TranscriptTurn[]> {
  const url = `${TRANSCRIPT_BASE_URL}/${transcriptId}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      authorization: apiKey,
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Voiceflow transcript dialog fetch failed: ${response.status} - ${errorText}`);
  }

  const data: VoiceflowTranscriptDialogResponse = await response.json();
  const rawLogs = data.transcript?.logs ?? [];

  const turns: TranscriptTurn[] = [];

  rawLogs.forEach((turn, idx) => {
    const mapped = mapLogToTurn(turn, idx);
    if (mapped) {
      turns.push(mapped);
    }
  });

  return turns;
}

