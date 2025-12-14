'use client';

import type { TranscriptTurn } from '@/types/conversations';

interface MessageBubbleProps {
  message: TranscriptTurn;
}

function formatTime(value: string) {
  try {
    const date = new Date(value);
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: 'numeric',
    }).format(date);
  } catch {
    return value;
  }
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div
      className={`flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}
      data-role={message.role}
    >
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 font-body text-sm ${
          isUser
            ? 'bg-primary-red text-white rounded-br-sm'
            : 'bg-white border border-border text-secondary-black rounded-bl-sm'
        }`}
      >
        <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
      </div>
      <span className="text-xs font-body text-text-muted">{formatTime(message.timestamp)}</span>
    </div>
  );
}







