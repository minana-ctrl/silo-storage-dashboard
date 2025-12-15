import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

interface ValidationError {
  sessionId: string;
  error: string;
  data: {
    rating?: number | null;
    typeuser?: string | null;
    location_type?: string | null;
    location_value?: string | null;
    feedback?: string | null;
  };
}

interface AuditResult {
  timestamp: string;
  summary: {
    totalSessions: number;
    sessionsWithRating: number;
    sessionsWithTypeuser: number;
    sessionsWithLocation: number;
    sessionsWithFeedback: number;
    validationErrorCount: number;
    dataCompletenessScore: number;
  };
  ratingAnalysis: {
    distribution: Record<number, number>;
    average: number | null;
    nullCount: number;
    invalidCount: number;
    totalRatings: number;
  };
  typeuserAnalysis: {
    tenant: number;
    investor: number;
    owneroccupier: number;
    null: number;
  };
  locationAnalysis: {
    withLocation: number;
    byType: Record<string, number>;
    nullCount: number;
  };
  validationErrors: ValidationError[];
  businessLogicViolations: {
    feedbackWithoutRating: number;
    feedbackWithHighRating: number;
    missingRequiredFields: number;
    otherViolations: number;
  };
  recommendations: string[];
  rawData: {
    sessionsByDate: Array<{ date: string; count: number; sessionsWithRating: number }>;
    sessionsByTypeuser: Array<{ typeuser: string | null; count: number; avgRating: number | null }>;
  };
}

export async function GET() {
  try {
    // 1. Basic counts
    const totalSessionsResult = await query<{ count: string }>(`
      SELECT COUNT(*) as count FROM public.vf_sessions
    `);
    const totalSessions = parseInt(totalSessionsResult.rows[0]?.count || '0', 10);

    const sessionsWithRatingResult = await query<{ count: string }>(`
      SELECT COUNT(*) as count FROM public.vf_sessions WHERE rating IS NOT NULL
    `);
    const sessionsWithRating = parseInt(sessionsWithRatingResult.rows[0]?.count || '0', 10);

    const sessionsWithTypeuserResult = await query<{ count: string }>(`
      SELECT COUNT(*) as count FROM public.vf_sessions WHERE typeuser IS NOT NULL
    `);
    const sessionsWithTypeuser = parseInt(sessionsWithTypeuserResult.rows[0]?.count || '0', 10);

    const sessionsWithLocationResult = await query<{ count: string }>(`
      SELECT COUNT(*) as count FROM public.vf_sessions 
      WHERE location_type IS NOT NULL AND location_value IS NOT NULL
    `);
    const sessionsWithLocation = parseInt(sessionsWithLocationResult.rows[0]?.count || '0', 10);

    const sessionsWithFeedbackResult = await query<{ count: string }>(`
      SELECT COUNT(*) as count FROM public.vf_sessions WHERE feedback IS NOT NULL
    `);
    const sessionsWithFeedback = parseInt(sessionsWithFeedbackResult.rows[0]?.count || '0', 10);

    // 2. Rating analysis
    const ratingDistributionResult = await query<{ rating: number | null; count: string }>(`
      SELECT rating, COUNT(*) as count FROM public.vf_sessions 
      GROUP BY rating ORDER BY rating
    `);

    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let totalRatings = 0;
    let sumRatings = 0;
    let invalidRatingCount = 0;

    for (const row of ratingDistributionResult.rows) {
      const count = parseInt(row.count, 10);
      if (row.rating === null) {
        // Null ratings counted separately
        continue;
      }
      if (row.rating >= 1 && row.rating <= 5) {
        distribution[row.rating as keyof typeof distribution] = count;
        totalRatings += count;
        sumRatings += row.rating * count;
      } else {
        invalidRatingCount += count;
      }
    }

    const ratingAverage = totalRatings > 0 ? sumRatings / totalRatings : null;
    const nullRatingCount = totalSessions - totalRatings - invalidRatingCount;

    // 3. Typeuser analysis
    const typeuserResult = await query<{ typeuser: string | null; count: string }>(`
      SELECT typeuser, COUNT(*) as count FROM public.vf_sessions 
      GROUP BY typeuser
    `);

    const typeuserAnalysis = {
      tenant: 0,
      investor: 0,
      owneroccupier: 0,
      null: 0,
    };

    for (const row of typeuserResult.rows) {
      const count = parseInt(row.count, 10);
      if (row.typeuser === 'tenant') typeuserAnalysis.tenant = count;
      else if (row.typeuser === 'investor') typeuserAnalysis.investor = count;
      else if (row.typeuser === 'owneroccupier') typeuserAnalysis.owneroccupier = count;
      else typeuserAnalysis.null = count;
    }

    // 4. Location analysis
    const locationResult = await query<{ location_type: string | null; count: string }>(`
      SELECT location_type, COUNT(*) as count FROM public.vf_sessions 
      WHERE location_type IS NOT NULL
      GROUP BY location_type
    `);

    const locationAnalysis = {
      withLocation: sessionsWithLocation,
      byType: {} as Record<string, number>,
      nullCount: totalSessions - sessionsWithLocation,
    };

    for (const row of locationResult.rows) {
      const count = parseInt(row.count, 10);
      locationAnalysis.byType[row.location_type || 'null'] = count;
    }

    // 5. Validation errors - check business logic violations
    const validationErrors: ValidationError[] = [];
    const businessLogicViolations = {
      feedbackWithoutRating: 0,
      feedbackWithHighRating: 0,
      missingRequiredFields: 0,
      otherViolations: 0,
    };

    // Get all sessions with potential issues
    const problematicResult = await query<{
      session_id: string;
      rating: number | null;
      typeuser: string | null;
      location_type: string | null;
      location_value: string | null;
      feedback: string | null;
    }>(`
      SELECT 
        session_id, rating, typeuser, location_type, location_value, feedback
      FROM public.vf_sessions
      WHERE 
        feedback IS NOT NULL OR
        rating IS NULL OR
        (location_type IS NOT NULL AND location_value IS NULL) OR
        (rating > 5 OR rating < 1)
      LIMIT 100
    `);

    for (const session of problematicResult.rows) {
      // Check: Feedback without rating
      if (session.feedback && !session.rating) {
        validationErrors.push({
          sessionId: session.session_id,
          error: 'Feedback provided without rating',
          data: {
            rating: session.rating,
            feedback: session.feedback,
            typeuser: session.typeuser,
          },
        });
        businessLogicViolations.feedbackWithoutRating++;
      }

      // Check: Feedback with high rating
      if (session.feedback && session.rating && session.rating > 3) {
        validationErrors.push({
          sessionId: session.session_id,
          error: `Feedback provided with rating ${session.rating} (should only be 1-3)`,
          data: {
            rating: session.rating,
            feedback: session.feedback,
          },
        });
        businessLogicViolations.feedbackWithHighRating++;
      }

      // Check: Invalid rating
      if (session.rating && (session.rating < 1 || session.rating > 5)) {
        validationErrors.push({
          sessionId: session.session_id,
          error: `Invalid rating value: ${session.rating}`,
          data: { rating: session.rating },
        });
      }

      // Check: Location type without value
      if (session.location_type && !session.location_value) {
        validationErrors.push({
          sessionId: session.session_id,
          error: 'Location type set but no location value',
          data: { location_type: session.location_type },
        });
      }

      // Check: Location mismatch with typeuser
      if (session.typeuser && session.location_type) {
        const isValid =
          (session.typeuser === 'tenant' && session.location_type === 'rental') ||
          (session.typeuser === 'investor' && session.location_type === 'investor') ||
          (session.typeuser === 'owneroccupier' && session.location_type === 'owneroccupier');
        if (!isValid) {
          validationErrors.push({
            sessionId: session.session_id,
            error: `Location type '${session.location_type}' doesn't match typeuser '${session.typeuser}'`,
            data: {
              typeuser: session.typeuser,
              location_type: session.location_type,
            },
          });
          businessLogicViolations.otherViolations++;
        }
      }
    }

    // 6. Sessions by date
    const sessionsByDateResult = await query<{
      date: string;
      total_sessions: string;
      sessions_with_rating: string;
    }>(`
      SELECT 
        (started_at AT TIME ZONE 'UTC' AT TIME ZONE '+11:00')::date as date,
        COUNT(DISTINCT session_id) as total_sessions,
        COUNT(CASE WHEN rating IS NOT NULL THEN 1 END) as sessions_with_rating
      FROM public.vf_sessions
      WHERE started_at IS NOT NULL
      GROUP BY date
      ORDER BY date DESC
      LIMIT 30
    `);

    const sessionsByDate = sessionsByDateResult.rows.map((row) => ({
      date: row.date,
      count: parseInt(row.total_sessions, 10),
      sessionsWithRating: parseInt(row.sessions_with_rating, 10),
    }));

    // 7. Sessions by typeuser with avg rating
    const sessionsByTypeuserResult = await query<{
      typeuser: string | null;
      count: string;
      avg_rating: string | null;
    }>(`
      SELECT 
        typeuser,
        COUNT(*) as count,
        AVG(CASE WHEN rating IS NOT NULL THEN rating END)::numeric(10,2) as avg_rating
      FROM public.vf_sessions
      GROUP BY typeuser
      ORDER BY count DESC
    `);

    const sessionsByTypeuser = sessionsByTypeuserResult.rows.map((row) => ({
      typeuser: row.typeuser,
      count: parseInt(row.count, 10),
      avgRating: row.avg_rating ? parseFloat(row.avg_rating) : null,
    }));

    // 8. Calculate completeness score
    const dataCompletenessScore =
      totalSessions > 0
        ? Math.round(
            ((sessionsWithRating +
              sessionsWithTypeuser +
              sessionsWithLocation +
              sessionsWithFeedback) /
              (totalSessions * 4)) *
              100
          )
        : 0;

    // 9. Generate recommendations
    const recommendations: string[] = [];

    if (sessionsWithRating < totalSessions * 0.5) {
      recommendations.push(
        `⚠️ Only ${Math.round((sessionsWithRating / totalSessions) * 100)}% of sessions have ratings. Check rating extraction in state reconstruction.`
      );
    }

    if (sessionsWithTypeuser < totalSessions * 0.8) {
      recommendations.push(
        `⚠️ Only ${Math.round((sessionsWithTypeuser / totalSessions) * 100)}% of sessions have typeuser. Verify typeuser parsing from transcripts.`
      );
    }

    if (sessionsWithLocation < totalSessions * 0.3) {
      recommendations.push(
        `ℹ️ Only ${Math.round((sessionsWithLocation / totalSessions) * 100)}% of sessions have location data (this may be expected).`
      );
    }

    if (validationErrors.length > 0) {
      recommendations.push(
        `🔴 ${validationErrors.length} validation errors found. Review business logic violations above.`
      );
    }

    if (ratingAverage && ratingAverage < 2.5) {
      recommendations.push(
        `⚠️ Average rating is ${ratingAverage.toFixed(2)}/5 - consider reviewing what causes low satisfaction.`
      );
    }

    if (invalidRatingCount > 0) {
      recommendations.push(
        `🔴 ${invalidRatingCount} sessions have invalid rating values (outside 1-5 range).`
      );
    }

    if (sessionsWithRating > 10 && dataCompletenessScore > 80) {
      recommendations.push(`✅ Data quality is good! ${dataCompletenessScore}% complete with ${sessionsWithRating} ratings.`);
    }

    const result: AuditResult = {
      timestamp: new Date().toISOString(),
      summary: {
        totalSessions,
        sessionsWithRating,
        sessionsWithTypeuser,
        sessionsWithLocation,
        sessionsWithFeedback,
        validationErrorCount: validationErrors.length,
        dataCompletenessScore,
      },
      ratingAnalysis: {
        distribution,
        average: ratingAverage,
        nullCount: nullRatingCount,
        invalidCount: invalidRatingCount,
        totalRatings,
      },
      typeuserAnalysis,
      locationAnalysis,
      validationErrors: validationErrors.slice(0, 20), // Limit to first 20
      businessLogicViolations,
      recommendations,
      rawData: {
        sessionsByDate,
        sessionsByTypeuser,
      },
    };

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('[audit-analytics] Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to audit analytics',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

