'use client';

interface CTAVisibilityProps {
  totalViews: number;
  trend?: number;
}

export default function CTAVisibility({ totalViews, trend }: CTAVisibilityProps) {
  const trendColor = trend && trend >= 0 ? 'text-green-600' : 'text-red-600';
  const trendSymbol = trend && trend >= 0 ? '+' : '';

  return (
    <div className="card p-6">
      <h3 className="font-heading text-lg text-secondary-black mb-4">CTA Visibility</h3>
      <div className="flex items-end gap-6">
        <div>
          <p className="text-5xl font-heading text-primary-red">{totalViews.toLocaleString()}</p>
          <p className="text-sm text-text-muted font-body mt-1">Total CTA Views</p>
        </div>
        {trend !== undefined && (
          <div className="pb-2">
            <p className={`text-lg font-semibold ${trendColor}`}>
              {trendSymbol}{trend.toFixed(1)}%
            </p>
            <p className="text-xs text-text-muted font-body">from previous period</p>
          </div>
        )}
      </div>
    </div>
  );
}



