'use client';

import { useEffect, useMemo, useState } from 'react';
import type { TranscriptSummary } from '@/types/conversations';

interface ConversationInspectorProps {
  conversation?: TranscriptSummary;
}

function Toggle({
  enabled,
  onChange,
  label,
  description,
}: {
  enabled: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description: string;
}) {
  return (
    <div className="flex items-center justify-between border border-border rounded-lg px-4 py-3">
      <div>
        <p className="font-heading text-secondary-black">{label}</p>
        <p className="text-xs font-body text-text-muted">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
          enabled ? 'bg-primary-red' : 'bg-gray-200'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
            enabled ? 'translate-x-5' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}

export default function ConversationInspector({ conversation }: ConversationInspectorProps) {
  const [intentConfidence, setIntentConfidence] = useState(false);
  const [debugMessages, setDebugMessages] = useState(false);
  const [note, setNote] = useState('');

  const storageKey = useMemo(() => {
    if (!conversation?.id) return undefined;
    return `conversation-note-${conversation.id}`;
  }, [conversation?.id]);

  useEffect(() => {
    if (!storageKey || typeof window === 'undefined') {
      setNote('');
      return;
    }
    const saved = window.localStorage.getItem(storageKey);
    setNote(saved ?? '');
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey || typeof window === 'undefined') return;
    window.localStorage.setItem(storageKey, note);
  }, [note, storageKey]);

  return (
    <div className="flex h-full flex-col rounded-xl border border-border bg-white p-6">
      <div className="mb-4">
        <p className="font-heading text-2xl text-secondary-black">Actions</p>
        <p className="text-sm font-body text-text-muted">
          Configure diagnostics and leave notes for this conversation.
        </p>
      </div>

      <div className="space-y-4">
        <Toggle
          enabled={intentConfidence}
          onChange={setIntentConfidence}
          label="Intent Confidence"
          description="Highlight confidence scores and detection."
        />
        <Toggle
          enabled={debugMessages}
          onChange={setDebugMessages}
          label="Debug Messages"
          description="Surface trace payloads and logs."
        />
      </div>

      <div className="mt-6">
        <label className="block text-sm font-heading text-secondary-black mb-2">Leave a note</label>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Capture follow-ups, bugs, or feedback..."
          className="h-32 w-full rounded border border-border bg-gray-50 px-3 py-2 font-body text-sm text-text-dark focus:outline-none focus:ring-2 focus:ring-primary-red"
        />
        {conversation && (
          <p className="mt-2 text-xs font-body text-text-muted">
            Notes auto-save for {conversation.userId ?? 'this user'}.
          </p>
        )}
      </div>
    </div>
  );
}







