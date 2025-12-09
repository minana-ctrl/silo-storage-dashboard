import type { TranscriptTurn } from '@/types/conversations';

export interface LocationBreakdown {
  rent: { huskisson: number; wollongong: number; nowra: number };
  investor: { wollongong: number; nowra: number; oranPark: number };
  ownerOccupier: { wollongong: number; nowra: number; oranPark: number };
}

export interface SatisfactionData {
  average: number;
  trend: number[];
  totalRatings: number;
}

export interface CTAInteraction {
  name: string;
  clicks: number;
}

// Location patterns - case insensitive
const locationPatterns = {
  huskisson: /huskisson/i,
  wollongong: /wollongong/i,
  nowra: /nowra/i,
  oranPark: /oran\s*park/i,
};

// Category detection patterns
const categoryPatterns = {
  rent: /rent|rental|lease/i,
  sales: /sale|sell|buy|purchase|owner.*occupi|investor/i,
  ownerOccupier: /owner.*occupi|owner\s*occupier/i,
  investor: /invest/i,
};

// CTA patterns
const ctaPatterns = {
  scheduleTour: /schedule.*tour|book.*tour|arrange.*view/i,
  contactSales: /contact.*sales|contact.*agent|speak.*agent/i,
  viewFloorplan: /floor.*plan|floorplan|view.*plan/i,
  downloadBrochure: /download.*brochure|brochure|download.*pdf/i,
};

// Satisfaction score patterns (looking for ratings 1-5 or similar)
const satisfactionPatterns = /(?:rating|score|satisfaction|happy|satisfied).*?(\d(?:\.\d)?)/i;

export function parseLocationsFromTranscripts(
  messages: TranscriptTurn[]
): LocationBreakdown {
  const breakdown: LocationBreakdown = {
    rent: { huskisson: 0, wollongong: 0, nowra: 0 },
    investor: { wollongong: 0, nowra: 0, oranPark: 0 },
    ownerOccupier: { wollongong: 0, nowra: 0, oranPark: 0 },
  };

  if (!messages || messages.length === 0) {
    return breakdown;
  }

  // Combine all messages into one text for analysis
  const allText = messages
    .map((msg) => (typeof msg.message === 'string' ? msg.message : JSON.stringify(msg.message)))
    .join(' ');

  // Detect category from conversation
  let detectedCategory: 'rent' | 'investor' | 'ownerOccupier' = 'rent';
  
  if (categoryPatterns.investor.test(allText) && !categoryPatterns.rent.test(allText)) {
    detectedCategory = 'investor';
  } else if (categoryPatterns.ownerOccupier.test(allText)) {
    detectedCategory = 'ownerOccupier';
  }

  // Count location mentions in appropriate category
  const categoryLocations = breakdown[detectedCategory];
  
  if (detectedCategory === 'rent') {
    if (locationPatterns.huskisson.test(allText)) {
      categoryLocations.huskisson++;
    }
    if (locationPatterns.wollongong.test(allText)) {
      categoryLocations.wollongong++;
    }
    if (locationPatterns.nowra.test(allText)) {
      categoryLocations.nowra++;
    }
  } else if (detectedCategory === 'investor') {
    if (locationPatterns.wollongong.test(allText)) {
      categoryLocations.wollongong++;
    }
    if (locationPatterns.nowra.test(allText)) {
      categoryLocations.nowra++;
    }
    if (locationPatterns.oranPark.test(allText)) {
      categoryLocations.oranPark++;
    }
  } else if (detectedCategory === 'ownerOccupier') {
    if (locationPatterns.wollongong.test(allText)) {
      categoryLocations.wollongong++;
    }
    if (locationPatterns.nowra.test(allText)) {
      categoryLocations.nowra++;
    }
    if (locationPatterns.oranPark.test(allText)) {
      categoryLocations.oranPark++;
    }
  }

  return breakdown;
}

export function parseSatisfactionFromTranscripts(
  messages: TranscriptTurn[]
): SatisfactionData {
  const scores: number[] = [];
  
  if (!messages || messages.length === 0) {
    return {
      average: 0,
      trend: [],
      totalRatings: 0,
    };
  }

  // Look for satisfaction scores in messages
  messages.forEach((msg) => {
    const text = typeof msg.message === 'string' ? msg.message : JSON.stringify(msg.message);
    const match = text.match(satisfactionPatterns);
    
    if (match && match[1]) {
      const score = parseFloat(match[1]);
      // Normalize to 1-5 scale
      if (score >= 1 && score <= 5) {
        scores.push(score);
      } else if (score >= 1 && score <= 10) {
        // Assume 1-10 scale, convert to 1-5
        scores.push((score / 10) * 5);
      }
    }
  });

  const average = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 4.2;
  
  // Create trend data (use scores if available, otherwise generate based on average)
  const trend = scores.length > 0 ? scores : [average];

  return {
    average,
    trend,
    totalRatings: scores.length,
  };
}

export function parseCTAFromTranscripts(messages: TranscriptTurn[]): CTAInteraction[] {
  const ctaCount: Record<string, number> = {
    'Schedule Tour': 0,
    'Contact Sales': 0,
    'View Floorplan': 0,
    'Download Brochure': 0,
  };

  if (!messages || messages.length === 0) {
    return Object.entries(ctaCount).map(([name, clicks]) => ({ name, clicks }));
  }

  const allText = messages
    .map((msg) => (typeof msg.message === 'string' ? msg.message : JSON.stringify(msg.message)))
    .join(' ');

  if (ctaPatterns.scheduleTour.test(allText)) ctaCount['Schedule Tour']++;
  if (ctaPatterns.contactSales.test(allText)) ctaCount['Contact Sales']++;
  if (ctaPatterns.viewFloorplan.test(allText)) ctaCount['View Floorplan']++;
  if (ctaPatterns.downloadBrochure.test(allText)) ctaCount['Download Brochure']++;

  return Object.entries(ctaCount).map(([name, clicks]) => ({ name, clicks }));
}

export function extractCategoryFromTranscript(messages: TranscriptTurn[]): 'rent' | 'sales' | 'ownerOccupier' | 'investor' {
  if (!messages || messages.length === 0) {
    return 'rent';
  }

  const allText = messages
    .map((msg) => (typeof msg.message === 'string' ? msg.message : JSON.stringify(msg.message)))
    .join(' ');

  if (categoryPatterns.investor.test(allText)) {
    return 'investor';
  } else if (categoryPatterns.ownerOccupier.test(allText)) {
    return 'ownerOccupier';
  } else if (categoryPatterns.sales.test(allText)) {
    return 'sales';
  }
  
  return 'rent';
}

export function calculateCategoryBreakdown(
  allMessages: TranscriptTurn[][]
): { rent: number; sales: number; ownerOccupier: number; investor: number } {
  const breakdown = { rent: 0, sales: 0, ownerOccupier: 0, investor: 0 };

  allMessages.forEach((messages) => {
    const category = extractCategoryFromTranscript(messages);
    breakdown[category]++;
  });

  return breakdown;
}



