"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";

import type { RankingActivityPoint } from "@/types/domain";

interface RankingActivityComparisonChartProps {
  data: RankingActivityPoint[];
}

export function RankingActivityComparisonChart({ data }: RankingActivityComparisonChartProps) {
  return (
    <div className="h-[160px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barCategoryGap={14}>
          <XAxis
            axisLine={false}
            dataKey="label"
            tickLine={false}
            tick={{ fill: "#42475499", fontSize: 10, fontWeight: 700 }}
          />
          <Tooltip
            cursor={{ fill: "transparent" }}
            content={({ active, payload, label }) => {
              if (!active || !payload || payload.length === 0) {
                return null;
              }

              const yourReviews = Number(payload[0]?.value ?? 0);
              const topAverage = Number(payload[1]?.value ?? 0);

              return (
                <div className="rounded-[14px] border border-[color:var(--border)] bg-white px-3 py-2 shadow-[var(--shadow-soft)]">
                  <p className="text-xs font-bold text-[#191c1e]">{label}</p>
                  <p className="text-xs text-[#0058be]">Bạn: {formatChartNumber(yourReviews)}</p>
                  <p className="text-xs text-[#727785]">Top 10: {formatChartNumber(topAverage)}</p>
                </div>
              );
            }}
          />
          <Bar dataKey="yourReviews" fill="#0058be" radius={[999, 999, 999, 999]} maxBarSize={10} />
          <Bar dataKey="top10AverageReviews" fill="#e0e3e5" radius={[999, 999, 999, 999]} maxBarSize={10} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function formatChartNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
