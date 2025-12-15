import { NextRequest, NextResponse } from 'next/server';
import { fetchTranscriptDialogFromDB } from '@/lib/conversationQueries';
import { getApiKey, getProjectId } from '@/lib/env';
import { fetchTranscriptDialog } from '@/lib/voiceflowTranscripts';
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

  // Check if this is a demo transcript ID
  if (transcriptId.startsWith('demo-transcript-')) {
    // Check for API keys - if present, return empty (not demo data)
    const projectId = getProjectId();
    const apiKey = getApiKey();
    
    if (projectId && apiKey) {
      console.log(`[Conversations] Demo transcript ID ${transcriptId} detected, but API keys are present - returning empty result`);
      return NextResponse.json({ messages: [], isDemo: false }, { status: 200 });
    }
    
    // No API keys - return demo data
    console.warn('[Conversations] Missing Voiceflow credentials - PROJECT_ID or API_KEY not set');
    return NextResponse.json({ messages: MOCK_DIALOG, isDemo: true }, { status: 200 });
  }

  // Check for API keys first
  const projectId = getProjectId();
  const apiKey = getApiKey();
  
  if (!projectId || !apiKey) {
    console.warn('[Conversations] Missing Voiceflow credentials - PROJECT_ID or API_KEY not set');
    return NextResponse.json({ messages: MOCK_DIALOG, isDemo: true }, { status: 200 });
  }

  try {
    console.log(`[Conversations] Fetching transcript ${transcriptId} from database...`);
    const messages = await fetchTranscriptDialogFromDB(transcriptId);
    
    // If no data from DB, try Voiceflow API if keys are present
    if (messages.length === 0) {
      console.log(`[Conversations] No transcript ${transcriptId} in database`);
      
      // If API keys are present, try Voiceflow API as fallback
      if (projectId && apiKey) {
        try {
          console.log(`[Conversations] Attempting to fetch transcript ${transcriptId} from Voiceflow API...`);
          const voiceflowMessages = await fetchTranscriptDialog(transcriptId, apiKey);
          if (voiceflowMessages.length > 0) {
            return NextResponse.json({ messages: voiceflowMessages, isDemo: false }, { status: 200 });
          }
          // Voiceflow API returned empty - return empty result, not mock
          console.log(`[Conversations] Voiceflow API returned no messages for ${transcriptId}`);
          return NextResponse.json({ messages: [], isDemo: false }, { status: 200 });
        } catch (voiceflowError) {
          console.error(`[Conversations] Voiceflow API failed for ${transcriptId}:`, voiceflowError);
          // Voiceflow API failed - return empty result, not mock
          return NextResponse.json({ messages: [], isDemo: false }, { status: 200 });
        }
      }
      
      // No API keys - return empty result, not mock data
      return NextResponse.json({ messages: [], isDemo: false }, { status: 200 });
    }

    return NextResponse.json({ messages, isDemo: false }, { status: 200 });
  } catch (error) {
    console.warn(`[Conversations] Database query failed for ${transcriptId}:`, error);
    
    // If API keys are present, try Voiceflow API as fallback
    if (projectId && apiKey) {
      try {
        console.log(`[Conversations] Attempting to fetch transcript ${transcriptId} from Voiceflow API as fallback...`);
        const voiceflowMessages = await fetchTranscriptDialog(transcriptId, apiKey);
        if (voiceflowMessages.length > 0) {
          return NextResponse.json({ messages: voiceflowMessages, isDemo: false }, { status: 200 });
        }
      } catch (voiceflowError) {
        console.error(`[Conversations] Voiceflow API fallback also failed for ${transcriptId}:`, voiceflowError);
      }
    }
    
    // Both DB and Voiceflow failed, or no API keys, use mock data
    return NextResponse.json({ messages: MOCK_DIALOG, isDemo: true }, { status: 200 });
  }
}

