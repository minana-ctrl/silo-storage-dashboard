'use client';

import { useState } from 'react';

interface TimeFilterProps {
  selectedDays: number;
  onDaysChange: (days: number) => void;
  onCustomRangeChange?: (startDate: string, endDate: string) => void;
}

const timeOptions = [
  { label: 'Today', days: 0 },
  { label: 'Yesterday', days: 1 },
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 14 days', days: 14 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
  { label: 'Custom Range', days: -1 },
];

export default function TimeFilter({ selectedDays, onDaysChange, onCustomRangeChange }: TimeFilterProps) {
  const [showCustom, setShowCustom] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleSelectChange = (value: number) => {
    if (value === -1) {
      setShowCustom(true);
    } else {
      setShowCustom(false);
      onDaysChange(value);
    }
  };

  const handleApplyCustomRange = () => {
    if (startDate && endDate && onCustomRangeChange) {
      onCustomRangeChange(startDate, endDate);
      setShowCustom(false);
    }
  };

  const handleCancelCustomRange = () => {
    setShowCustom(false);
    setStartDate('');
    setEndDate('');
  };

  return (
    <div className="relative">
      <select
        value={showCustom ? -1 : selectedDays}
        onChange={(e) => handleSelectChange(Number(e.target.value))}
        className="px-4 py-2 border border-border rounded font-body text-text-dark bg-white focus:outline-none focus:ring-2 focus:ring-primary-red"
      >
        {timeOptions.map((option) => (
          <option key={option.days} value={option.days}>
            {option.label}
          </option>
        ))}
      </select>

      {showCustom && (
        <div className="absolute top-full mt-2 right-0 bg-white border border-border rounded-lg shadow-lg p-4 z-50 min-w-[300px]">
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-text-dark mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded font-body text-text-dark bg-white focus:outline-none focus:ring-2 focus:ring-primary-red"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-dark mb-1">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded font-body text-text-dark bg-white focus:outline-none focus:ring-2 focus:ring-primary-red"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleApplyCustomRange}
                disabled={!startDate || !endDate}
                className="flex-1 px-4 py-2 bg-primary-red text-white rounded font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Apply
              </button>
              <button
                onClick={handleCancelCustomRange}
                className="flex-1 px-4 py-2 border border-border rounded font-medium text-text-dark hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



