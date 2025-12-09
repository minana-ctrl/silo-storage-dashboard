'use client';

import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';

interface SatisfactionScoreProps {
    data: {
        average: number;
        trend: number[];
    };
}

export default function SatisfactionScore({ data }: SatisfactionScoreProps) {
    // Show dot for single data point, line for multiple
    const showDot = data.trend.length === 1;
    const trendData = data.trend.map((value, index) => ({ index, value }));

    return (
        <div className="card p-6">
            <h3 className="font-heading text-lg text-secondary-black mb-2">Customer Satisfaction</h3>
            <div className="flex items-end gap-4">
                <div>
                    <p className="text-4xl font-heading text-primary-red">{data.average.toFixed(1)}</p>
                    <p className="text-sm text-text-muted font-body">Average Score (1-5)</p>
                </div>
                {data.trend.length > 0 && (
                    <div className="h-16 w-32 pb-2">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={trendData}>
                                <Line
                                    type="monotone"
                                    dataKey="value"
                                    stroke="#ec2f2f"
                                    strokeWidth={2}
                                    dot={showDot}
                                />
                                <YAxis domain={[1, 5]} hide />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>
        </div>
    );
}
