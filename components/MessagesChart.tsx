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
  // Determine if we're showing single day or multi-day data
  const isSingleDay = data.length === 1;
  
  const formattedData = data.map((item, index) => {
    const date = new Date(item.date);
    let label: string;
    
    if (isSingleDay) {
      // For single day, show just the date
      label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } else if (data.length <= 7) {
      // For short ranges, show day of week + date
      label = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    } else {
      // For longer ranges, show just month and day
      label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    
    return {
      date: label,
      messages: item.messages,
      rawDate: item.date,
    };
  });

  // If no data, show empty state
  if (data.length === 0) {
    return (
      <div className="card p-6">
        <h3 className="font-heading text-lg text-secondary-black mb-4">Incoming Messages over Time</h3>
        <div className="flex items-center justify-center h-[300px] text-text-muted font-body">
          No data available for this period
        </div>
      </div>
    );
  }

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
            angle={data.length > 10 ? -45 : 0}
            textAnchor={data.length > 10 ? 'end' : 'middle'}
            height={data.length > 10 ? 80 : 30}
          />
          <YAxis 
            stroke="#9ca3af"
            style={{ fontSize: '12px' }}
            allowDecimals={false}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#fff', 
              border: '1px solid #e5e5e5',
              borderRadius: '4px',
              fontSize: '12px'
            }}
            formatter={(value: number) => [value, 'Messages']}
          />
          <Area 
            type="monotone" 
            dataKey="messages" 
            stroke="#000000" 
            strokeWidth={2}
            fillOpacity={1} 
            fill="url(#colorMessages)"
            dot={isSingleDay}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}



