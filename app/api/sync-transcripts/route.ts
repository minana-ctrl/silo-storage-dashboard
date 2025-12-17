import { NextRequest, NextResponse } from 'next/server';
import { performSync } from '@/lib/sync';
import { jwtVerify } from 'jose';

// Define cache key for analytics
const ANALYTICS_CACHE_KEY_PREFIX = 'analytics_';

/**
 * Clear analytics cache after sync
 * This is important so the user sees the new data immediately
 */
// We need to import the cache clearing function dynamically or duplicate logic
// to avoid circular dependencies if cache uses db etc.
// For now we'll import it - check if it causes issues
import { clearAnalyticsCache } from '@/lib/queryCache';

async function verifyAuth(request: NextRequest): Promise<boolean> {
  // 1. Check CRON_SECRET (for automated jobs or scripts)
  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    const cronSecret = process.env.CRON_SECRET || process.env.JWT_SECRET;
    if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
      return true;
    }
  }

  // 2. Check User Session (for manual refresh button)
  const token = request.cookies.get('auth-token')?.value;
  if (token && process.env.JWT_SECRET) {
    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET);
      await jwtVerify(token, secret);
      return true;
    } catch (e) {
      // Invalid token
    }
  }

  return false;
}

/**
 * POST handler - Syncs transcripts
 * protected by either CRON_SECRET or User Session
 */
export async function POST(request: NextRequest) {
  try {
    const isAuthorized = await verifyAuth(request);

    if (!isAuthorized) {
      console.warn('[Sync POST] Unauthorized sync request');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('[Sync POST] Starting sync job...');

    // Parse body for force flag
    let force = false;
    try {
      const body = await request.json();
      if (body && body.force) {
        force = true;
      }
    } catch (e) {
      // Body might be empty or invalid JSON, ignore
    }

    const result = await performSync({ force });

    // Clear cache so fresh data is loaded
    if (result.synced > 0) {
      clearAnalyticsCache();
      console.log('[Sync POST] Cleared analytics cache');
    }

    return NextResponse.json(
      {
        success: result.errors.length === 0,
        synced: result.synced,
        failed: result.failed,
        errors: result.errors,
      },
      { status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[Sync POST] Unexpected error:', errorMessage);
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

/**
 * GET handler - for local development manual testing only
 */
export async function GET(request: NextRequest) {
  try {
    // Only allow in development
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json(
        { error: 'Only available in development mode' },
        { status: 403 }
      );
    }

    console.log('[Sync GET] Starting manual sync job (development only)...');

    // In Dev, we might want to bypass auth for convenience, or enforce it. 
    // Let's enforce it loosely or just allow it since it's dev-only.
    // But to be consistent with POST, let's just run it.

    const result = await performSync();

    if (result.synced > 0) {
      clearAnalyticsCache();
    }

    return NextResponse.json(
      {
        success: result.errors.length === 0,
        synced: result.synced,
        failed: result.failed,
        errors: result.errors,
      },
      { status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[Sync GET] Unexpected error:', errorMessage);
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
