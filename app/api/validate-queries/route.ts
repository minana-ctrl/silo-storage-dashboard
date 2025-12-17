import { NextRequest, NextResponse } from 'next/server';
import {
  getCategoryBreakdown,
  getLocationBreakdown,
  getSatisfactionScore,
  getFunnelBreakdown,
  getConversationStats,
} from '@/lib/analyticsQueries';
import { query } from '@/lib/db';

interface QueryValidation {
  name: string;
  startDate: string;
  endDate: string;
  result: unknown;
  rowCount: number;
  errors: string[];
  notes: string[];
}

interface ValidationResult {
  timestamp: string;
  dateRange: { start: string; end: string };
  queries: QueryValidation[];
  overallStatus: 'success' | 'partial' | 'failed';
  recommendations: string[];
  rawDebugInfo: {
    dbSessionCount: number;
    sessionsWithRating: number;
    sessionsWithTypeuser: number;
    sessionsWithLocation: number;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const startDate = body.startDate || '2025-12-01';
    const endDate = body.endDate || '2025-12-31';

    const queries: QueryValidation[] = [];
    const errors: string[] = [];
    const recommendations: string[] = [];
    let overallStatus: 'success' | 'partial' | 'failed' = 'success';

    // 1. Test Category Breakdown
    try {
      const result = await getCategoryBreakdown(startDate, endDate);
      const total = result.tenant + result.investor + result.owneroccupier;
      queries.push({
        name: 'getCategoryBreakdown',
        startDate,
        endDate,
        result,
        rowCount: total,
        errors: [],
        notes: [`Total sessions by typeuser: ${total}`, `Tenant: ${result.tenant}, Investor: ${result.investor}, Owner-Occupier: ${result.owneroccupier}`],
      });
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      errors.push(`getCategoryBreakdown: ${error}`);
      overallStatus = 'partial';
      queries.push({
        name: 'getCategoryBreakdown',
        startDate,
        endDate,
        result: null,
        rowCount: 0,
        errors: [error],
        notes: [],
      });
    }

    // 2. Test Location Breakdown
    try {
      const result = await getLocationBreakdown(startDate, endDate);
      let total = 0;
      for (const type of Object.values(result)) {
        for (const count of Object.values(type)) {
          total += count as number;
        }
      }
      queries.push({
        name: 'getLocationBreakdown',
        startDate,
        endDate,
        result,
        rowCount: total,
        errors: [],
        notes: [
          `Total locations: ${total}`,
          `Rent: ${Object.values(result.rent).reduce((a, b) => a + b, 0)}`,
          `Investor: ${Object.values(result.investor).reduce((a, b) => a + b, 0)}`,
          `Owner-Occupier: ${Object.values(result.owneroccupier).reduce((a, b) => a + b, 0)}`,
        ],
      });
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      errors.push(`getLocationBreakdown: ${error}`);
      overallStatus = 'partial';
      queries.push({
        name: 'getLocationBreakdown',
        startDate,
        endDate,
        result: null,
        rowCount: 0,
        errors: [error],
        notes: [],
      });
    }

    // 3. Test Satisfaction Score
    try {
      const result = await getSatisfactionScore(startDate, endDate);
      queries.push({
        name: 'getSatisfactionScore',
        startDate,
        endDate,
        result,
        rowCount: result.totalRatings,
        errors: [],
        notes: [
          `Average: ${result.average.toFixed(2)}/5`,
          `Total Ratings: ${result.totalRatings}`,
          `Distribution: ${result.distribution.map((d) => `${d.rating}⭐(${d.count})`).join(', ')}`,
          result.totalRatings === 0 ? '⚠️ No ratings found in database' : '✅ Ratings found',
        ],
      });
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      errors.push(`getSatisfactionScore: ${error}`);
      overallStatus = 'partial';
      queries.push({
        name: 'getSatisfactionScore',
        startDate,
        endDate,
        result: null,
        rowCount: 0,
        errors: [error],
        notes: [],
      });
    }

    // 4. Test Funnel Breakdown
    try {
      const result = await getFunnelBreakdown(startDate, endDate);
      queries.push({
        name: 'getFunnelBreakdown',
        startDate,
        endDate,
        result,
        rowCount: result.rent.clicks + result.ownerOccupier.clicks + result.investor.clicks,
        errors: [],
        notes: [
          `Rent: ${result.rent.clicks} clicks → ${result.rent.locationSelection} locations (${((result.rent.locationSelection / (result.rent.clicks || 1)) * 100).toFixed(0)}%)`,
          `Investor: ${result.investor.clicks} clicks → ${result.investor.locationSelection} locations (${((result.investor.locationSelection / (result.investor.clicks || 1)) * 100).toFixed(0)}%)`,
          `Owner-Occupier: ${result.ownerOccupier.clicks} clicks → ${result.ownerOccupier.locationSelection} locations (${((result.ownerOccupier.locationSelection / (result.ownerOccupier.clicks || 1)) * 100).toFixed(0)}%)`,
        ],
      });
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      errors.push(`getFunnelBreakdown: ${error}`);
      overallStatus = 'partial';
      queries.push({
        name: 'getFunnelBreakdown',
        startDate,
        endDate,
        result: null,
        rowCount: 0,
        errors: [error],
        notes: [],
      });
    }

    // 5. Test Conversation Stats
    try {
      const result = await getConversationStats(startDate, endDate);
      queries.push({
        name: 'getConversationStats',
        startDate,
        endDate,
        result,
        rowCount: result.totalConversations,
        errors: [],
        notes: [
          `Total Conversations: ${result.totalConversations}`,
          `Total Messages: ${result.totalMessages}`,
          `Total Users: ${result.totalUsers}`,
          `Avg Messages per Conversation: ${(result.totalMessages / (result.totalConversations || 1)).toFixed(2)}`,
        ],
      });
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      errors.push(`getConversationStats: ${error}`);
      overallStatus = 'partial';
      queries.push({
        name: 'getConversationStats',
        startDate,
        endDate,
        result: null,
        rowCount: 0,
        errors: [error],
        notes: [],
      });
    }

    // 6. Get raw debug info from database
    let dbSessionCount = 0;
    let sessionsWithRating = 0;
    let sessionsWithTypeuser = 0;
    let sessionsWithLocation = 0;

    try {
      const countResult = await query<{ count: string; with_rating: string; with_typeuser: string; with_location: string }>(
        `
        SELECT 
          COUNT(*) as count,
          COUNT(CASE WHEN rating IS NOT NULL THEN 1 END) as with_rating,
          COUNT(CASE WHEN typeuser IS NOT NULL THEN 1 END) as with_typeuser,
          COUNT(CASE WHEN location_type IS NOT NULL THEN 1 END) as with_location
        FROM public.vf_sessions
        WHERE (started_at AT TIME ZONE 'UTC' AT TIME ZONE 'Australia/Sydney')::date >= $1::date
          AND (started_at AT TIME ZONE 'UTC' AT TIME ZONE 'Australia/Sydney')::date <= $2::date
      `,
        [startDate, endDate]
      );

      if (countResult.rows.length > 0) {
        dbSessionCount = parseInt(countResult.rows[0].count, 10);
        sessionsWithRating = parseInt(countResult.rows[0].with_rating, 10);
        sessionsWithTypeuser = parseInt(countResult.rows[0].with_typeuser, 10);
        sessionsWithLocation = parseInt(countResult.rows[0].with_location, 10);
      }
    } catch (e) {
      // Silent fail for debug info
    }

    // Generate recommendations
    if (dbSessionCount === 0) {
      recommendations.push('ℹ️ No sessions found in database for the selected date range. Check date filtering.');
      overallStatus = 'failed';
    } else {
      const ratingPercentage = (sessionsWithRating / dbSessionCount) * 100;
      const typeuserPercentage = (sessionsWithTypeuser / dbSessionCount) * 100;
      const locationPercentage = (sessionsWithLocation / dbSessionCount) * 100;

      if (ratingPercentage < 30) {
        recommendations.push(
          `🔴 Only ${ratingPercentage.toFixed(0)}% of sessions have ratings. This is the likely cause of incorrect satisfaction scores.`
        );
      } else if (ratingPercentage < 70) {
        recommendations.push(
          `⚠️ ${ratingPercentage.toFixed(0)}% of sessions have ratings. Satisfaction score may not be fully representative.`
        );
      }

      if (typeuserPercentage < 70) {
        recommendations.push(
          `⚠️ Only ${typeuserPercentage.toFixed(0)}% of sessions have typeuser. Category breakdown may be incomplete.`
        );
      }

      if (locationPercentage < 50) {
        recommendations.push(
          `ℹ️ Only ${locationPercentage.toFixed(0)}% of sessions have location data (this may be expected for incomplete conversations).`
        );
      }

      if (ratingPercentage > 80 && typeuserPercentage > 80) {
        recommendations.push('✅ Data looks good! Most sessions have required fields.');
      }
    }

    const result: ValidationResult = {
      timestamp: new Date().toISOString(),
      dateRange: { start: startDate, end: endDate },
      queries,
      overallStatus,
      recommendations,
      rawDebugInfo: {
        dbSessionCount,
        sessionsWithRating,
        sessionsWithTypeuser,
        sessionsWithLocation,
      },
    };

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('[validate-queries] Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to validate queries',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}


