'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { LocationBreakdown } from '@/types/analytics';

interface LocationBreakdownProps {
  data: LocationBreakdown;
}

function LocationCategory({
  title,
  locations,
  colors,
}: {
  title: string;
  locations: Record<string, number>;
  colors: string[];
}) {
  const chartData = Object.entries(locations).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
  }));

  const total = Object.values(locations).reduce((sum, val) => sum + val, 0);

  if (total === 0) {
    return (
      <div className="card p-6">
        <h4 className="font-heading text-lg text-secondary-black mb-4">{title}</h4>
        <div className="flex items-center justify-center h-64 text-text-muted font-body">
          No location data available
        </div>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <h4 className="font-heading text-lg text-secondary-black mb-4">{title}</h4>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
          <XAxis dataKey="name" stroke="#9ca3af" style={{ fontSize: '12px' }} />
          <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} allowDecimals={false} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e5e5',
              borderRadius: '4px',
              fontSize: '12px',
            }}
            formatter={(value: number) => [value, 'Clicks']}
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-4 grid grid-cols-3 gap-4 text-center">
        {chartData.map((item, index) => (
          <div key={item.name}>
            <p className="text-2xl font-heading text-secondary-black">{item.value}</p>
            <p className="text-xs text-text-muted font-body">{item.name}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LocationBreakdown({ data }: LocationBreakdownProps) {
  const rentColors = ['#ec2f2f', '#ef4444', '#f87171'];
  const investorColors = ['#ec2f2f', '#ef4444', '#f87171'];
  const ownerColors = ['#ec2f2f', '#ef4444', '#f87171'];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      <LocationCategory title="Rent Locations" locations={data.rent} colors={rentColors} />
      <LocationCategory title="Investor Locations" locations={data.investor} colors={investorColors} />
      <LocationCategory title="Owner Occupier Locations" locations={data.ownerOccupier} colors={ownerColors} />
    </div>
  );
}



