'use client';

import { useState, useEffect } from 'react';
import MetricCard from '@/components/MetricCard';
import TimeFilter from '@/components/TimeFilter';
import ConversationsChart from '@/components/ConversationsChart';
import MessagesChart from '@/components/MessagesChart';
import LocationBreakdownComponent from '@/components/LocationBreakdown';
import SubjectAnalysis from '@/components/SubjectAnalysis';
import SatisfactionScore from '@/components/SatisfactionScore';
import ClickThroughChart from '@/components/ClickThroughChart';
import RentSalesRatio from '@/components/RentSalesRatio';
import type { LocationBreakdown } from '@/types/analytics';

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
  totalCTAViews: number;
  satisfactionScore: {
    average: number;
    trend: number[];
  };
  clickThrough: {
    rent: number;
    sales: number;
    ownerOccupier: number;
    investor: number;
  };
  locationBreakdown: {
    rent: { huskisson: number; wollongong: number; nowra: number };
    investor: { wollongong: number; nowra: number; oranPark: number };
    ownerOccupier: { wollongong: number; nowra: number; oranPark: number };
  };
  topIntents: Array<{ name: string; count: number }>;
  funnel: {
    rent: { clicks: number; locationSelection: number };
    ownerOccupier: { clicks: number; locationSelection: number };
    investor: { clicks: number; locationSelection: number };
  };
  isDemo?: boolean;
}

export default function AnalyticsPage() {
  const [selectedDays, setSelectedDays] = useState(7);
  const [customRange, setCustomRange] = useState<{ startDate: string; endDate: string } | null>(null);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<number>(Date.now());

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      setError(null);
      try {
        const body = customRange
          ? { startDate: customRange.startDate, endDate: customRange.endDate }
          : { days: selectedDays };

        const response = await fetch('/api/analytics', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
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
  }, [selectedDays, customRange, lastSyncTime]);

  const handleRefreshData = async (force: boolean = false) => {
    setSyncing(true);
    try {
      const response = await fetch('/api/sync-transcripts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ force }),
      });

      if (!response.ok) {
        throw new Error('Failed to sync data');
      }

      const result = await response.json();

      if (result.success) {
        // Trigger data refetch
        setLastSyncTime(Date.now());
      } else {
        throw new Error(result.error || 'Sync failed');
      }
    } catch (err) {
      console.error('Sync error:', err);
      // Optional: show toast notification here
    } finally {
      setSyncing(false);
    }
  };

  const handleCustomRangeChange = (startDate: string, endDate: string) => {
    setCustomRange({ startDate, endDate });
    setSelectedDays(-1);
  };

  const handleDaysChange = (days: number) => {
    if (days !== -1) {
      setCustomRange(null);
    }
    setSelectedDays(days);
  };

  const getDateRangeText = () => {
    if (customRange) {
      const start = new Date(customRange.startDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
      const end = new Date(customRange.endDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
      return `${start} - ${end}`;
    }

    if (selectedDays === 0) return 'Today';
    if (selectedDays === 1) return 'Yesterday';
    return `Last ${selectedDays} days`;
  };

  // Prepare rent vs sales data from clickThrough metrics
  const getRentSalesData = () => {
    if (!data) return { tenant: 0, sales: 0, investor: 0, owneroccupier: 0 };
    return {
      tenant: data.clickThrough.rent,
      sales: data.clickThrough.sales,
      investor: data.clickThrough.investor,
      owneroccupier: data.clickThrough.ownerOccupier,
    };
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="font-heading text-3xl text-secondary-black">Analytics</h1>
          <p className="text-sm text-text-muted font-body mt-1">{getDateRangeText()}</p>
        </div>
        <TimeFilter
          selectedDays={selectedDays}
          onDaysChange={handleDaysChange}
          onCustomRangeChange={handleCustomRangeChange}
        />
        <div className="flex flex-col items-end gap-1">
          <button
            onClick={() => handleRefreshData(false)}
            disabled={syncing || loading}
            className={`ml-4 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${syncing
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-primary text-white hover:bg-primary-red/90'
              }`}
          >
            {syncing ? (
              <>
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Syncing...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh Data
              </>
            )}
          </button>

          <button
            onClick={() => handleRefreshData(true)}
            disabled={syncing || loading}
            className="text-xs text-primary hover:text-primary-red underline"
          >
            Force Re-sync All
          </button>
        </div>
      </div>

      {
        loading && (
          <div className="flex items-center justify-center h-64">
            <p className="font-body text-text-muted">Loading analytics...</p>
          </div>
        )
      }

      {
        error && (
          <div className="bg-red-50 border border-red-200 rounded p-4 mb-6">
            <p className="font-body text-red-600">Error: {error}</p>
          </div>
        )
      }

      {
        data && !loading && (
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
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
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <ConversationsChart data={data.timeSeries} />
              <MessagesChart data={data.timeSeries} />
            </div>

            {/* Satisfaction and Rent/Sales Metrics Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <SatisfactionScore data={data.satisfactionScore} />
              <RentSalesRatio data={getRentSalesData()} />
            </div>

            {/* Location Breakdown */}
            <LocationBreakdownComponent data={data.locationBreakdown} />

            {/* Subject Analysis */}
            <div className="mb-8">
              <SubjectAnalysis topIntents={data.topIntents} />
            </div>

            {/* Category Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ClickThroughChart data={data.clickThrough} />
            </div>
          </>
        )
      }
    </div >
  );
}

