interface MetricCardProps {
  label: string;
  value: number | string;
  change?: number;
  showChange?: boolean;
}

export default function MetricCard({ label, value, change, showChange = false }: MetricCardProps) {
  const changeColor = change && change >= 0 ? 'text-green-600' : 'text-red-600';
  const changeSymbol = change && change >= 0 ? '+' : '';

  return (
    <div className="card p-6">
      <p className="metric-label mb-2">{label}</p>
      <p className="metric-value mb-2">{value.toLocaleString()}</p>
      {showChange && change !== undefined && (
        <p className={`text-sm font-body ${changeColor}`}>
          {changeSymbol}{change.toFixed(1)}% from previous period
        </p>
      )}
    </div>
  );
}






