"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

export function TimeSeriesChart({
  data,
  config,
  dataKeys,
}: {
  data: Record<string, string | number>[];
  config: ChartConfig;
  dataKeys: string[];
}) {
  return (
    <ChartContainer config={config} className="h-64 w-full">
      <AreaChart data={data} margin={{ left: -20, right: 12, top: 8 }}>
        <defs>
          {dataKeys.map((key) => (
            <linearGradient key={key} id={`fill-${key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={`var(--color-${key})`} stopOpacity={0.4} />
              <stop offset="95%" stopColor={`var(--color-${key})`} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
        <YAxis tickLine={false} axisLine={false} fontSize={12} width={40} />
        <ChartTooltip content={<ChartTooltipContent />} />
        {dataKeys.map((key) => (
          <Area key={key} dataKey={key} type="monotone" fill={`url(#fill-${key})`} stroke={`var(--color-${key})`} strokeWidth={2} />
        ))}
      </AreaChart>
    </ChartContainer>
  );
}
