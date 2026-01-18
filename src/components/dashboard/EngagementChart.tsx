

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface EngagementChartProps {
  data: { date: string; likes: number; comments: number }[];
}

export function EngagementChart({ data }: EngagementChartProps) {
  // If no data, show a message or empty chart
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500 text-sm">
        No engagement data available
      </div>
    );
  }

  // Reverse data to show oldest to newest if the hook returns newest first
  // Our hook returns array from map.entries() which might not be ordered by date.
  // Actually, let's sort it by date to be sure.
  const sortedData = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Take only the last 14 days for cleaner view, or keep 30 if responsive
  // Let's show all but maybe format XAxis ticks
  
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={sortedData}
        margin={{
          top: 10,
          right: 10,
          left: -20,
          bottom: 0,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
        <XAxis 
          dataKey="date" 
          stroke="#71717a" 
          fontSize={10} 
          tickLine={false} 
          axisLine={false}
          interval={2} // Show every 3rd label to avoid clutter
        />
        <YAxis 
          stroke="#71717a" 
          fontSize={10} 
          tickLine={false} 
          axisLine={false} 
        />
        <Tooltip
          contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
          itemStyle={{ fontSize: '12px' }}
          labelStyle={{ color: '#a1a1aa', fontSize: '12px', marginBottom: '4px' }}
          cursor={{ fill: '#27272a', opacity: 0.5 }}
        />
        <Bar dataKey="likes" name="Likes" fill="#ec4899" radius={[4, 4, 0, 0]} stackId="a" />
        <Bar dataKey="comments" name="Comments" fill="#3b82f6" radius={[4, 4, 0, 0]} stackId="a" />
      </BarChart>
    </ResponsiveContainer>
  );
}
