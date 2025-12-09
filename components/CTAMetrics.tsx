'use client';

interface CTAMetricsProps {
    data: Array<{ name: string; count: number }>;
}

export default function CTAMetrics({ data }: CTAMetricsProps) {
    const maxCount = data.length > 0 ? Math.max(...data.map((item) => item.count)) : 0;

    if (data.length === 0) {
        return (
            <div className="card p-6">
                <h3 className="font-heading text-lg text-secondary-black mb-4">CTA Visibility</h3>
                <div className="flex items-center justify-center h-32 text-text-muted font-body">
                    No CTA data available for this period
                </div>
            </div>
        );
    }

    return (
        <div className="card p-6">
            <h3 className="font-heading text-lg text-secondary-black mb-4">CTA Visibility</h3>
            <div className="space-y-4">
                {data.map((item) => (
                    <div key={item.name}>
                        <div className="flex justify-between text-sm mb-1">
                            <span className="font-body text-text-dark">{item.name}</span>
                            <span className="font-body text-text-muted">{item.count} views</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                            <div
                                className="bg-primary-red h-2 rounded-full transition-all duration-500"
                                style={{ width: `${maxCount > 0 ? (item.count / maxCount) * 100 : 0}%` }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
