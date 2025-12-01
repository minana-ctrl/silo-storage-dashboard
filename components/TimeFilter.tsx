'use client';

interface TimeFilterProps {
  selectedDays: number;
  onDaysChange: (days: number) => void;
}

const timeOptions = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 14 days', days: 14 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
];

export default function TimeFilter({ selectedDays, onDaysChange }: TimeFilterProps) {
  return (
    <select
      value={selectedDays}
      onChange={(e) => onDaysChange(Number(e.target.value))}
      className="px-4 py-2 border border-border rounded font-body text-text-dark bg-white focus:outline-none focus:ring-2 focus:ring-primary-red"
    >
      {timeOptions.map((option) => (
        <option key={option.days} value={option.days}>
          {option.label}
        </option>
      ))}
    </select>
  );
}


