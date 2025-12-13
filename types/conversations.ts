export type TranscriptSpeaker = 'user' | 'assistant' | 'system';

export interface TranscriptSummary {
  id: string;
  sessionId?: string;
  userId?: string;
  platform?: string;
  createdAt: string;
  lastInteractionAt: string;
  tags: string[];
  properties: Record<string, string | number | boolean | null | undefined>;
  firstUserMessagePreview?: string;
  messageCount?: number;
  durationSeconds?: number;
  raw?: unknown;
}

export interface TranscriptTurn {
  id: string;
  role: TranscriptSpeaker;
  content: string;
  timestamp: string;
  traceType?: string;
  channel?: string;
  raw?: unknown;
}

export interface TranscriptDialogResponse {
  messages: TranscriptTurn[];
}

export interface TranscriptListResponse {
  items: TranscriptSummary[];
  nextCursor?: string;
  isDemo?: boolean;
}

export interface ConversationFilters {
  query?: string;
  platform?: string;
  startTime?: string;
  endTime?: string;
  tag?: string;
  limit?: number;
  cursor?: string;
}






