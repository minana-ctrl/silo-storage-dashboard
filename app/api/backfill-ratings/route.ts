import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { extractRatingScore } from '@/lib/propertyParser';
import { reconstructState } from '@/lib/stateReconstructor';

interface BackfillSession {
  sessionId: string;
  oldRating: number | null;
  newRating: number | null;
  changed: boolean;
  source: string;
  notes: string[];
}

interface BackfillResult {
  timestamp: string;
  sessionsBefore: {
    total: number;
    withRating: number;
    withoutRating: number;
  };
  backfillAttempts: number;
  successCount: number;
  failureCount: number;
  sessionsChanged: number;
  averageRatingBefore: number | null;
  averageRatingAfter: number | null;
  changes: BackfillSession[];
  notes: string[];
  recommendations: string[];
}

export async function POST() {
  try {
    // 1. Get before stats
    const beforeStatsResult = await query<{ count: string; with_rating: string; without_rating: string }>(
      `
      SELECT 
        COUNT(*) as count,
        COUNT(CASE WHEN rating IS NOT NULL THEN 1 END) as with_rating,
        COUNT(CASE WHEN rating IS NULL THEN 1 END) as without_rating
      FROM public.vf_sessions
    `
    );

    const sessionsBefore = {
      total: parseInt(beforeStatsResult.rows[0]?.count || '0', 10),
      withRating: parseInt(beforeStatsResult.rows[0]?.with_rating || '0', 10),
      withoutRating: parseInt(beforeStatsResult.rows[0]?.without_rating || '0', 10),
    };

    // 2. Get sessions with missing ratings
    const sessionsToUpdate = await query<{ session_id: string; raw: string; rating: number | null }>(
      `
      SELECT 
        s.session_id,
        t.raw,
        s.rating
      FROM public.vf_sessions s
      LEFT JOIN public.vf_transcripts t ON s.transcript_row_id = t.id
      WHERE s.rating IS NULL AND t.raw IS NOT NULL
      LIMIT 500
    `
    );

    const changes: BackfillSession[] = [];
    let successCount = 0;
    let failureCount = 0;

    // 3. Try to extract ratings from transcripts
    for (const row of sessionsToUpdate.rows) {
      try {
        const rawTranscript = JSON.parse(row.raw);
        const logs = rawTranscript.logs || [];

        // Reconstruct state to try to get rating
        const state = reconstructState(rawTranscript, logs);

        if (state.rating && state.rating !== row.rating) {
          changes.push({
            sessionId: row.session_id,
            oldRating: row.rating,
            newRating: state.rating,
            changed: true,
            source: 'state_reconstruction',
            notes: [`Extracted rating ${state.rating}/5 from transcript state`],
          });

          // Update the session
          await query(
            `
            UPDATE public.vf_sessions
            SET rating = $1, updated_at = NOW()
            WHERE session_id = $2
          `,
            [state.rating, row.session_id]
          );

          successCount++;
        } else if (!state.rating) {
          failureCount++;
          changes.push({
            sessionId: row.session_id,
            oldRating: row.rating,
            newRating: null,
            changed: false,
            source: 'none',
            notes: ['No rating could be extracted from transcript'],
          });
        } else {
          // Rating was already present
          changes.push({
            sessionId: row.session_id,
            oldRating: row.rating,
            newRating: row.rating,
            changed: false,
            source: 'existing',
            notes: ['Rating already present'],
          });
        }
      } catch (e) {
        failureCount++;
        changes.push({
          sessionId: row.session_id,
          oldRating: row.rating,
          newRating: null,
          changed: false,
          source: 'error',
          notes: [(e instanceof Error ? e.message : String(e)).substring(0, 100)],
        });
      }
    }

    // 4. Get after stats
    const afterStatsResult = await query<{ count: string; with_rating: string; avg_rating: string }>(
      `
      SELECT 
        COUNT(*) as count,
        COUNT(CASE WHEN rating IS NOT NULL THEN 1 END) as with_rating,
        AVG(CASE WHEN rating IS NOT NULL THEN rating END) as avg_rating
      FROM public.vf_sessions
    `
    );

    const sessionCountAfter = parseInt(afterStatsResult.rows[0]?.count || '0', 10);
    const withRatingAfter = parseInt(afterStatsResult.rows[0]?.with_rating || '0', 10);
    const averageRatingAfter = afterStatsResult.rows[0]?.avg_rating
      ? parseFloat(afterStatsResult.rows[0].avg_rating)
      : null;

    // Get average rating before
    const beforeRatingResult = await query<{ avg_rating: string }>(
      `
      SELECT 
        AVG(rating)::numeric(10,2) as avg_rating
      FROM (
        SELECT rating FROM public.vf_sessions
        WHERE rating IS NOT NULL
        LIMIT ${sessionsBefore.withRating}
      ) AS before_ratings
    `
    );

    const averageRatingBefore = beforeRatingResult.rows[0]?.avg_rating
      ? parseFloat(beforeRatingResult.rows[0].avg_rating)
      : null;

    // 5. Generate notes and recommendations
    const notes: string[] = [];
    const recommendations: string[] = [];

    const sessionsChanged = changes.filter((c) => c.changed).length;

    notes.push(`Attempted backfill: ${sessionsToUpdate.rows.length} sessions without ratings`);
    notes.push(`Successfully extracted: ${successCount} ratings`);
    notes.push(`Failed to extract: ${failureCount} ratings`);
    notes.push(
      `Sessions with ratings improved: ${sessionsBefore.withRating} → ${withRatingAfter} (+${withRatingAfter - sessionsBefore.withRating})`
    );

    if (sessionsChanged > 0) {
      recommendations.push(`✅ Successfully backfilled ${sessionsChanged} sessions with ratings`);
    } else {
      recommendations.push(`ℹ️ No new ratings could be extracted from transcripts`);
    }

    if (sessionsBefore.withoutRating > successCount) {
      const stillMissing = sessionsBefore.withoutRating - successCount;
      recommendations.push(
        `⚠️ ${stillMissing} sessions still have no rating (may be incomplete conversations)`
      );
    }

    if (averageRatingBefore && averageRatingAfter) {
      const change = averageRatingAfter - averageRatingBefore;
      if (Math.abs(change) < 0.1) {
        recommendations.push(`ℹ️ Average rating changed slightly: ${averageRatingBefore.toFixed(2)} → ${averageRatingAfter.toFixed(2)}`);
      } else if (change > 0) {
        recommendations.push(`ℹ️ Average rating increased: ${averageRatingBefore.toFixed(2)} → ${averageRatingAfter.toFixed(2)}`);
      }
    }

    const result: BackfillResult = {
      timestamp: new Date().toISOString(),
      sessionsBefore,
      backfillAttempts: sessionsToUpdate.rows.length,
      successCount,
      failureCount,
      sessionsChanged,
      averageRatingBefore,
      averageRatingAfter,
      changes: changes.slice(0, 50),
      notes,
      recommendations,
    };

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('[backfill-ratings] Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to backfill ratings',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}


