'use client';

import { useEffect, useMemo, useState } from 'react';
import ConversationList from '@/components/ConversationList';
import ChatInterface from '@/components/ChatInterface';
import type { TranscriptSummary, TranscriptTurn } from '@/types/conversations';

const PAGE_SIZE = 15;

interface FilterState {
  query: string;
  days: number;
  platform?: string;
  customStartDate?: string;
  customEndDate?: string;
}

function getDateRange(days: number) {
  const end = new Date();
  const start = new Date();
  
  if (days === 0) {
    // Today
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  } else if (days === 1) {
    // Yesterday
    start.setDate(start.getDate() - 1);
    start.setHours(0, 0, 0, 0);
    end.setDate(end.getDate() - 1);
    end.setHours(23, 59, 59, 999);
  } else {
    // Last N days
    start.setDate(start.getDate() - (days - 1));
  }

  return {
    startTime: start.toISOString(),
    endTime: end.toISOString(),
  };
}

export default function ConversationsPage() {
  const [filters, setFilters] = useState<FilterState>({ query: '', days: 7 });
  const [conversations, setConversations] = useState<TranscriptSummary[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [listIsDemo, setListIsDemo] = useState(false);
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [messages, setMessages] = useState<TranscriptTurn[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [dialogIsDemo, setDialogIsDemo] = useState(false);

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedId),
    [conversations, selectedId]
  );

  const loadConversations = async (reset = true, cursor?: string) => {
    setListLoading(true);
    if (reset) {
      setListError(null);
      setNextCursor(undefined);
    }

    try {
      const params = new URLSearchParams();
      params.set('limit', String(PAGE_SIZE));

      if (filters.query) params.set('q', filters.query);
      if (filters.platform) params.set('platform', filters.platform);

      // Use custom dates if provided, otherwise calculate from days
      if (filters.customStartDate && filters.customEndDate) {
        const startTime = new Date(filters.customStartDate).toISOString();
        const endTime = new Date(filters.customEndDate);
        endTime.setHours(23, 59, 59, 999);
        params.set('startTime', startTime);
        params.set('endTime', endTime.toISOString());
      } else {
        const { startTime, endTime } = getDateRange(filters.days);
        params.set('startTime', startTime);
        params.set('endTime', endTime);
      }

      if (cursor) params.set('cursor', cursor);

      const response = await fetch(`/api/conversations?${params.toString()}`, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error('Failed to load conversations');
      }

      const data = await response.json();
      const items: TranscriptSummary[] = data.items ?? [];

      setListIsDemo(Boolean(data.isDemo));
      setNextCursor(data.nextCursor);

      setConversations((prev) => (reset ? items : [...prev, ...items]));

      if (items.length > 0 && (!selectedId || reset)) {
        setSelectedId(items[0].id);
      }
    } catch (error) {
      setListError(error instanceof Error ? error.message : 'Failed to load conversations');
      if (reset) {
        setConversations([]);
        setSelectedId(undefined);
      }
    } finally {
      setListLoading(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    setMessages([]);
    setMessagesLoading(true);
    setMessagesError(null);

    try {
      const response = await fetch(`/api/conversations/${conversationId}`, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error('Failed to load transcript dialog');
      }
      const data = await response.json();
      setMessages(data.messages ?? []);
      setDialogIsDemo(Boolean(data.isDemo));
    } catch (error) {
      setMessagesError(error instanceof Error ? error.message : 'Failed to load transcript dialog');
      setMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  };

  useEffect(() => {
    loadConversations(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.query, filters.days, filters.platform, filters.customStartDate, filters.customEndDate]);

  useEffect(() => {
    if (selectedId) {
      loadMessages(selectedId);
    } else {
      setMessages([]);
    }
  }, [selectedId]);

  const handleLoadMore = () => {
    if (!nextCursor || listLoading) return;
    loadConversations(false, nextCursor);
  };

  const handleCustomRangeChange = (startDate: string, endDate: string) => {
    setFilters((prev) => ({ 
      ...prev, 
      days: -1,
      customStartDate: startDate, 
      customEndDate: endDate 
    }));
  };

  const handleDaysChange = (days: number) => {
    if (days !== -1) {
      // Clear custom dates when selecting a preset
      setFilters((prev) => ({ 
        ...prev, 
        days, 
        customStartDate: undefined, 
        customEndDate: undefined 
      }));
    } else {
      setFilters((prev) => ({ ...prev, days }));
    }
  };

  return (
    <div className="flex h-full flex-col p-8 overflow-hidden">
      <div className="flex-shrink-0 mb-6">
        <h1 className="font-heading text-4xl text-secondary-black">Conversations</h1>
        <p className="text-sm font-body text-text-muted">
          Review every interaction logged by Silo Storage agents.
        </p>
      </div>

      {listError && (
        <div className="flex-shrink-0 rounded border border-red-200 bg-red-50 px-4 py-3 font-body text-sm text-primary-red mb-6">
          {listError}
        </div>
      )}

      <div className="flex-1 min-h-0 grid gap-6 xl:grid-cols-[1.4fr_2fr] overflow-hidden">
        <div className="min-h-0 overflow-hidden">
          <ConversationList
          conversations={conversations}
          selectedId={selectedId}
          onSelect={setSelectedId}
          loading={listLoading}
          query={filters.query}
          onQueryChange={(value) => setFilters((prev) => ({ ...prev, query: value }))}
          days={filters.days}
          onDaysChange={handleDaysChange}
          onCustomRangeChange={handleCustomRangeChange}
          platform={filters.platform}
          onPlatformChange={(platform) => setFilters((prev) => ({ ...prev, platform }))}
          hasMore={Boolean(nextCursor)}
          onLoadMore={handleLoadMore}
          isDemo={listIsDemo}
        />
        </div>

        <div className="min-h-0 overflow-hidden">
          <ChatInterface
          conversation={selectedConversation}
          messages={messages}
          loading={messagesLoading}
          error={messagesError}
          isDemo={dialogIsDemo}
        />
        </div>
      </div>
    </div>
  );
}

