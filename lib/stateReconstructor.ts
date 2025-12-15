import { parseVoiceflowVariables, extractRatingScore, categorizeSales } from '@/lib/propertyParser';
import type { TranscriptTurn } from '@/types/conversations';

/**
 * Derive location type based on typeuser
 * Looks for type-specific location variables AND generic "location" variable
 */
function deriveLocationType(vars: any): 'rental' | 'investor' | 'owneroccupier' | null {
  if (vars.typeuser === 'tenant') {
    return vars.rentallocation || vars.location ? 'rental' : null;
  }
  if (vars.typeuser === 'investor') {
    return vars.investorlocation || vars.location ? 'investor' : null;
  }
  if (vars.typeuser === 'owneroccupier') {
    return vars.owneroccupierlocation || vars.location ? 'owneroccupier' : null;
  }
  return null;
}

/**
 * Derive location value based on typeuser
 * Checks type-specific location variables first, then falls back to generic "location"
 */
function deriveLocationValue(vars: any): string | null {
  if (vars.typeuser === 'tenant' && (vars.rentallocation || vars.location)) {
    return vars.rentallocation || vars.location;
  }
  if (vars.typeuser === 'investor' && (vars.investorlocation || vars.location)) {
    return vars.investorlocation || vars.location;
  }
  if (vars.typeuser === 'owneroccupier' && (vars.owneroccupierlocation || vars.location)) {
    return vars.owneroccupierlocation || vars.location;
  }
  return null;
}

/**
 * Find a variable in transcript traces
 * Searches through logs for "set" traces or debug traces with variable changes
 * Handles multiple variable name variations (e.g., "rating" vs "satisfaction_score")
 */
function findVariableInTraces(logs: any[], variableName: string, alternateNames: string[] = []): string | null {
  if (!logs || logs.length === 0) return null;

  const varNames = [variableName, ...alternateNames];

  for (const log of logs) {
    // Look for set traces (old format)
    if (log.type === 'trace' && log.data?.type === 'set') {
      const payload = log.data.payload;
      if (payload && varNames.includes(payload.key) && payload.value) {
        return String(payload.value);
      }
    }

    // Look for debug traces with set-v3 nodes and variable diffs (Voiceflow SDK format)
    if (log.type === 'trace' && log.data?.type === 'debug') {
      const payload = log.data.payload;
      if (payload?.ref?.nodeType === 'set-v3' && payload?.metadata?.diff) {
        for (const varName of varNames) {
          if (payload.metadata.diff[varName]) {
            const varChange = payload.metadata.diff[varName];
            if (varChange.after !== undefined) {
              return String(varChange.after);
            }
          }
        }
      }
    }

    // Look for user/assistant messages that might contain rating info
    if (variableName === 'rating' && (log.type === 'user' || log.type === 'assistant')) {
      const message = log.data?.message || log.message || '';
      // Look for patterns like "5/5", "5 stars", "rating: 5"
      const ratingMatch = String(message).match(/(\d)\s*(?:\/5|stars?|out of 5)?/i);
      if (ratingMatch) {
        const score = parseInt(ratingMatch[1], 10);
        if (score >= 1 && score <= 5) {
          return String(score);
        }
      }
    }
  }

  return null;
}

/**
 * Find location-related variable in traces
 * Looks for both specific names (rentallocation, investorlocation, owneroccupierlocation)
 * AND generic "location" variable used by Voiceflow
 */
function findLocationInTraces(logs: any[], typeuser: string | undefined): { type: string; value: string } | null {
  if (!logs || logs.length === 0) return null;

  const locationVarNames =
    typeuser === 'tenant'
      ? ['rentallocation', 'location']
      : typeuser === 'investor'
        ? ['investorlocation', 'location']
        : typeuser === 'owneroccupier'
          ? ['owneroccupierlocation', 'location']
          : [];

  if (locationVarNames.length === 0) return null;

  // Try each possible variable name
  for (const varName of locationVarNames) {
    const location = findVariableInTraces(logs, varName);
    if (location) {
      // Map generic "location" to the appropriate type-specific name
      const mappedType =
        typeuser === 'tenant'
          ? 'rental'
          : typeuser === 'investor'
            ? 'investor'
            : 'owneroccupier';

      return {
        type: mappedType,
        value: location,
      };
    }
  }

  return null;
}

/**
 * Find timestamp for when a variable was set
 */
function findTimestampForVariable(logs: any[], variableName: string): string {
  if (!logs || logs.length === 0) return new Date().toISOString();

  for (const log of logs) {
    // Old format: set traces
    if (log.type === 'trace' && log.data?.type === 'set') {
      const payload = log.data.payload;
      if (payload && payload.key === variableName) {
        return log.data?.time ? new Date(log.data.time).toISOString() : log.createdAt || new Date().toISOString();
      }
    }

    // New format: debug traces with set-v3 nodes
    if (log.type === 'trace' && log.data?.type === 'debug') {
      const payload = log.data.payload;
      if (payload?.ref?.nodeType === 'set-v3' && payload?.metadata?.diff?.[variableName]) {
        return log.data?.time ? new Date(log.data.time).toISOString() : log.createdAt || new Date().toISOString();
      }
    }
  }

  return new Date().toISOString();
}

export interface ReconstructedState {
  typeuser: 'tenant' | 'investor' | 'owneroccupier' | null;
  location_type: 'rental' | 'investor' | 'owneroccupier' | null;
  location_value: string | null;
  rating: number | null;
  feedback: string | null;
  started_at: string | null;
  ended_at: string | null;
}

/**
 * Reconstruct session state from transcript
 * Uses hybrid approach: Voiceflow properties first, fallback to trace parsing
 */
export function reconstructState(
  transcript: any,
  logs: any[] = []
): ReconstructedState {
  // 1. Try Voiceflow properties first
  const vars = parseVoiceflowVariables(transcript.properties);

  // 2. Fallback: scan traces if properties don't have the values
  let typeuser = vars.typeuser as 'tenant' | 'investor' | 'owneroccupier' | null;
  if (!typeuser) {
    const tracedTypeuser = findVariableInTraces(logs, 'typeuser');
    if (tracedTypeuser === 'tenant' || tracedTypeuser === 'investor' || tracedTypeuser === 'owneroccupier') {
      typeuser = tracedTypeuser as 'tenant' | 'investor' | 'owneroccupier';
    }
  }

  // 3. Get location from properties or traces
  let locationValue = deriveLocationValue(vars);
  let locationType = deriveLocationType({ ...vars, typeuser });
  
  if (!locationValue && typeuser) {
    const tracedLocation = findLocationInTraces(logs, typeuser);
    if (tracedLocation) {
      locationValue = tracedLocation.value;
      locationType = tracedLocation.type as 'rental' | 'investor' | 'owneroccupier';
    }
  }

  // 4. Extract rating from properties or traces
  let rating = vars.rating ? extractRatingScore(vars.rating) : null;
  if (!rating) {
    // Try alternate names: satisfaction, score, etc.
    const tracedRating = findVariableInTraces(logs, 'rating', ['satisfaction', 'score', 'satisfaction_score']);
    if (tracedRating) {
      rating = extractRatingScore(tracedRating);
    }
  }

  // 5. Extract feedback (only for ratings 1-3)
  const feedback = rating && rating <= 3 ? (vars.feedback || null) : null;

  // 6. Get timestamps
  const started_at = transcript.createdAt || transcript.started_at || new Date().toISOString();
  const ended_at = transcript.endedAt || transcript.ended_at || transcript.updatedAt || null;

  return {
    typeuser,
    location_type: locationType,
    location_value: locationValue,
    rating,
    feedback,
    started_at,
    ended_at,
  };
}

/**
 * Validate reconstructed state against business rules
 */
export function validateState(state: ReconstructedState): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Feedback should only exist for low ratings
  if (state.feedback && (!state.rating || state.rating > 3)) {
    errors.push('Feedback should only be provided for ratings 1-3');
  }

  // Location type should match typeuser
  if (state.location_type && state.typeuser) {
    if (state.location_type === 'rental' && state.typeuser !== 'tenant') {
      errors.push('Rental location can only be set for tenants');
    }
    if (state.location_type === 'investor' && state.typeuser !== 'investor') {
      errors.push('Investor location can only be set for investors');
    }
    if (state.location_type === 'owneroccupier' && state.typeuser !== 'owneroccupier') {
      errors.push('Owner occupier location can only be set for owner occupiers');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
