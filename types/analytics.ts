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


