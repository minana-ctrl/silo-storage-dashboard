import { NextRequest, NextResponse } from 'next/server';
import performanceMonitor from '@/lib/performanceMonitor';

/**
 * GET /api/debug-performance
 * Returns performance monitoring statistics
 * Only available in development mode
 */
export async function GET(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'Performance monitoring only available in development mode' },
      { status: 403 }
    );
  }

  try {
    const summary = performanceMonitor.getSummary();
    return NextResponse.json(summary, { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

