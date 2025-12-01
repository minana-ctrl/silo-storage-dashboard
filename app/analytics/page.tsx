'use client';

import { useState, useEffect } from 'react';
import MetricCard from '@/components/MetricCard';
import TimeFilter from '@/components/TimeFilter';
import ConversationsChart from '@/components/ConversationsChart';
import MessagesChart from '@/components/MessagesChart';

interface AnalyticsData {
  metrics: {
    totalConversations: number;
    incomingMessages: number;
    averageInteractions: number;
    uniqueUsers: number;
    conversationsChange?: number;
    messagesChange?: number;
  };
  timeSeries: Array<{
    date: string;
    conversations: number;
    messages: number;
  }>;
  isDemo?: boolean;
}

export default function AnalyticsPage() {
  const [selectedDays, setSelectedDays] = useState(7);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/analytics', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ days: selectedDays }),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch analytics');
        }

        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [selectedDays]);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="font-heading text-3xl text-secondary-black">Analytics</h1>
        <TimeFilter selectedDays={selectedDays} onDaysChange={setSelectedDays} />
      </div>

      {loading && (
        <div className="flex items-center justify-center h-64">
          <p className="font-body text-text-muted">Loading analytics...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-4 mb-6">
          <p className="font-body text-red-600">Error: {error}</p>
        </div>
      )}

      {data && !loading && (
        <>
          {/* Demo Mode Notice */}
          {data.isDemo && (
            <div className="bg-yellow-50 border border-yellow-200 rounded p-4 mb-6">
              <p className="font-body text-yellow-800">
                <strong>Demo Mode:</strong> Showing sample data. The Voiceflow Analytics API endpoint returned an error. 
                Please verify your API key has Analytics API access, or check the Voiceflow documentation for the correct endpoint.
              </p>
            </div>
          )}
          
          {/* Key Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <MetricCard
              label="Total Conversations"
              value={data.metrics.totalConversations}
              change={data.metrics.conversationsChange}
              showChange={true}
            />
            <MetricCard
              label="Incoming Messages"
              value={data.metrics.incomingMessages}
              change={data.metrics.messagesChange}
              showChange={true}
            />
            <MetricCard
              label="Average Interactions"
              value={data.metrics.averageInteractions}
            />
            <MetricCard
              label="Unique Users"
              value={data.metrics.uniqueUsers}
            />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ConversationsChart data={data.timeSeries} />
            <MessagesChart data={data.timeSeries} />
          </div>
        </>
      )}
    </div>
  );
}

