"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface WeeklyActivityChartProps {
  data: Array<{
    day: string;
    learned: number;
    reviewed: number;
  }>;
}

export function WeeklyActivityChart({ data }: WeeklyActivityChartProps) {
  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="learnGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="reviewGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#10B981" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="day" stroke="#64748b" />
          <YAxis stroke="#64748b" allowDecimals={false} />
          <Tooltip />
          <Area type="monotone" dataKey="learned" stroke="#3B82F6" fill="url(#learnGradient)" strokeWidth={2} />
          <Area type="monotone" dataKey="reviewed" stroke="#10B981" fill="url(#reviewGradient)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

