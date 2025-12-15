import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { parseVoiceflowVariables, extractRatingScore } from '@/lib/propertyParser';
import { reconstructState } from '@/lib/stateReconstructor';

interface ExtractionTest {
  transcriptId: string;
  sessionId: string;
  properties: Record<string, unknown> | null;
  parsedVariables: {
    rating?: string;
    typeuser?: string;
    feedback?: string;
  };
  extractedRating: number | null;
  reconstructedState: {
    rating: number | null;
    typeuser: string | null;
    feedback: string | null;
  };
  rawRating: string | undefined;
  notes: string[];
}

interface ExtractionResult {
  timestamp: string;
  transcriptsAnalyzed: number;
  ratingsFound: number;
  ratingsExtracted: number;
  extractionSuccessRate: number;
  issues: {
    noRatingInProperties: number;
    invalidRatingFormat: number;
    extractionFailed: number;
  };
  tests: ExtractionTest[];
  recommendations: string[];
}

export async function GET() {
  try {
    // Get recent transcripts from database
    const result = await query<{
      transcript_id: string;
      session_id: string;
      raw: string;
    }>(
      `
      SELECT transcript_id, session_id, raw
      FROM public.vf_transcripts
      ORDER BY created_at DESC
      LIMIT 30
    `
    );

    const tests: ExtractionTest[] = [];
    let ratingsFound = 0;
    let ratingsExtracted = 0;
    let noRatingInProperties = 0;
    let invalidRatingFormat = 0;
    let extractionFailed = 0;

    for (const row of result.rows) {
      // Handle case where row.raw might already be an object or a JSON string
      const rawTranscript = typeof row.raw === 'string' ? JSON.parse(row.raw) : row.raw;
      const properties = rawTranscript.properties || {};

      // Parse variables
      const parsedVars = parseVoiceflowVariables(properties);

      // Extract rating from properties
      const ratingStr = parsedVars.rating;
      const extractedRating = ratingStr ? extractRatingScore(ratingStr) : null;

      // Try state reconstruction on full transcript
      const logs = rawTranscript.logs || [];
      const reconstructed = reconstructState(rawTranscript, logs);

      const notes: string[] = [];

      // Analyze
      if (ratingStr) {
        ratingsFound++;
        notes.push(`Rating in properties: "${ratingStr}"`);

        if (extractedRating) {
          ratingsExtracted++;
          notes.push(`✓ Successfully extracted: ${extractedRating}/5`);
        } else {
          invalidRatingFormat++;
          notes.push(`✗ Invalid format, could not extract`);
        }
      } else {
        noRatingInProperties++;
        notes.push(`No rating in properties`);

        // Check if we got it from reconstruction
        if (reconstructed.rating) {
          ratingsExtracted++;
          notes.push(`✓ Got from state reconstruction: ${reconstructed.rating}/5`);
        }
      }

      // Check for mismatch
      if (ratingStr && extractedRating && reconstructed.rating && extractedRating !== reconstructed.rating) {
        notes.push(`⚠️ Mismatch: extracted ${extractedRating} vs reconstructed ${reconstructed.rating}`);
      }

      tests.push({
        transcriptId: row.transcript_id || 'unknown',
        sessionId: row.session_id,
        properties: properties,
        parsedVariables: {
          rating: parsedVars.rating,
          typeuser: parsedVars.typeuser,
          feedback: parsedVars.feedback,
        },
        extractedRating,
        reconstructedState: {
          rating: reconstructed.rating,
          typeuser: reconstructed.typeuser,
          feedback: reconstructed.feedback,
        },
        rawRating: ratingStr,
        notes,
      });
    }

    // Calculate metrics
    const transcriptsAnalyzed = result.rows.length;
    const extractionSuccessRate =
      transcriptsAnalyzed > 0 ? Math.round((ratingsExtracted / transcriptsAnalyzed) * 100) : 0;

    // Generate recommendations
    const recommendations: string[] = [];

    if (extractionSuccessRate < 50) {
      recommendations.push(
        `🔴 Low extraction rate (${extractionSuccessRate}%). Rating format may have changed in Voiceflow transcripts.`
      );
    } else if (extractionSuccessRate < 80) {
      recommendations.push(
        `⚠️ Moderate extraction rate (${extractionSuccessRate}%). Some transcripts have non-standard rating formats.`
      );
    } else {
      recommendations.push(`✅ Good extraction rate (${extractionSuccessRate}%). Rating extraction is working well.`);
    }

    if (noRatingInProperties > 0) {
      recommendations.push(
        `ℹ️ ${noRatingInProperties} transcripts have no rating in properties. Check if this is expected (incomplete conversations).`
      );
    }

    if (invalidRatingFormat > 0) {
      recommendations.push(
        `⚠️ ${invalidRatingFormat} transcripts have invalid rating formats. Review and fix rating format parsing.`
      );
    }

    const auditResult: ExtractionResult = {
      timestamp: new Date().toISOString(),
      transcriptsAnalyzed,
      ratingsFound,
      ratingsExtracted,
      extractionSuccessRate,
      issues: {
        noRatingInProperties,
        invalidRatingFormat,
        extractionFailed,
      },
      tests: tests.slice(0, 20), // Limit to first 20
      recommendations,
    };

    return NextResponse.json(auditResult, { status: 200 });
  } catch (error) {
    console.error('[test-rating-extraction] Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to test rating extraction',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

