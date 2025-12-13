import { parseVoiceflowVariables, extractRatingScore, categorizeSales } from '@/lib/propertyParser';
import type { TranscriptTurn } from '@/types/conversations';

/**
 * Derive location type based on typeuser
 */
function deriveLocationType(vars: any): 'rental' | 'investor' | 'owneroccupier' | null {
  if (vars.typeuser === 'tenant') {
    return vars.rentallocation ? 'rental' : null;
  }
  if (vars.typeuser === 'investor') {
    return vars.investorlocation ? 'investor' : null;
  }
  if (vars.typeuser === 'owneroccupier') {
    return vars.owneroccupierlocation ? 'owneroccupier' : null;
  }
  return null;
}

/**
 * Derive location value based on typeuser
 */
function deriveLocationValue(vars: any): string | null {
  if (vars.typeuser === 'tenant' && vars.rentallocation) {
    return vars.rentallocation;
  }
  if (vars.typeuser === 'investor' && vars.investorlocation) {
    return vars.investorlocation;
  }
  if (vars.typeuser === 'owneroccupier' && vars.owneroccupierlocation) {
    return vars.owneroccupierlocation;
  }
  return null;
}

/**
 * Find a variable in transcript traces
 * Searches through logs for "set" traces that match a variable name
 */
function findVariableInTraces(logs: any[], variableName: string): string | null {
  if (!logs || logs.length === 0) return null;

  for (const log of logs) {
    // Look for set traces
    if (log.type === 'trace' && log.data?.type === 'set') {
      const payload = log.data.payload;
      if (payload && payload.key === variableName && payload.value) {
        return String(payload.value);
      }
    }
  }

  return null;
}

/**
 * Find location-related variable in traces
 */
function findLocationInTraces(logs: any[], typeuser: string | undefined): { type: string; value: string } | null {
  if (!logs || logs.length === 0) return null;

  const locationVarName =
    typeuser === 'tenant'
      ? 'rentallocation'
      : typeuser === 'investor'
        ? 'investorlocation'
        : typeuser === 'owneroccupier'
          ? 'owneroccupierlocation'
          : null;

  if (!locationVarName) return null;

  const location = findVariableInTraces(logs, locationVarName);
  if (location) {
    return {
      type: locationVarName,
      value: location,
    };
  }

  return null;
}

/**
 * Find timestamp for when a variable was set
 */
function findTimestampForVariable(logs: any[], variableName: string): string {
  if (!logs || logs.length === 0) return new Date().toISOString();

  for (const log of logs) {
    if (log.type === 'trace' && log.data?.type === 'set') {
      const payload = log.data.payload;
      if (payload && payload.key === variableName) {
        return log.timestamp || log.createdAt || new Date().toISOString();
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
  if (!locationValue && typeuser) {
    const tracedLocation = findLocationInTraces(logs, typeuser);
    if (tracedLocation) {
      locationValue = tracedLocation.value;
    }
  }

  // 4. Extract rating
  const rating = vars.rating ? extractRatingScore(vars.rating) : null;

  // 5. Extract feedback (only for ratings 1-3)
  const feedback = rating && rating <= 3 ? vars.feedback : null;

  // 6. Get timestamps
  const started_at = transcript.createdAt || transcript.started_at || new Date().toISOString();
  const ended_at = transcript.endedAt || transcript.ended_at || transcript.updatedAt || null;

  return {
    typeuser,
    location_type: deriveLocationType({ ...vars, typeuser }),
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
