import { NextRequest, NextResponse } from 'next/server';
import { performSync } from '@/lib/sync';

export async function POST(request: NextRequest) {
  try {
    console.log('[Admin] Force full re-sync initiated');
    
    const result = await performSync({ force: true });
    
    return NextResponse.json({
      success: true,
      synced: result.synced,
      failed: result.failed,
      errors: result.errors,
      message: `Successfully synced ${result.synced} transcripts${
        result.failed > 0 ? `, ${result.failed} failed` : ''
      }`,
    });
  } catch (error) {
    console.error('[Admin] Force sync error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

