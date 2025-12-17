// Voiceflow Analytics API v2 endpoint
// Docs: https://analytics-api.voiceflow.com/v2/query/usage
// Auth: VF.DM API key in 'authorization' header
const VOICEFLOW_ANALYTICS_API = 'https://analytics-api.voiceflow.com';

export interface VoiceflowAnalyticsResponse {
  usage: {
    sessions: number;      // Number of conversation sessions (unique periods with user activity)
    messages: number;      // Total interactions/messages
    users: number;         // Sum of unique users per period
  };
  period: {
    start: string;
    end: string;
  };
  // Raw time series data from API for charts
  interactionsTimeSeries: Array<{ period: string; count: number }>;
  usersTimeSeries: Array<{ period: string; count: number }>;
}

interface AnalyticsItem {
  period: string;
  projectID: string;
  environmentID: string;
  count: number;
  type?: string;
}

interface AnalyticsResult {
  result: {
    cursor?: number;
    items?: AnalyticsItem[];
    intents?: Array<{ name: string; count: number }>;
  };
}

// Fetch a single metric from the Analytics API
async function fetchMetric(
  apiKey: string,
  projectId: string,
  metricName: string,
  startTime: string,
  endTime: string
): Promise<AnalyticsResult> {
  const url = `${VOICEFLOW_ANALYTICS_API}/v2/query/usage`;

  // Request body per API docs
  const requestBody = {
    data: {
      name: metricName,
      filter: {
        projectID: projectId,
        startTime: startTime,
        endTime: endTime,
        limit: 500
      }
    }
  };

  console.log(`Fetching ${metricName} from:`, url);
  console.log(`Request body:`, JSON.stringify(requestBody));

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'authorization': apiKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(requestBody),
    cache: 'no-store',
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Voiceflow Analytics API error for ${metricName}:`, errorText);
    throw new Error(`Voiceflow Analytics API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

// Aggregate items by date (YYYY-MM-DD) to get daily totals
function aggregateByDate(items: AnalyticsItem[]): Map<string, number> {
  const dailyTotals = new Map<string, number>();

  for (const item of items) {
    // Extract date from period (e.g., "2025-06-13T18:00:00.000Z" -> "2025-06-13")
    const date = item.period.split('T')[0];
    const currentTotal = dailyTotals.get(date) || 0;
    dailyTotals.set(date, currentTotal + (item.count || 0));
  }

  return dailyTotals;
}

export async function fetchAnalytics(
  projectId: string,
  apiKey: string,
  startDate: string,
  endDate: string
): Promise<VoiceflowAnalyticsResponse> {
  // Convert dates to ISO-8601 format as per API docs
  const startTime = `${startDate}T00:00:00.000Z`;
  const endTime = `${endDate}T23:59:59.999Z`;

  console.log('Fetching analytics for project:', projectId);
  console.log('Date range:', startTime, 'to', endTime);
  console.log('API Key format:', apiKey.substring(0, 10) + '...');

  // Fetch interactions (messages), unique users, and sessions in parallel
  // These are the main metrics per the API docs
  const [interactionsResult, usersResult, sessionsResult] = await Promise.all([
    fetchMetric(apiKey, projectId, 'interactions', startTime, endTime),
    fetchMetric(apiKey, projectId, 'unique_users', startTime, endTime),
    fetchMetric(apiKey, projectId, 'sessions', startTime, endTime).catch((error) => {
      console.warn('Failed to fetch sessions metric, falling back to unique_users:', error);
      return null;
    }),
  ]);

  console.log('Interactions result:', JSON.stringify(interactionsResult).substring(0, 500));
  console.log('Users result:', JSON.stringify(usersResult).substring(0, 500));
  if (sessionsResult) {
    console.log('Sessions result:', JSON.stringify(sessionsResult).substring(0, 500));
  }

  // Process interactions data
  let totalInteractions = 0;
  const interactionsTimeSeries: Array<{ period: string; count: number }> = [];

  if (interactionsResult.result?.items) {
    // Aggregate by date for time series
    const dailyInteractions = aggregateByDate(interactionsResult.result.items);

    for (const [date, count] of dailyInteractions) {
      totalInteractions += count;
      interactionsTimeSeries.push({ period: date, count });
    }

    // Sort by date
    interactionsTimeSeries.sort((a, b) => a.period.localeCompare(b.period));
  }

  // Process unique_users data
  let totalUsers = 0;
  const usersTimeSeries: Array<{ period: string; count: number }> = [];

  if (usersResult.result?.items) {
    // Aggregate by date for time series
    const dailyUsers = aggregateByDate(usersResult.result.items);

    for (const [date, count] of dailyUsers) {
      totalUsers += count;
      usersTimeSeries.push({ period: date, count });
    }

    // Sort by date
    usersTimeSeries.sort((a, b) => a.period.localeCompare(b.period));
  }

  // Process sessions data (actual conversation sessions from Voiceflow)
  let totalSessions = 0;
  if (sessionsResult?.result?.items) {
    const dailySessions = aggregateByDate(sessionsResult.result.items);
    for (const [, count] of dailySessions) {
      totalSessions += count;
    }
  } else {
    // Fallback: approximate sessions using unique users if sessions metric unavailable
    totalSessions = totalUsers;
  }

  console.log('Totals - Interactions:', totalInteractions, 'Sessions:', totalSessions, 'Users:', totalUsers);
  console.log('Interactions time series:', interactionsTimeSeries);
  console.log('Users time series:', usersTimeSeries);

  return {
    usage: {
      sessions: totalSessions,
      messages: totalInteractions,
      users: totalUsers,
    },
    period: {
      start: startDate,
      end: endDate,
    },
    interactionsTimeSeries,
    usersTimeSeries,
  };
}

export async function fetchIntents(
  projectId: string,
  apiKey: string,
  startDate: string,
  endDate: string
): Promise<Array<{ name: string; count: number }>> {
  const startTime = `${startDate}T00:00:00.000Z`;
  const endTime = `${endDate}T23:59:59.999Z`;

  try {
    // Fetch top intents
    const result = await fetchMetric(apiKey, projectId, 'top_intents', startTime, endTime);

    console.log('Top intents result:', JSON.stringify(result).substring(0, 1000));

    // Check for the correct response structure
    // The API returns result.intents (not result.items)
    if (!result.result?.intents || result.result.intents.length === 0) {
      console.warn('No intents returned from API');
      return [];
    }

    // Map the intents directly - they already have name and count
    const intents = result.result.intents
      .map((intent: any) => ({ 
        name: intent.name || 'Unknown', 
        count: intent.count || 0 
      }))
      .sort((a: any, b: any) => b.count - a.count);
    
    console.log('Processed intents:', intents);
    return intents;

  } catch (error) {
    console.warn('Failed to fetch intents:', error);
    return [];
  }
}

export function getDateRange(days: number = 7): { startDate: string; endDate: string } {
  // Always calculate based on Sydney time to keep analytics consistent
  const now = new Date();
  const sydneyNow = new Date(
    now.toLocaleString('en-US', { timeZone: 'Australia/Sydney' })
  );

  const formatDate = (date: Date) => date.toISOString().split('T')[0];
  const endDate = formatDate(sydneyNow);

  if (days <= 0) {
    // Today only
    return { startDate: endDate, endDate };
  }

  if (days === 1) {
    // Yesterday only
    const yesterday = new Date(sydneyNow);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = formatDate(yesterday);
    return { startDate: yesterdayStr, endDate: yesterdayStr };
  }

  // Last N days inclusive of today (e.g., days=7 => last 7 calendar days)
  const startDateObj = new Date(sydneyNow);
  startDateObj.setDate(startDateObj.getDate() - (days - 1));

  return {
    startDate: formatDate(startDateObj),
    endDate,
  };
}

