import { NextRequest, NextResponse } from 'next/server';
import { fetchTranscriptSummariesFromDB } from '@/lib/conversationQueries';
import type { ConversationFilters, TranscriptListResponse, TranscriptSummary } from '@/types/conversations';

const MOCK_USERS = [
  { id: 'new-user-8472', platform: 'web' },
  { id: 'beta-user-1134', platform: 'whatsapp' },
  { id: 'investor-9043', platform: 'web' },
  { id: 'ops-lead-2210', platform: 'web' },
];

function parseFilters(request: NextRequest): ConversationFilters {
  const url = new URL(request.url);
  const { searchParams } = url;

  const filters: ConversationFilters = {};

  const limit = searchParams.get('limit');
  if (limit) {
    const parsed = Math.min(100, Math.max(1, Number(limit)));
    if (!Number.isNaN(parsed)) filters.limit = parsed;
  }

  if (searchParams.get('cursor')) filters.cursor = searchParams.get('cursor') ?? undefined;
  if (searchParams.get('q')) filters.query = searchParams.get('q') ?? undefined;
  if (searchParams.get('platform')) filters.platform = searchParams.get('platform') ?? undefined;
  if (searchParams.get('tag')) filters.tag = searchParams.get('tag') ?? undefined;
  if (searchParams.get('startTime')) filters.startTime = searchParams.get('startTime') ?? undefined;
  if (searchParams.get('endTime')) filters.endTime = searchParams.get('endTime') ?? undefined;

  return filters;
}

function generateMockTranscripts(count = 8): TranscriptListResponse {
  const items: TranscriptSummary[] = [];
  const now = new Date();

  for (let i = 0; i < count; i += 1) {
    const user = MOCK_USERS[i % MOCK_USERS.length];
    const createdAt = new Date(now);
    createdAt.setHours(now.getHours() - i * 4);
    const endedAt = new Date(createdAt);
    endedAt.setMinutes(createdAt.getMinutes() + 8 + i);

    items.push({
      id: `demo-transcript-${i}`,
      sessionId: `${user.id}-session-${i}`,
      userId: user.id,
      platform: user.platform,
      createdAt: createdAt.toISOString(),
      lastInteractionAt: endedAt.toISOString(),
      tags: i % 2 === 0 ? ['Join Discord'] : ['Roadmap'],
      properties: { sentiment: i % 2 === 0 ? 'positive' : 'neutral' },
      firstUserMessagePreview:
        i % 2 === 0 ? 'I want to access the roadmap.' : 'How do I join the Discord?',
      messageCount: 6 + i,
      durationSeconds: (endedAt.getTime() - createdAt.getTime()) / 1000,
      raw: undefined,
    });
  }

  return {
    items,
    isDemo: true,
  };
}

export async function GET(request: NextRequest) {
  const filters = parseFilters(request);

  try {
    console.log('[Conversations] Fetching transcripts from database...');
    const data = await fetchTranscriptSummariesFromDB(filters);
    
    // If no data from DB, fall back to mock
    if (data.items.length === 0) {
      console.log('[Conversations] No transcripts in database, returning mock data');
      return NextResponse.json(generateMockTranscripts(), { status: 200 });
    }

    return NextResponse.json(
      { ...data, isDemo: false },
      { status: 200 }
    );
  } catch (error) {
    console.warn('[Conversations] Database query failed, returning mock data:', error);
    const response = generateMockTranscripts();
    return NextResponse.json(response, { status: 200 });
  }
}

