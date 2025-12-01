import { NextRequest, NextResponse } from 'next/server';
import { fetchTranscriptDialog } from '@/lib/voiceflowTranscripts';
import { getApiKey } from '@/lib/env';
import type { TranscriptTurn } from '@/types/conversations';

const MOCK_DIALOG: TranscriptTurn[] = [
  {
    id: '1',
    role: 'user',
    content: 'Hey, can you send me the roadmap?',
    timestamp: new Date().toISOString(),
  },
  {
    id: '2',
    role: 'assistant',
    content: 'Absolutely. Here is the latest roadmap link: silo.storage/roadmap.',
    timestamp: new Date().toISOString(),
  },
  {
    id: '3',
    role: 'user',
    content: 'Thanks! Also, how do I join the Discord?',
    timestamp: new Date().toISOString(),
  },
  {
    id: '4',
    role: 'assistant',
    content: 'You can join via invite.silo.storage/discord. Let me know if you need anything else.',
    timestamp: new Date().toISOString(),
  },
];

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const transcriptId = params.id;
  const apiKey = getApiKey();

  if (!transcriptId) {
    return NextResponse.json(
      { error: 'Transcript ID is required' },
      { status: 400 }
    );
  }

  if (!apiKey) {
    return NextResponse.json({ messages: MOCK_DIALOG, isDemo: true }, { status: 200 });
  }

  try {
    const messages = await fetchTranscriptDialog(transcriptId, apiKey);
    return NextResponse.json({ messages, isDemo: false }, { status: 200 });
  } catch (error) {
    console.warn(`Voiceflow transcript dialog failed for ${transcriptId}, using mock data`, error);
    return NextResponse.json({ messages: MOCK_DIALOG, isDemo: true }, { status: 200 });
  }
}

