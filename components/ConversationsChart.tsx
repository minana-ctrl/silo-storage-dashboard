'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DataPoint {
  date: string;
  conversations: number;
}

interface ConversationsChartProps {
  data: DataPoint[];
}

export default function ConversationsChart({ data }: ConversationsChartProps) {
  const formattedData = data.map((item) => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    conversations: item.conversations,
  }));

  return (
    <div className="card p-6">
      <h3 className="font-heading text-lg text-secondary-black mb-4">Conversations over Time</h3>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={formattedData}>
          <defs>
            <linearGradient id="colorConversations" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ec2f2f" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#ec2f2f" stopOpacity={0}/>
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
            dataKey="conversations" 
            stroke="#ec2f2f" 
            strokeWidth={2}
            fillOpacity={1} 
            fill="url(#colorConversations)" 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}


