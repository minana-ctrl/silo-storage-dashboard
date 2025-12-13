export interface AnalyticsUsageResponse {
  usage: {
    sessions: number;
    messages: number;
    users: number;
  };
  period: {
    start: string;
    end: string;
  };
}

export interface AnalyticsDataPoint {
  date: string;
  conversations: number;
  messages: number;
}

export interface AnalyticsMetrics {
  totalConversations: number;
  incomingMessages: number;
  averageInteractions: number;
  uniqueUsers: number;
  conversationsChange?: number;
  messagesChange?: number;
  timeSeries: AnalyticsDataPoint[];
}

export interface TimePeriod {
  label: string;
  days: number;
}

export interface LocationBreakdown {
  rent: { huskisson: number; wollongong: number; nowra: number };
  investor: { wollongong: number; nowra: number; oranPark: number };
  ownerOccupier: { wollongong: number; nowra: number; oranPark: number };
}

export interface LocationBreakdownActual {
  rent: { wollongong: number; huskisson: number; nowra: number };
  investor: { wollongong: number; nowra: number; oranpark: number };
  owneroccupier: { wollongong: number; nowra: number; oranpark: number };
}

export interface SubjectAnalysis {
  topIntents: Array<{ name: string; count: number }>;
  topQuestions?: Array<{ question: string; count: number }>;
}

export interface CategoryBreakdown {
  rent: number;
  sales: number;
  ownerOccupier: number;
  investor: number;
}

export interface CategoryBreakdownByTypeuser {
  tenant: number;
  investor: number;
  owneroccupier: number;
}

export interface RatingDistribution {
  rating: number;
  count: number;
}

export interface FeedbackEntry {
  rating: number;
  text: string;
  timestamp: string;
  transcriptId: string;
}

export interface SatisfactionScoreData {
  average: number;
  trend: number[];
  totalRatings: number;
  distribution: RatingDistribution[];
}

export interface FeedbackData {
  items: FeedbackEntry[];
  totalCount: number;
}


