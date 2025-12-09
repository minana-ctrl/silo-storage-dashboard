'use client';

import { useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';
import type { TranscriptSummary, TranscriptTurn } from '@/types/conversations';

interface ChatInterfaceProps {
  conversation?: TranscriptSummary;
  messages: TranscriptTurn[];
  loading: boolean;
  error?: string | null;
  isDemo?: boolean;
}

export default function ChatInterface({
  conversation,
  messages,
  loading,
  error,
  isDemo,
}: ChatInterfaceProps) {
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const isInitialLoad = useRef(true);

  useEffect(() => {
    if (!loading && messages.length > 0 && messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      // Use instant scroll for initial load, smooth for updates
      if (isInitialLoad.current) {
        container.scrollTop = container.scrollHeight;
        isInitialLoad.current = false;
      } else {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: 'smooth',
        });
      }
    }
  }, [messages, loading]);

  // Reset initial load flag when conversation changes
  useEffect(() => {
    isInitialLoad.current = true;
  }, [conversation?.id]);

  if (!conversation) {
    return (
      <div className="flex h-full flex-col rounded-xl border border-border bg-white p-6">
        <p className="font-body text-text-muted">Select a conversation to view the chat.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col rounded-xl border border-border bg-white min-h-0">
      <div className="border-b border-border px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-heading text-2xl text-secondary-black">{conversation.userId}</p>
            <p className="text-sm font-body text-text-muted">{conversation.sessionId}</p>
          </div>
          {conversation.tags?.length > 0 && (
            <div className="flex gap-2">
              {conversation.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-border px-3 py-1 text-xs font-body text-text-muted"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
        {isDemo && (
          <p className="mt-2 text-xs font-body text-primary-red">
            Demo transcript. Connect Voiceflow to view real chats.
          </p>
        )}
      </div>

      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-6 py-6 space-y-4 bg-gray-50 min-h-0 custom-scrollbar">
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="flex flex-col gap-2">
                <div className="h-16 w-2/3 animate-pulse rounded-2xl bg-white" />
                <div className="h-16 w-1/2 animate-pulse self-end rounded-2xl bg-primary-red/30" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="rounded border border-red-200 bg-red-50 p-4 text-sm font-body text-primary-red">
            {error}
          </div>
        ) : messages.length === 0 ? (
          <p className="text-center font-body text-text-muted">No messages found.</p>
        ) : (
          messages.map((message) => <MessageBubble key={message.id} message={message} />)
        )}
      </div>
    </div>
  );
}

