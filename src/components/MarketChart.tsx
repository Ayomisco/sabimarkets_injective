"use client";

import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

interface ChartProps {
  currentYesPrice: number;
  yesTokenId?: string;
}

export default function MarketChart({ currentYesPrice, yesTokenId }: ChartProps) {
  const [data, setData] = useState<{date: string, Yes: number, No: number}[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      generateMockData();
    }

    function generateMockData() {
        const points = [];
        let currentVal = currentYesPrice * 100;
        for (let i = 30; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const noise = (Math.random() - 0.5) * 8;
            let yesPrice = currentVal + noise;
            yesPrice = Math.max(1, Math.min(99, yesPrice));
            if (i === 0) yesPrice = currentYesPrice * 100; 
            points.push({
                date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                Yes: yesPrice,
                No: 100 - yesPrice,
            });
            currentVal = yesPrice;
        }
        setData(points);
        setLoading(false);
    }

    fetchHistory();
  }, [yesTokenId, currentYesPrice]);

  if (loading) {
     return <div className="w-full h-full flex items-center justify-center font-mono text-sm text-[#A69C8A] animate-pulse">Loading Live Chart...</div>;
  }

  return (
    <div className="w-full h-[300px] min-h-[300px] -ml-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="4 4" stroke="#3D2E1E" vertical={false} />
          
          <XAxis 
            dataKey="date" 
            stroke="#A69C8A" 
            fontSize={11} 
            tickLine={false} 
            axisLine={false}
            minTickGap={30}
            dy={10}
          />
          
          <YAxis 
            stroke="#A69C8A" 
            fontSize={11} 
            tickLine={false} 
            axisLine={false}
            tickFormatter={(value) => `${Math.round(value)}%`}
            domain={[0, 100]}
            dx={-10}
          />
          
          <Tooltip 
             contentStyle={{ 
                 backgroundColor: '#110F0D', 
                 borderColor: '#3D2E1E', 
                 borderRadius: '12px', 
                 color: '#fff',
                 fontFamily: 'monospace',
                 boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
             }}
             itemStyle={{ fontWeight: 'bold' }}
             formatter={(value: any, name: any) => [
                 `${Number(value).toFixed(1)}¢`, 
                 name
             ]}
             labelStyle={{ color: '#A69C8A', marginBottom: '8px' }}
          />

          <Line 
            type="monotone" 
            dataKey="Yes" 
            stroke="#00C566" 
            strokeWidth={3} 
            dot={false}
            activeDot={{ r: 6, fill: '#00C566', stroke: '#0B0A08', strokeWidth: 3 }}
            animationDuration={1500}
          />
          
          <Line 
            type="monotone" 
            dataKey="No" 
            stroke="#E8333A" 
            strokeWidth={3} 
            dot={false}
            activeDot={{ r: 6, fill: '#E8333A', stroke: '#0B0A08', strokeWidth: 3 }}
            animationDuration={1500}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
