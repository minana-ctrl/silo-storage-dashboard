'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface SubjectAnalysisProps {
  topIntents: Array<{ name: string; count: number }>;
}

export default function SubjectAnalysis({ topIntents }: SubjectAnalysisProps) {
  if (!topIntents || topIntents.length === 0) {
    return (
      <div className="card p-6">
        <h3 className="font-heading text-lg text-secondary-black mb-4">Top Topics & Keywords</h3>
        <div className="flex items-center justify-center h-64 text-text-muted font-body">
          No topic data available for this period
        </div>
      </div>
    );
  }

  // Take top 10 intents and format names (convert snake_case to readable format)
  const formattedData = topIntents.slice(0, 10).map((intent) => ({
    name: intent.name
      .replace(/_/g, ' ')
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' '),
    count: intent.count,
  }));

  const maxCount = Math.max(...formattedData.map((d) => d.count));
  const colors = [
    '#ec2f2f',
    '#ef4444',
    '#f87171',
    '#fca5a5',
    '#fee2e2',
    '#fecaca',
    '#fcbdbd',
    '#fcb0b0',
    '#faa9a9',
    '#f7a2a2',
  ];

  return (
    <div className="card p-6">
      <h3 className="font-heading text-lg text-secondary-black mb-6">Top Topics & Keywords</h3>
      <div className="space-y-4">
        {formattedData.map((item, index) => (
          <div key={item.name}>
            <div className="flex justify-between text-sm mb-2">
              <span className="font-body text-text-dark">{item.name}</span>
              <span className="font-body text-text-muted">{item.count} mentions</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div
                className="h-2 rounded-full transition-all duration-500"
                style={{
                  width: `${(item.count / maxCount) * 100}%`,
                  backgroundColor: colors[index % colors.length],
                }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 pt-6 border-t border-border">
        <p className="text-xs text-text-muted font-body">
          Displaying top {Math.min(10, formattedData.length)} topics from user interactions.
          These represent the most frequently discussed subjects and intents.
        </p>
      </div>
    </div>
  );
}










