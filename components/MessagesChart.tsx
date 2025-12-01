'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DataPoint {
  date: string;
  messages: number;
}

interface MessagesChartProps {
  data: DataPoint[];
}

export default function MessagesChart({ data }: MessagesChartProps) {
  const formattedData = data.map((item) => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    messages: item.messages,
  }));

  return (
    <div className="card p-6">
      <h3 className="font-heading text-lg text-secondary-black mb-4">Incoming Messages over Time</h3>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={formattedData}>
          <defs>
            <linearGradient id="colorMessages" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#000000" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#000000" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
          <XAxis 
            dataKey="date" 
            stroke="#9ca3af"
            style={{ fontSize: '12px' }}
          />
          <YAxis 
            stroke="#9ca3af"
            style={{ fontSize: '12px' }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#fff', 
              border: '1px solid #e5e5e5',
              borderRadius: '4px',
              fontSize: '12px'
            }}
          />
          <Area 
            type="monotone" 
            dataKey="messages" 
            stroke="#000000" 
            strokeWidth={2}
            fillOpacity={1} 
            fill="url(#colorMessages)" 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}


