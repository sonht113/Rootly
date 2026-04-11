"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface LeaderboardChartProps {
  data: Array<{
    username: string;
    metric_value: number;
  }>;
}

export function LeaderboardChart({ data }: LeaderboardChartProps) {
  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="username" stroke="#64748b" />
          <YAxis stroke="#64748b" allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="metric_value" radius={[10, 10, 0, 0]} fill="#3B82F6" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

