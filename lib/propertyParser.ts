import type { TranscriptSummary } from '@/types/conversations';

export interface VoiceflowVariables {
  typeuser?: 'tenant' | 'investor' | 'owneroccupier';
  rating?: string; // "1/5" to "5/5"
  feedback?: string;
  rentallocation?: 'wollongong' | 'huskisson' | 'nowra';
  investorlocation?: 'wollongong' | 'nowra' | 'oranpark' | 'oran park';
  owneroccupierlocation?: 'wollongong' | 'nowra' | 'oranpark';
}

export interface CategoryBreakdown {
  tenant: number;
  investor: number;
  owneroccupier: number;
}

export interface LocationBreakdownActual {
  rent: { wollongong: number; huskisson: number; nowra: number };
  investor: { wollongong: number; nowra: number; oranpark: number };
  owneroccupier: { wollongong: number; nowra: number; oranpark: number };
}

export interface FeedbackEntry {
  rating: number;
  text: string;
  timestamp: string;
  transcriptId: string;
}

/**
 * Normalize property keys - handle case variations and common aliases
 */
function normalizePropertyKey(key: string): string {
  return key.toLowerCase().trim();
}

/**
 * Normalize location names for consistency
 */
function normalizeLocation(loc: string): string | null {
  const normalized = loc.toLowerCase().trim();
  
  // Rent locations
  if (normalized === 'wollongong' || normalized === 'woollongong') return 'wollongong';
  if (normalized === 'huskisson' || normalized === 'huskison') return 'huskisson';
  if (normalized === 'nowra') return 'nowra';
  
  // Sales locations
  if (normalized === 'oran park' || normalized === 'oranpark' || normalized === 'oran_park') return 'oranpark';
  
  return null;
}

/**
 * Extract numeric rating from various formats
 * Handles: "1/5", "1", "1 out of 5", "1 stars", etc.
 */
export function extractRatingScore(rating: string | number | undefined): number | null {
  if (rating === null || rating === undefined) return null;

  const ratingStr = String(rating).trim();

  if (!ratingStr) return null;

  // Try direct number extraction first
  const match = ratingStr.match(/(\d+)/);

  if (match && match[1]) {
    const score = parseInt(match[1], 10);
    if (score >= 1 && score <= 5) {
      return score;
    }
    // If number is outside 1-5, check if it's a percentage (e.g., "80" could mean 4/5)
    if (score >= 1 && score <= 100) {
      // Convert percentage to 1-5 scale
      const scaledScore = Math.round((score / 100) * 5);
      if (scaledScore >= 1 && scaledScore <= 5) {
        return scaledScore;
      }
    }
  }

  return null;
}

/**
 * Parse Voiceflow variables from transcript properties
 */
export function parseVoiceflowVariables(
  properties?: Record<string, unknown>
): VoiceflowVariables {
  if (!properties) return {};
  
  const result: VoiceflowVariables = {};
  
  // Iterate through properties and normalize keys
  for (const [key, value] of Object.entries(properties)) {
    const normalizedKey = normalizePropertyKey(key);
    const strValue = value ? String(value).trim() : '';
    
    if (!strValue) continue;
    
    // Match typeuser
    if (normalizedKey === 'typeuser' || normalizedKey === 'type_user') {
      const normalized = strValue.toLowerCase();
      if (normalized === 'tenant' || normalized === 'investor' || normalized === 'owneroccupier') {
        result.typeuser = normalized as 'tenant' | 'investor' | 'owneroccupier';
      }
    }
    
    // Match rating - accept various formats
    if (normalizedKey === 'rating' || normalizedKey === 'satisfaction' || normalizedKey === 'score') {
      // Accept any format that contains a number 1-5
      // Formats: "1/5", "1", "1 out of 5", "80%", etc.
      result.rating = strValue;
    }
    
    // Match feedback
    if (normalizedKey === 'feedback') {
      result.feedback = strValue;
    }
    
    // Match location variables
    if (normalizedKey === 'rentallocation' || normalizedKey === 'rental_location') {
      const normalized = normalizeLocation(strValue);
      if (normalized && (normalized === 'wollongong' || normalized === 'huskisson' || normalized === 'nowra')) {
        result.rentallocation = normalized as 'wollongong' | 'huskisson' | 'nowra';
      }
    }
    
    if (normalizedKey === 'investorlocation' || normalizedKey === 'investor_location') {
      const normalized = normalizeLocation(strValue);
      if (normalized && (normalized === 'wollongong' || normalized === 'nowra' || normalized === 'oranpark')) {
        result.investorlocation = normalized as 'wollongong' | 'nowra' | 'oranpark';
      }
    }
    
    if (normalizedKey === 'owneroccupierlocation' || normalizedKey === 'owner_occupier_location' || normalizedKey === 'owneroccupier_location') {
      const normalized = normalizeLocation(strValue);
      if (normalized && (normalized === 'wollongong' || normalized === 'nowra' || normalized === 'oranpark')) {
        result.owneroccupierlocation = normalized as 'wollongong' | 'nowra' | 'oranpark';
      }
    }
  }
  
  return result;
}

/**
 * Categorize user based on typeuser variable
 */
export function categorizeSales(typeuser: string | undefined): 'rent' | 'sales' {
  if (typeuser === 'tenant') return 'rent';
  if (typeuser === 'investor' || typeuser === 'owneroccupier') return 'sales';
  return 'rent'; // default fallback
}

/**
 * Aggregate analytics data from transcript summaries
 */
export function aggregateAnalyticsFromTranscripts(transcripts: TranscriptSummary[]) {
  const categoryBreakdown: CategoryBreakdown = {
    tenant: 0,
    investor: 0,
    owneroccupier: 0,
  };
  
  const locationBreakdown: LocationBreakdownActual = {
    rent: { wollongong: 0, huskisson: 0, nowra: 0 },
    investor: { wollongong: 0, nowra: 0, oranpark: 0 },
    owneroccupier: { wollongong: 0, nowra: 0, oranpark: 0 },
  };
  
  const ratings: number[] = [];
  const feedbackEntries: FeedbackEntry[] = [];
  const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  
  for (const transcript of transcripts) {
    const vars = parseVoiceflowVariables(transcript.properties);
    
    // Count by typeuser
    if (vars.typeuser === 'tenant') {
      categoryBreakdown.tenant++;
    } else if (vars.typeuser === 'investor') {
      categoryBreakdown.investor++;
    } else if (vars.typeuser === 'owneroccupier') {
      categoryBreakdown.owneroccupier++;
    }
    
    // Extract rating
    if (vars.rating) {
      const ratingScore = extractRatingScore(vars.rating);
      if (ratingScore !== null) {
        ratings.push(ratingScore);
        ratingDistribution[ratingScore]++;
        
        // Collect feedback for low ratings (1-3)
        if (ratingScore <= 3 && vars.feedback) {
          feedbackEntries.push({
            rating: ratingScore,
            text: vars.feedback,
            timestamp: transcript.createdAt,
            transcriptId: transcript.id,
          });
        }
      }
    }
    
    // Count locations
    if (vars.typeuser === 'tenant' && vars.rentallocation) {
      const loc = vars.rentallocation as keyof typeof locationBreakdown.rent;
      if (loc in locationBreakdown.rent) {
        locationBreakdown.rent[loc]++;
      }
    } else if (vars.typeuser === 'investor' && vars.investorlocation) {
      const loc = vars.investorlocation as keyof typeof locationBreakdown.investor;
      if (loc in locationBreakdown.investor) {
        locationBreakdown.investor[loc]++;
      }
    } else if (vars.typeuser === 'owneroccupier' && vars.owneroccupierlocation) {
      const loc = vars.owneroccupierlocation as keyof typeof locationBreakdown.owneroccupier;
      if (loc in locationBreakdown.owneroccupier) {
        locationBreakdown.owneroccupier[loc]++;
      }
    }
  }
  
  // Calculate average rating
  const averageRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
  
  return {
    categoryBreakdown,
    locationBreakdown,
    satisfactionScore: {
      average: averageRating,
      totalRatings: ratings.length,
      distribution: Object.entries(ratingDistribution)
        .map(([rating, count]) => ({ rating: parseInt(rating, 10), count }))
        .filter(d => d.count > 0),
      trend: ratings, // Full trend data
    },
    feedback: {
      items: feedbackEntries,
      totalCount: feedbackEntries.length,
    },
  };
}

/**
 * Validate Voiceflow variables against Voiceflow specifications
 */
export function validateVariables(vars: VoiceflowVariables): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Ensure only one location variable is set per category
  if (vars.typeuser === 'tenant') {
    if (vars.investorlocation || vars.owneroccupierlocation) {
      errors.push('Tenant should not have investor or owner occupier location set');
    }
  } else if (vars.typeuser === 'investor') {
    if (vars.rentallocation || vars.owneroccupierlocation) {
      errors.push('Investor should not have rental or owner occupier location set');
    }
  } else if (vars.typeuser === 'owneroccupier') {
    if (vars.rentallocation || vars.investorlocation) {
      errors.push('Owner occupier should not have rental or investor location set');
    }
  }
  
  // Feedback should only exist for low ratings
  if (vars.feedback && vars.rating) {
    const ratingScore = extractRatingScore(vars.rating);
    if (ratingScore && ratingScore > 3) {
      errors.push('Feedback should only be provided for ratings 1-3');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}
