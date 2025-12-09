'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface ClickThroughChartProps {
    data: {
        rent: number;
        sales: number;
        ownerOccupier: number;
        investor: number;
    };
}

export default function ClickThroughChart({ data }: ClickThroughChartProps) {
    const chartData = [
        { name: 'Rent', value: data.rent, color: '#ec2f2f' },
        { name: 'Sales', value: data.sales, color: '#ef4444' },
        { name: 'Owner', value: data.ownerOccupier, color: '#f87171' },
        { name: 'Investor', value: data.investor, color: '#fca5a5' },
    ];

    const total = data.rent + data.sales + data.ownerOccupier + data.investor;

    if (total === 0) {
        return (
            <div className="card p-6">
                <h3 className="font-heading text-lg text-secondary-black mb-4">Click-Through by Category</h3>
                <div className="flex items-center justify-center h-[300px] text-text-muted font-body">
                    No click-through data available for this period
                </div>
            </div>
        );
    }

    return (
        <div className="card p-6">
            <h3 className="font-heading text-lg text-secondary-black mb-4">Click-Through by Category</h3>
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e5e5" />
                    <XAxis type="number" stroke="#9ca3af" style={{ fontSize: '12px' }} />
                    <YAxis
                        dataKey="name"
                        type="category"
                        stroke="#9ca3af"
                        style={{ fontSize: '12px' }}
                        width={80}
                    />
                    <Tooltip
                        cursor={{ fill: '#f3f4f6' }}
                        contentStyle={{
                            backgroundColor: '#fff',
                            border: '1px solid #e5e5e5',
                            borderRadius: '4px',
                            fontSize: '12px'
                        }}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
