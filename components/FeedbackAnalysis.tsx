'use client';

import type { FeedbackData } from '@/types/analytics';

interface FeedbackAnalysisProps {
  data: FeedbackData;
}

export default function FeedbackAnalysis({ data }: FeedbackAnalysisProps) {
  if (data.totalCount === 0) {
    return (
      <div className="card p-6">
        <h3 className="font-heading text-lg text-secondary-black mb-4">Customer Feedback (Low Ratings)</h3>
        <div className="flex items-center justify-center h-64 text-text-muted font-body">
          No feedback available
        </div>
      </div>
    );
  }

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const truncateText = (text: string, maxLength: number = 120) => {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  const getRatingColor = (rating: number) => {
    if (rating === 1) return 'text-red-600';
    if (rating === 2) return 'text-orange-600';
    return 'text-yellow-600';
  };

  const getRatingStars = (rating: number) => {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
  };

  return (
    <div className="card p-6">
      <div className="mb-4">
        <h3 className="font-heading text-lg text-secondary-black">Customer Feedback (Low Ratings)</h3>
        <p className="text-sm text-text-muted font-body mt-1">{data.totalCount} feedback entries</p>
      </div>

      <div className="space-y-4">
        {data.items.map((feedback, index) => (
          <div key={index} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition">
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <span className={`font-semibold ${getRatingColor(feedback.rating)}`}>
                  {getRatingStars(feedback.rating)}
                </span>
                <span className="text-sm font-body text-text-muted">{feedback.rating}/5</span>
              </div>
              <span className="text-xs text-text-muted font-body">{formatDate(feedback.timestamp)}</span>
            </div>
            <p className="text-sm text-secondary-black font-body mb-2">{truncateText(feedback.text)}</p>
            <a
              href={`/conversations/${feedback.transcriptId}`}
              className="text-xs text-primary-red font-semibold hover:underline"
            >
              View Conversation →
            </a>
          </div>
        ))}
      </div>

      {data.items.length > 5 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <a href="#" className="text-sm text-primary-red font-semibold hover:underline">
            View all {data.totalCount} feedback entries →
          </a>
        </div>
      )}
    </div>
  );
}
