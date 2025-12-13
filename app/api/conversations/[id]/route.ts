import { NextRequest, NextResponse } from 'next/server';
import { fetchTranscriptDialogFromDB } from '@/lib/conversationQueries';
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

  if (!transcriptId) {
    return NextResponse.json(
      { error: 'Transcript ID is required' },
      { status: 400 }
    );
  }

  try {
    console.log(`[Conversations] Fetching transcript ${transcriptId} from database...`);
    const messages = await fetchTranscriptDialogFromDB(transcriptId);
    
    // If no data from DB, fall back to mock
    if (messages.length === 0) {
      console.log(`[Conversations] No transcript ${transcriptId} in database, using mock data`);
      return NextResponse.json({ messages: MOCK_DIALOG, isDemo: true }, { status: 200 });
    }

    return NextResponse.json({ messages, isDemo: false }, { status: 200 });
  } catch (error) {
    console.warn(`[Conversations] Database query failed for ${transcriptId}, using mock data:`, error);
    return NextResponse.json({ messages: MOCK_DIALOG, isDemo: true }, { status: 200 });
  }
}

