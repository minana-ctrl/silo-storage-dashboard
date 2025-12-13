import { query } from '@/lib/db';
import type {
  LocationBreakdownActual,
  CategoryBreakdownByTypeuser,
  SatisfactionScoreData,
  FeedbackData,
  RatingDistribution,
} from '@/types/analytics';

/**
 * Get category breakdown (Rent/Sales Ratio)
 * Sales = investor + owneroccupier
 */
export async function getCategoryBreakdown(
  startDate: string,
  endDate: string
): Promise<CategoryBreakdownByTypeuser> {
  const result = await query<{ typeuser: string; count: string }>(
    `
    SELECT 
      typeuser,
      COUNT(*) as count
    FROM public.vf_sessions
    WHERE started_at >= $1::date AND started_at < ($2::date + INTERVAL '1 day')
      AND typeuser IS NOT NULL
    GROUP BY typeuser
    `,
    [startDate, endDate]
  );

  return {
    tenant: parseInt(result.rows.find((r) => r.typeuser === 'tenant')?.count || '0', 10),
    investor: parseInt(result.rows.find((r) => r.typeuser === 'investor')?.count || '0', 10),
    owneroccupier: parseInt(result.rows.find((r) => r.typeuser === 'owneroccupier')?.count || '0', 10),
  };
}

/**
 * Get location breakdown by type and location
 */
export async function getLocationBreakdown(
  startDate: string,
  endDate: string
): Promise<LocationBreakdownActual> {
  const result = await query<{
    location_type: string;
    location_value: string;
    count: string;
  }>(
    `
    SELECT 
      location_type,
      LOWER(TRIM(location_value)) as location_value,
      COUNT(*) as count
    FROM public.vf_sessions
    WHERE started_at >= $1::date AND started_at < ($2::date + INTERVAL '1 day')
      AND location_type IS NOT NULL
      AND location_value IS NOT NULL
    GROUP BY location_type, LOWER(TRIM(location_value))
    `,
    [startDate, endDate]
  );

  const breakdown: LocationBreakdownActual = {
    rent: { wollongong: 0, huskisson: 0, nowra: 0 },
    investor: { wollongong: 0, nowra: 0, oranpark: 0 },
    owneroccupier: { wollongong: 0, nowra: 0, oranpark: 0 },
  };

  for (const row of result.rows) {
    // Map location_type to breakdown key (rental → rent)
    const locTypeKey = row.location_type === 'rental' ? 'rent' : row.location_type;
    const locType = locTypeKey as keyof typeof breakdown;
    const locValue = row.location_value;
    const count = parseInt(row.count, 10);

    if (locType in breakdown && locValue in breakdown[locType]) {
      (breakdown[locType][locValue as keyof (typeof breakdown)[typeof locType]] as number) = count;
    }
  }

  return breakdown;
}

/**
 * Get satisfaction score (average, distribution, trend)
 */
export async function getSatisfactionScore(
  startDate: string,
  endDate: string
): Promise<SatisfactionScoreData> {
  const result = await query<{
    rating: number;
    count: string;
    date: string;
  }>(
    `
    SELECT 
      rating,
      COUNT(*) as count,
      started_at::date as date
    FROM public.vf_sessions
    WHERE started_at >= $1::date AND started_at < ($2::date + INTERVAL '1 day')
      AND rating IS NOT NULL
    GROUP BY rating, started_at::date
    ORDER BY started_at::date, rating
    `,
    [startDate, endDate]
  );

  // Calculate average
  let totalRatings = 0;
  let sumRatings = 0;
  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const trend: number[] = [];

  for (const row of result.rows) {
    const count = parseInt(row.count, 10);
    totalRatings += count;
    sumRatings += row.rating * count;

    if (row.rating in distribution) {
      distribution[row.rating] += count;
    }

    // Add to trend (individual ratings)
    for (let i = 0; i < count; i++) {
      trend.push(row.rating);
    }
  }

  const average = totalRatings > 0 ? sumRatings / totalRatings : 0;

  // Convert distribution to array format
  const distributionArray: RatingDistribution[] = Object.entries(distribution)
    .filter(([_, count]) => count > 0)
    .map(([rating, count]) => ({
      rating: parseInt(rating, 10),
      count,
    }));

  return {
    average: Math.round(average * 100) / 100,
    totalRatings,
    distribution: distributionArray,
    trend,
  };
}

/**
 * Get feedback entries (only for ratings 1-3)
 */
export async function getFeedback(
  startDate: string,
  endDate: string
): Promise<FeedbackData> {
  const result = await query<{
    rating: number;
    text: string;
    timestamp: string;
    transcriptId: string;
  }>(
    `
    SELECT 
      rating,
      feedback as text,
      started_at as timestamp,
      transcript_id as "transcriptId"
    FROM public.vf_sessions
    WHERE started_at >= $1::date AND started_at < ($2::date + INTERVAL '1 day')
      AND feedback IS NOT NULL
      AND rating <= 3
    ORDER BY started_at DESC
    `,
    [startDate, endDate]
  );

  return {
    items: result.rows,
    totalCount: result.rowCount || 0,
  };
}

/**
 * Get funnel breakdown by typeuser
 * Shows progression: typeuser_selected -> location_selected
 */
export async function getFunnelBreakdown(
  startDate: string,
  endDate: string
): Promise<{
  rent: { clicks: number; locationSelection: number };
  ownerOccupier: { clicks: number; locationSelection: number };
  investor: { clicks: number; locationSelection: number };
}> {
  // Get the number of sessions per typeuser
  const sessionResult = await query<{ typeuser: string; count: string }>(
    `
    SELECT 
      typeuser,
      COUNT(*) as count
    FROM public.vf_sessions
    WHERE started_at >= $1::date AND started_at < ($2::date + INTERVAL '1 day')
      AND typeuser IS NOT NULL
    GROUP BY typeuser
    `,
    [startDate, endDate]
  );

  // Get sessions with locations selected
  const locationResult = await query<{ typeuser: string; count: string }>(
    `
    SELECT 
      typeuser,
      COUNT(*) as count
    FROM public.vf_sessions
    WHERE started_at >= $1::date AND started_at < ($2::date + INTERVAL '1 day')
      AND typeuser IS NOT NULL
      AND location_value IS NOT NULL
    GROUP BY typeuser
    `,
    [startDate, endDate]
  );

  const sessionsByType: Record<string, number> = {};
  const locationsByType: Record<string, number> = {};

  for (const row of sessionResult.rows) {
    sessionsByType[row.typeuser] = parseInt(row.count, 10);
  }

  for (const row of locationResult.rows) {
    locationsByType[row.typeuser] = parseInt(row.count, 10);
  }

  // Map to analytics format
  return {
    rent: {
      clicks: sessionsByType.tenant || 0,
      locationSelection: locationsByType.tenant || 0,
    },
    ownerOccupier: {
      clicks: sessionsByType.owneroccupier || 0,
      locationSelection: locationsByType.owneroccupier || 0,
    },
    investor: {
      clicks: sessionsByType.investor || 0,
      locationSelection: locationsByType.investor || 0,
    },
  };
}

/**
 * Get total conversations and messages count
 */
export async function getConversationStats(
  startDate: string,
  endDate: string
): Promise<{ totalConversations: number; totalMessages: number; totalUsers: number }> {
  const sessionResult = await query<{ count: string }>(
    `
    SELECT COUNT(*) as count
    FROM public.vf_sessions
    WHERE started_at >= $1::date AND started_at < ($2::date + INTERVAL '1 day')
    `,
    [startDate, endDate]
  );

  const messageResult = await query<{ count: string }>(
    `
    SELECT COUNT(*) as count
    FROM public.vf_turns
    WHERE timestamp >= $1::date AND timestamp < ($2::date + INTERVAL '1 day')
      AND role IN ('user', 'assistant')
    `,
    [startDate, endDate]
  );

  const userResult = await query<{ count: string }>(
    `
    SELECT COUNT(DISTINCT user_id) as count
    FROM public.vf_sessions
    WHERE started_at >= $1::date AND started_at < ($2::date + INTERVAL '1 day')
      AND user_id IS NOT NULL
    `,
    [startDate, endDate]
  );

  return {
    totalConversations: parseInt(sessionResult.rows[0]?.count || '0', 10),
    totalMessages: parseInt(messageResult.rows[0]?.count || '0', 10),
    totalUsers: parseInt(userResult.rows[0]?.count || '0', 10),
  };
}

/**
 * Get CTA (Call-to-Action) metrics
 */
export async function getCTAMetrics(startDate: string, endDate: string): Promise<number> {
  const result = await query<{ count: string }>(
    `
    SELECT COUNT(*) as count
    FROM public.vf_events
    WHERE event_ts >= $1::date AND event_ts < ($2::date + INTERVAL '1 day')
      AND event_type = 'cta_clicked'
    `,
    [startDate, endDate]
  );

  return parseInt(result.rows[0]?.count || '0', 10);
}

/**
 * Get CTA views breakdown by CTA name
 */
export async function getCTABreakdown(
  startDate: string,
  endDate: string
): Promise<Record<string, number>> {
  const result = await query<{ cta_name: string; count: string }>(
    `
    SELECT 
      cta_name,
      COUNT(*) as count
    FROM public.vf_events
    WHERE event_ts >= $1::date AND event_ts < ($2::date + INTERVAL '1 day')
      AND event_type = 'cta_clicked'
      AND cta_name IS NOT NULL
    GROUP BY cta_name
    ORDER BY count DESC
    `,
    [startDate, endDate]
  );

  const breakdown: Record<string, number> = {};
  for (const row of result.rows) {
    breakdown[row.cta_name] = parseInt(row.count, 10);
  }

  return breakdown;
}
