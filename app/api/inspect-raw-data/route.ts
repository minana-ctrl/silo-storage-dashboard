import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

interface PropertyAnalysis {
  transcriptId: string;
  sessionId: string;
  properties: Record<string, unknown>;
  propertyKeys: string[];
  hasRating: boolean;
  hasTypeuser: boolean;
  hasFeedback: boolean;
  hasLocation: boolean;
  ratingValue: unknown;
  typeuserValue: unknown;
  notes: string[];
}

interface InspectionResult {
  timestamp: string;
  transcriptsInspected: number;
  propertyStats: {
    propertiesPresent: number;
    propertiesEmpty: number;
    avgKeysPerTranscript: number;
    commonKeys: Record<string, number>;
  };
  analyses: PropertyAnalysis[];
  ratingFormats: Record<string, number>;
  recommendations: string[];
}

export async function GET() {
  try {
    // Get recent transcripts
    const result = await query<{
      transcript_id: string;
      session_id: string;
      raw: string;
    }>(
      `
      SELECT transcript_id, session_id, raw
      FROM public.vf_transcripts
      ORDER BY created_at DESC
      LIMIT 50
    `
    );

    const analyses: PropertyAnalysis[] = [];
    const keyFrequency: Record<string, number> = {};
    const ratingFormats: Record<string, number> = {};
    let propertiesPresent = 0;
    let propertiesEmpty = 0;

    for (const row of result.rows) {
      try {
        const rawTranscript = JSON.parse(row.raw);
        const properties = rawTranscript.properties || {};

        const propertyKeys = Object.keys(properties);
        const hasRating = 'rating' in properties;
        const hasTypeuser = 'typeuser' in properties;
        const hasFeedback = 'feedback' in properties;
        const hasLocation = propertyKeys.some((k) => k.toLowerCase().includes('location'));

        if (propertyKeys.length > 0) {
          propertiesPresent++;
        } else {
          propertiesEmpty++;
        }

        // Track key frequency
        for (const key of propertyKeys) {
          const normalizedKey = key.toLowerCase();
          keyFrequency[normalizedKey] = (keyFrequency[normalizedKey] || 0) + 1;
        }

        // Analyze rating format
        if (hasRating) {
          const ratingValue = properties.rating;
          const ratingStr = String(ratingValue);
          ratingFormats[ratingStr] = (ratingFormats[ratingStr] || 0) + 1;
        }

        const notes: string[] = [];

        if (!hasRating && !hasTypeuser && !hasFeedback && !hasLocation) {
          notes.push('⚠️ No analytics properties found');
        }

        if (hasRating) {
          const ratingValue = properties.rating;
          if (typeof ratingValue === 'string' && !ratingValue.match(/^\d+\/5$/) && !ratingValue.match(/^\d+$/)) {
            notes.push(`⚠️ Non-standard rating format: "${ratingValue}"`);
          }
        }

        analyses.push({
          transcriptId: row.transcript_id || 'unknown',
          sessionId: row.session_id,
          properties,
          propertyKeys,
          hasRating,
          hasTypeuser,
          hasFeedback,
          hasLocation,
          ratingValue: properties.rating,
          typeuserValue: properties.typeuser,
          notes,
        });
      } catch (e) {
        // Skip transcripts that can't be parsed
      }
    }

    // Sort key frequency
    const sortedKeys = Object.entries(keyFrequency)
      .sort((a, b) => b[1] - a[1])
      .reduce((acc, [key, count]) => {
        acc[key] = count;
        return acc;
      }, {} as Record<string, number>);

    // Sort rating formats
    const sortedFormats = Object.entries(ratingFormats)
      .sort((a, b) => b[1] - a[1])
      .reduce((acc, [format, count]) => {
        acc[format] = count;
        return acc;
      }, {} as Record<string, number>);

    const avgKeysPerTranscript =
      analyses.length > 0 ? analyses.reduce((sum, a) => sum + a.propertyKeys.length, 0) / analyses.length : 0;

    // Generate recommendations
    const recommendations: string[] = [];

    if (propertiesEmpty > 0) {
      recommendations.push(`⚠️ ${propertiesEmpty} transcripts have no properties. Check Voiceflow export format.`);
    }

    if (!Object.keys(sortedFormats).some((fmt) => fmt.match(/^\d+\/5$/))) {
      if (Object.keys(sortedFormats).length > 0) {
        recommendations.push(
          `🔴 No ratings in standard "X/5" format found. Current formats: ${Object.keys(sortedFormats).join(', ')}`
        );
      }
    }

    if (Object.keys(sortedKeys).includes('rating')) {
      recommendations.push(`✅ Rating property found in ${keyFrequency['rating']} transcripts`);
    } else {
      recommendations.push(`⚠️ No "rating" property found in any transcript`);
    }

    if (Object.keys(sortedKeys).includes('typeuser')) {
      recommendations.push(`✅ Typeuser property found in ${keyFrequency['typeuser']} transcripts`);
    } else {
      recommendations.push(`⚠️ No "typeuser" property found`);
    }

    // Check for alternative property names
    const allKeys = Object.keys(sortedKeys);
    if (allKeys.some((k) => k.includes('rate') || k.includes('score'))) {
      recommendations.push(
        `💡 Found alternative rating-like properties: ${allKeys.filter((k) => k.includes('rate') || k.includes('score')).join(', ')}`
      );
    }

    if (allKeys.some((k) => k.includes('user') && k.includes('type'))) {
      recommendations.push(
        `💡 Found alternative typeuser-like properties: ${allKeys.filter((k) => k.includes('user') && k.includes('type')).join(', ')}`
      );
    }

    const inspectionResult: InspectionResult = {
      timestamp: new Date().toISOString(),
      transcriptsInspected: analyses.length,
      propertyStats: {
        propertiesPresent,
        propertiesEmpty,
        avgKeysPerTranscript: Math.round(avgKeysPerTranscript * 100) / 100,
        commonKeys: Object.fromEntries(
          Object.entries(sortedKeys)
            .slice(0, 15)
            .map(([k, v]) => [k, v])
        ),
      },
      analyses: analyses.slice(0, 20),
      ratingFormats: sortedFormats,
      recommendations,
    };

    return NextResponse.json(inspectionResult, { status: 200 });
  } catch (error) {
    console.error('[inspect-raw-data] Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to inspect raw data',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

