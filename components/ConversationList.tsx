'use client';

import { useMemo } from 'react';
import TimeFilter from './TimeFilter';
import PlatformIcon from './PlatformIcon';
import type { TranscriptSummary } from '@/types/conversations';

interface ConversationListProps {
  conversations: TranscriptSummary[];
  selectedId?: string;
  onSelect: (conversationId: string) => void;
  loading: boolean;
  query: string;
  onQueryChange: (value: string) => void;
  days: number;
  onDaysChange: (days: number) => void;
  onCustomRangeChange?: (startDate: string, endDate: string) => void;
  platform?: string;
  onPlatformChange: (platform?: string) => void;
  hasMore: boolean;
  onLoadMore: () => void;
  isDemo?: boolean;
}


function formatTimestamp(value: string) {
  try {
    const date = new Date(value);
    const formatter = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    });
    return formatter.format(date);
  } catch {
    return value;
  }
}

export default function ConversationList({
  conversations,
  selectedId,
  onSelect,
  loading,
  query,
  onQueryChange,
  days,
  onDaysChange,
  onCustomRangeChange,
  platform,
  onPlatformChange,
  hasMore,
  onLoadMore,
  isDemo,
}: ConversationListProps) {
  const filtered = useMemo(() => {
    if (!platform) return conversations;
    return conversations.filter((conversation) => conversation.platform?.toLowerCase() === platform);
  }, [conversations, platform]);

  return (
    <div className="h-full flex flex-col border-r border-border pr-6 min-h-0 overflow-hidden">
      <div className="flex items-center gap-2 mb-4 flex-shrink-0">
        <div className="relative flex-1">
          <input
            type="text"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search user..."
            className="w-full rounded border border-border bg-white pl-10 pr-3 py-2 font-body text-text-dark focus:outline-none focus:ring-2 focus:ring-primary-red"
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 19l-4-4m0-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <TimeFilter 
          selectedDays={days} 
          onDaysChange={onDaysChange}
          onCustomRangeChange={onCustomRangeChange}
        />
      </div>


      {isDemo && (
        <div className="mb-4 flex-shrink-0 rounded border border-dashed border-primary-red bg-red-50 px-3 py-2 text-xs font-body text-primary-red">
          Showing demo data. Add `PROJECT_ID`/`API_KEY` (or VOICEFLOW_* equivalents) to connect Voiceflow.
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-2 pr-2 min-h-0 custom-scrollbar">
        {loading && conversations.length === 0 ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="animate-pulse rounded border border-border bg-white/40 p-4">
                <div className="h-4 w-24 bg-gray-200 rounded mb-2" />
                <div className="h-3 w-full bg-gray-100 rounded" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded border border-border bg-white p-6 text-center font-body text-text-muted">
            No conversations found for this range.
          </div>
        ) : (
          filtered.map((conversation) => {
            const isSelected = conversation.id === selectedId;
            return (
              <button
                key={conversation.id}
                type="button"
                onClick={() => onSelect(conversation.id)}
                className={`w-full text-left rounded-lg border p-4 transition ${
                  isSelected
                    ? 'border-primary-red bg-red-50'
                    : 'border-border bg-white hover:border-primary-red/60'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <PlatformIcon platform={conversation.platform} size="sm" />
                    <div>
                      <p className="font-heading text-secondary-black">
                        {conversation.userId ?? 'New User'}
                      </p>
                      <p className="text-xs font-body text-text-muted">
                        {conversation.sessionId ?? 'Session'}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs font-body text-text-muted">
                    {formatTimestamp(conversation.lastInteractionAt)}
                  </p>
                </div>
                <p className="mt-2 line-clamp-2 text-sm font-body text-text-dark">
                  {conversation.firstUserMessagePreview ?? 'Open conversation to view messages.'}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {conversation.tags?.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-body text-text-muted"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </button>
            );
          })
        )}
      </div>

      {hasMore && (
        <button
          type="button"
          disabled={loading}
          onClick={onLoadMore}
          className="mt-4 flex-shrink-0 w-full rounded border border-border bg-white py-2 font-body text-text-dark hover:border-primary-red disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Load more'}
        </button>
      )}
    </div>
  );
}

