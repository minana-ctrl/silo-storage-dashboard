import { NextRequest, NextResponse } from 'next/server';
import {
  getCategoryBreakdown,
  getLocationBreakdown,
  getSatisfactionScore,
  getFeedback,
  getFunnelBreakdown,
  getConversationStats,
  getCTAMetrics,
} from '@/lib/analyticsQueries';
import { query } from '@/lib/db';
import { getApiKey, getProjectId } from '@/lib/env';
import { fetchAnalytics, fetchIntents } from '@/lib/voiceflow';
import { getCachedAnalytics, cacheAnalytics, clearAnalyticsCache } from '@/lib/queryCache';
import type { LocationBreakdown } from '@/types/analytics';

// Generate mock data for development/demo purposes when DB is empty
function generateMockData(days: number, startDate: string, endDate: string) {
  const baseConversations = 150 + Math.floor(Math.random() * 50);
  const baseMessages = 450 + Math.floor(Math.random() * 100);
  const baseUsers = 75 + Math.floor(Math.random() * 25);

  const timeSeries = [];
  const currentDate = new Date(startDate);
  const end = new Date(endDate);

  while (currentDate <= end) {
    timeSeries.push({
      date: currentDate.toISOString().split('T')[0],
      conversations: Math.floor(baseConversations / days) + Math.floor(Math.random() * 10),
      messages: Math.floor(baseMessages / days) + Math.floor(Math.random() * 20),
    });
    currentDate.setDate(currentDate.getDate() + 1);
  }

  const trendLength = Math.min(days, 30);
  const satisfactionScore = {
    average: 4.2 + Math.random() * 0.5,
    trend: Array.from({ length: Math.max(1, trendLength) }, () => 3.5 + Math.random() * 1.5),
  };

  const clickThrough = {
    rent: Math.floor(Math.random() * 200) + 100,
    sales: Math.floor(Math.random() * 150) + 50,
    ownerOccupier: Math.floor(Math.random() * 80) + 20,
    investor: Math.floor(Math.random() * 60) + 10,
  };

  const funnel = {
    rent: {
      clicks: clickThrough.rent,
      locationSelection: Math.floor(clickThrough.rent * 0.7),
    },
    ownerOccupier: {
      clicks: clickThrough.ownerOccupier,
      locationSelection: Math.floor(clickThrough.ownerOccupier * 0.6),
    },
    investor: {
      clicks: clickThrough.investor,
      locationSelection: Math.floor(clickThrough.investor * 0.5),
    },
  };

  const locationBreakdown: LocationBreakdown = {
    rent: {
      huskisson: Math.floor(Math.random() * 50) + 10,
      wollongong: Math.floor(Math.random() * 80) + 20,
      nowra: Math.floor(Math.random() * 40) + 10,
    },
    investor: {
      wollongong: Math.floor(Math.random() * 60) + 15,
      nowra: Math.floor(Math.random() * 50) + 10,
      oranPark: Math.floor(Math.random() * 40) + 10,
    },
    ownerOccupier: {
      wollongong: Math.floor(Math.random() * 70) + 15,
      nowra: Math.floor(Math.random() * 50) + 10,
      oranPark: Math.floor(Math.random() * 45) + 10,
    },
  };

  const topIntents = [
    { name: 'inquiry_rent', count: Math.floor(Math.random() * 100) + 30 },
    { name: 'inquiry_investment', count: Math.floor(Math.random() * 80) + 20 },
    { name: 'request_information', count: Math.floor(Math.random() * 70) + 20 },
    { name: 'schedule_inspection', count: Math.floor(Math.random() * 60) + 15 },
    { name: 'location_inquiry', count: Math.floor(Math.random() * 50) + 10 },
  ];

  const totalCTAViews = clickThrough.rent + clickThrough.sales + clickThrough.ownerOccupier + clickThrough.investor;

  return {
    metrics: {
      totalConversations: baseConversations,
      incomingMessages: baseMessages,
      averageInteractions: Math.round((baseMessages / baseConversations) * 10) / 10,
      uniqueUsers: baseUsers,
      conversationsChange: Math.round((Math.random() * 30 - 10) * 10) / 10,
      messagesChange: Math.round((Math.random() * 40 - 15) * 10) / 10,
    },
    timeSeries,
    satisfactionScore,
    clickThrough,
    funnel,
    locationBreakdown,
    totalCTAViews,
    topIntents,
    period: {
      start: startDate,
      end: endDate,
    },
    isDemo: true,
  };
}

export async function POST(request: NextRequest) {
  try {
    // Check for API keys first
    const projectId = getProjectId();
    const apiKey = getApiKey();
    
    if (!projectId || !apiKey) {
      console.warn('[Analytics] Missing Voiceflow credentials - PROJECT_ID or API_KEY not set');
      const { days, startDate: customStartDate, endDate: customEndDate } = await request.json();
      let startDate: string;
      let endDate: string;
      let effectiveDays: number;

      if (customStartDate && customEndDate) {
        startDate = customStartDate;
        endDate = customEndDate;
        const start = new Date(customStartDate);
        const end = new Date(customEndDate);
        effectiveDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      } else {
        effectiveDays = days !== undefined ? days : 7;
        const now = new Date();
        endDate = now.toISOString().split('T')[0];
        const start = new Date(now);
        
        if (effectiveDays === 0) {
          startDate = endDate;
        } else if (effectiveDays === 1) {
          start.setDate(start.getDate() - 1);
          startDate = start.toISOString().split('T')[0];
          endDate = startDate;
        } else {
          start.setDate(start.getDate() - effectiveDays + 1);
          startDate = start.toISOString().split('T')[0];
        }
      }
      
      return NextResponse.json(generateMockData(effectiveDays, startDate, endDate));
    }

    const { days, startDate: customStartDate, endDate: customEndDate } = await request.json();

    // Use custom dates if provided, otherwise calculate from days
    let startDate: string;
    let endDate: string;
    let effectiveDays: number;

    if (customStartDate && customEndDate) {
      startDate = customStartDate;
      endDate = customEndDate;
      const start = new Date(customStartDate);
      const end = new Date(customEndDate);
      effectiveDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    } else {
      effectiveDays = days !== undefined ? days : 7;
      
      // Use Sydney timezone (Australia/Sydney - AEDT/AEST)
      const sydneyNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Australia/Sydney' }));
      endDate = sydneyNow.toISOString().split('T')[0];
      
      if (effectiveDays === 0) {
        // Today in Sydney time
        startDate = endDate;
      } else if (effectiveDays === 1) {
        // Yesterday in Sydney time
        const sydneyYesterday = new Date(sydneyNow);
        sydneyYesterday.setDate(sydneyYesterday.getDate() - 1);
        startDate = sydneyYesterday.toISOString().split('T')[0];
        endDate = startDate;
      } else {
        // Last N days in Sydney time
        const sydneyStart = new Date(sydneyNow);
        sydneyStart.setDate(sydneyStart.getDate() - (effectiveDays - 1));
        startDate = sydneyStart.toISOString().split('T')[0];
      }
    }

    // Try to fetch from database first
    try {
      console.log(`[Analytics] Fetching data from database for ${startDate} to ${endDate}`);

      // Check cache first
      const cachedResult = getCachedAnalytics(startDate, endDate);
      if (cachedResult) {
        console.log(`[Analytics] Cache hit for ${startDate} to ${endDate}`);
        return NextResponse.json(cachedResult, { status: 200 });
      }

      // Fetch current period data from database
      const [
        categoryBreakdown,
        locationBreakdown,
        satisfactionScore,
        feedback,
        funnelBreakdown,
        conversationStats,
        totalCTAViews,
      ] = await Promise.all([
        getCategoryBreakdown(startDate, endDate),
        getLocationBreakdown(startDate, endDate),
        getSatisfactionScore(startDate, endDate),
        getFeedback(startDate, endDate),
        getFunnelBreakdown(startDate, endDate),
        getConversationStats(startDate, endDate),
        getCTAMetrics(startDate, endDate),
      ]);

      // Fetch previous period for comparison
      const previousStartDate = new Date(startDate);
      previousStartDate.setDate(previousStartDate.getDate() - effectiveDays);
      const previousEndDate = new Date(startDate);
      previousEndDate.setDate(previousEndDate.getDate() - 1);

      const previousStats = await getConversationStats(
        previousStartDate.toISOString().split('T')[0],
        previousEndDate.toISOString().split('T')[0]
      );

      // Calculate percentage changes
      const conversationsChange =
        previousStats.totalConversations > 0
          ? (((conversationStats.totalConversations - previousStats.totalConversations) /
              previousStats.totalConversations) *
              100)
          : conversationStats.totalConversations > 0
            ? 100
            : 0;

      const messagesChange =
        previousStats.totalMessages > 0
          ? (((conversationStats.totalMessages - previousStats.totalMessages) /
              previousStats.totalMessages) *
              100)
          : conversationStats.totalMessages > 0
            ? 100
            : 0;

      // Build time series data
      const dateMap = new Map<string, { conversations: number; messages: number }>();
      const currentDate = new Date(startDate);
      const end = new Date(endDate);

      // Initialize all dates with 0
      while (currentDate <= end) {
        const dateStr = currentDate.toISOString().split('T')[0];
        dateMap.set(dateStr, { conversations: 0, messages: 0 });
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Query daily stats from database (using Sydney timezone)
      const dailyResult = await query<{
        date: string;
        conversations: string;
        messages: string;
      }>(
        `
        SELECT 
          s.date,
          COUNT(DISTINCT s.session_id) as conversations,
          COALESCE(SUM(t.message_count), 0) as messages
        FROM (
          SELECT 
            session_id,
            (started_at AT TIME ZONE 'UTC' AT TIME ZONE 'Australia/Sydney')::date as date
          FROM public.vf_sessions
          WHERE (started_at AT TIME ZONE 'UTC' AT TIME ZONE 'Australia/Sydney')::date >= $1::date 
            AND (started_at AT TIME ZONE 'UTC' AT TIME ZONE 'Australia/Sydney')::date <= $2::date
        ) s
        LEFT JOIN (
          SELECT 
            session_id,
            COUNT(*) as message_count
          FROM public.vf_turns
          WHERE role IN ('user', 'assistant')
          GROUP BY session_id
        ) t ON s.session_id = t.session_id
        GROUP BY s.date
        ORDER BY s.date
        `,
        [startDate, endDate]
      );

      for (const row of dailyResult.rows) {
        // Convert date to string format matching dateMap keys (YYYY-MM-DD)
        const dateStr = typeof row.date === 'string' 
          ? row.date 
          : new Date(row.date).toISOString().split('T')[0];
        
        const existing = dateMap.get(dateStr);
        if (existing) {
          existing.conversations = parseInt(row.conversations, 10);
          existing.messages = parseInt(row.messages, 10);
        }
      }

      // Convert map to sorted array
      const timeSeries = Array.from(dateMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, data]) => ({
          date,
          conversations: data.conversations,
          messages: data.messages,
        }));

      // Generate top intents from stored data (mock for now, can be enhanced)
      const topIntents = [
        { name: 'inquiry_rent', count: categoryBreakdown.tenant * 2 },
        { name: 'inquiry_investment', count: categoryBreakdown.investor },
        { name: 'request_information', count: categoryBreakdown.owneroccupier },
        { name: 'location_inquiry', count: Object.values(locationBreakdown.rent).reduce((a, b) => a + b, 0) },
        { name: 'schedule_inspection', count: totalCTAViews },
      ].filter((i) => i.count > 0);

      // Map category breakdown to clickthrough format
      const clickThrough = {
        rent: categoryBreakdown.tenant,
        sales: categoryBreakdown.investor + categoryBreakdown.owneroccupier,
        ownerOccupier: categoryBreakdown.owneroccupier,
        investor: categoryBreakdown.investor,
      };

      // Transform location breakdown to match expected format
      const locationBreakdownFormatted: LocationBreakdown = {
        rent: {
          huskisson: locationBreakdown.rent.huskisson || 0,
          wollongong: locationBreakdown.rent.wollongong || 0,
          nowra: locationBreakdown.rent.nowra || 0,
        },
        investor: {
          wollongong: locationBreakdown.investor.wollongong || 0,
          nowra: locationBreakdown.investor.nowra || 0,
          oranPark: locationBreakdown.investor.oranpark || 0,
        },
        ownerOccupier: {
          wollongong: locationBreakdown.owneroccupier.wollongong || 0,
          nowra: locationBreakdown.owneroccupier.nowra || 0,
          oranPark: locationBreakdown.owneroccupier.oranpark || 0,
        },
      };

      console.log(
        `[Analytics] Successfully fetched from DB: ${conversationStats.totalConversations} conversations, ${conversationStats.totalMessages} messages`
      );

      const responseData = {
        metrics: {
          totalConversations: conversationStats.totalConversations,
          incomingMessages: conversationStats.totalMessages,
          averageInteractions:
            conversationStats.totalConversations > 0
              ? Math.round((conversationStats.totalMessages / conversationStats.totalConversations) * 10) / 10
              : 0,
          uniqueUsers: conversationStats.totalUsers,
          conversationsChange: Math.round(conversationsChange * 10) / 10,
          messagesChange: Math.round(messagesChange * 10) / 10,
        },
        timeSeries,
        satisfactionScore: {
          average: satisfactionScore.average,
          trend: satisfactionScore.trend,
          totalRatings: satisfactionScore.totalRatings,
          distribution: satisfactionScore.distribution,
        },
        clickThrough,
        funnel: funnelBreakdown,
        locationBreakdown: locationBreakdownFormatted,
        totalCTAViews,
        topIntents,
        period: {
          start: startDate,
          end: endDate,
        },
        isDemo: false,
      };

      // Cache the result for future requests
      cacheAnalytics(startDate, endDate, responseData);

      return NextResponse.json(responseData, { status: 200 });
    } catch (dbError) {
      console.warn('[Analytics] Database query failed:', dbError);
      
      // If API keys are present, try Voiceflow API as fallback
      if (projectId && apiKey) {
        try {
          console.log('[Analytics] Attempting to fetch from Voiceflow API as fallback...');
          const voiceflowData = await fetchAnalytics(projectId, apiKey, startDate, endDate);
          const topIntents = await fetchIntents(projectId, apiKey, startDate, endDate);
          
          // Transform Voiceflow API response to match expected format
          const timeSeries = voiceflowData.interactionsTimeSeries.map(item => ({
            date: item.period,
            conversations: voiceflowData.usersTimeSeries.find(u => u.period === item.period)?.count || 0,
            messages: item.count,
          }));
          
          return NextResponse.json({
            metrics: {
              totalConversations: voiceflowData.usage.sessions,
              incomingMessages: voiceflowData.usage.messages,
              averageInteractions: voiceflowData.usage.sessions > 0 
                ? Math.round((voiceflowData.usage.messages / voiceflowData.usage.sessions) * 10) / 10 
                : 0,
              uniqueUsers: voiceflowData.usage.users,
              conversationsChange: 0,
              messagesChange: 0,
            },
            timeSeries,
            satisfactionScore: {
              average: 0,
              trend: [],
              totalRatings: 0,
              distribution: {},
            },
            clickThrough: {
              rent: 0,
              sales: 0,
              ownerOccupier: 0,
              investor: 0,
            },
            funnel: {
              rent: { clicks: 0, locationSelection: 0 },
              ownerOccupier: { clicks: 0, locationSelection: 0 },
              investor: { clicks: 0, locationSelection: 0 },
            },
            locationBreakdown: {
              rent: { huskisson: 0, wollongong: 0, nowra: 0 },
              investor: { wollongong: 0, nowra: 0, oranPark: 0 },
              ownerOccupier: { wollongong: 0, nowra: 0, oranPark: 0 },
            },
            totalCTAViews: 0,
            topIntents: topIntents.slice(0, 5),
            period: {
              start: startDate,
              end: endDate,
            },
            isDemo: false, // Using real Voiceflow data, not demo
          }, { status: 200 });
        } catch (voiceflowError) {
          console.error('[Analytics] Voiceflow API fallback also failed:', voiceflowError);
          // Both DB and Voiceflow failed, show demo data
          return NextResponse.json(generateMockData(effectiveDays, startDate, endDate));
        }
      }
      
      // No API keys or both DB and Voiceflow failed, fall back to mock data
      return NextResponse.json(generateMockData(effectiveDays, startDate, endDate));
    }
  } catch (error) {
    console.error('[Analytics] Unexpected error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}


