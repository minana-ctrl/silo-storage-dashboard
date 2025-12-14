'use client';

interface SatisfactionScoreProps {
    data: {
        average: number;
        trend: number[];
        totalRatings?: number;
        distribution?: Array<{ rating: number; count: number }>;
    };
}

export default function SatisfactionScore({ data }: SatisfactionScoreProps) {
    const totalRatings = data.totalRatings || data.trend.length;
    const distribution = data.distribution || [];

    // Calculate percentage for each star rating
    const ratingBars = [5, 4, 3, 2, 1].map(rating => {
        const count = distribution.find(d => d.rating === rating)?.count || 0;
        const percentage = totalRatings > 0 ? (count / totalRatings) * 100 : 0;
        return { rating, count, percentage };
    });

    return (
        <div className="card p-6">
            <h3 className="font-heading text-lg text-secondary-black mb-4">Customer Satisfaction</h3>
            
            {/* Average Score */}
            <div className="mb-6">
                <div className="flex items-baseline gap-2">
                    <p className="text-5xl font-heading text-primary-red">{data.average.toFixed(1)}</p>
                    <p className="text-lg text-text-muted font-body">/ 5.0</p>
                </div>
                <p className="text-sm text-text-muted font-body mt-1">
                    Based on {totalRatings} rating{totalRatings !== 1 ? 's' : ''}
                </p>
            </div>

            {/* Rating Distribution Bars */}
            {distribution.length > 0 && (
                <div className="space-y-2">
                    {ratingBars.map(({ rating, count, percentage }) => (
                        <div key={rating} className="flex items-center gap-3">
                            {/* Star label */}
                            <div className="flex items-center gap-1 w-12 text-sm text-text-muted font-body">
                                <span>{rating}</span>
                                <span className="text-yellow-500">★</span>
                            </div>
                            
                            {/* Progress bar */}
                            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-primary-red rounded-full transition-all duration-300"
                                    style={{ width: `${percentage}%` }}
                                />
                            </div>
                            
                            {/* Count */}
                            <span className="text-sm text-text-muted font-body w-6 text-right">
                                {count}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {/* Empty state */}
            {distribution.length === 0 && (
                <p className="text-sm text-text-muted font-body text-center py-4">
                    No ratings yet
                </p>
            )}
        </div>
    );
}
