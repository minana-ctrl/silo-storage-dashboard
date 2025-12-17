import { NextRequest, NextResponse } from 'next/server';

import { getAnalyticsDataCombined } from '@/lib/analyticsQueries';
import { getApiKey, getProjectId } from '@/lib/env';
import { fetchAnalytics, getDateRange } from '@/lib/voiceflow';

function calculateEffectiveDays(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffMs = end.getTime() - start.getTime();
  if (diffMs <= 0) return 1;
  return Math.floor(diffMs / (24 * 60 * 60 * 1000)) + 1;
}

function percentDiff(current: number, reference: number): number {
  if (reference === 0) {
    return current === 0 ? 0 : 100;
  }
  return ((current - reference) / reference) * 100;
}

export async function POST(request: NextRequest) {
  try {
    const projectId = getProjectId();
    const apiKey = getApiKey();

    if (!projectId || !apiKey) {
      return NextResponse.json(
        { error: 'Missing Voiceflow credentials (PROJECT_ID / API_KEY)' },
        { status: 400 }
      );
    }

    let body: { days?: number; startDate?: string; endDate?: string } = {};
    try {
      body = await request.json();
    } catch {
      // ignore empty body
    }

    const { days, startDate: customStart, endDate: customEnd } = body;

    let startDate: string;
    let endDate: string;
    let effectiveDays: number;

    if (customStart && customEnd) {
      startDate = customStart;
      endDate = customEnd;
      effectiveDays = calculateEffectiveDays(customStart, customEnd);
    } else {
      effectiveDays = typeof days === 'number' ? days : 7;
      const range = getDateRange(effectiveDays);
      startDate = range.startDate;
      endDate = range.endDate;
    }

    const [dbData, voiceflowData] = await Promise.all([
      getAnalyticsDataCombined(startDate, endDate),
      fetchAnalytics(projectId, apiKey, startDate, endDate),
    ]);

    const dbStats = dbData.conversationStats;
    const vfStats = voiceflowData.usage;

    const response = {
      parameters: {
        startDate,
        endDate,
        effectiveDays,
      },
      database: {
        conversations: dbStats.totalConversations,
        messages: dbStats.totalMessages,
        users: dbStats.totalUsers,
      },
      voiceflow: {
        conversations: vfStats.sessions,
        messages: vfStats.messages,
        users: vfStats.users,
      },
      deltas: {
        conversations: dbStats.totalConversations - vfStats.sessions,
        messages: dbStats.totalMessages - vfStats.messages,
        users: dbStats.totalUsers - vfStats.users,
        conversationPercent: Math.round(percentDiff(dbStats.totalConversations, vfStats.sessions) * 100) / 100,
        messagePercent: Math.round(percentDiff(dbStats.totalMessages, vfStats.messages) * 100) / 100,
        userPercent: Math.round(percentDiff(dbStats.totalUsers, vfStats.users) * 100) / 100,
      },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('[Analytics Validation] Unexpected error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Validation failed' },
      { status: 500 }
    );
  }
}

