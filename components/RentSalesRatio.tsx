'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface RentSalesRatioProps {
    data: {
        tenant: number;
        sales: number;
        investor: number;
        owneroccupier: number;
    };
}

export default function RentSalesRatio({ data }: RentSalesRatioProps) {
    const total = data.tenant + data.sales;
    
    const chartData = [
        { name: 'Rent (Tenant)', value: data.tenant },
        { name: 'Sales', value: data.sales },
    ];

    const COLORS = ['#ec2f2f', '#fca5a5'];

    if (total === 0) {
        return (
            <div className="card p-6">
                <h3 className="font-heading text-lg text-secondary-black mb-4">Rent vs Sales Ratio</h3>
                <div className="flex items-center justify-center h-[300px] text-text-muted font-body">
                    No rent/sales data available for this period
                </div>
            </div>
        );
    }

    return (
        <div className="card p-6">
            <h3 className="font-heading text-lg text-secondary-black mb-4">Rent vs Sales Ratio</h3>
            <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            fill="#8884d8"
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#fff',
                                border: '1px solid #e5e5e5',
                                borderRadius: '4px',
                                fontSize: '12px'
                            }}
                        />
                        <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
