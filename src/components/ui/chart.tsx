// components/ui/chart.tsx
import { Tooltip, ResponsiveContainer, TooltipProps } from "recharts";
import { ReactNode } from "react";

export type ChartConfig = Record<string, { label: string; color: string }>;

import { ReactElement } from "react";

export function ChartContainer({
  children,
}: {
  children: ReactElement;
  config?: ChartConfig;
}) {
  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer>{children}</ResponsiveContainer>
    </div>
  );
}

export function ChartTooltip({
  content,
  ...props
}: TooltipProps<number, string> & {
  content: ReactNode;
}) {
  return <Tooltip {...props} content={content} />;
}

export function ChartTooltipContent({
  payload,
  hideLabel,
}: {
  payload?: Array<{
    payload: { month: string };
    name: string;
    value: string | number;
  }>;
  hideLabel?: boolean;
}) {
  if (!payload || payload.length === 0) return null;

  return (
    <div className="rounded-md border bg-background p-2 shadow-sm">
      {!hideLabel && (
        <div className="text-sm text-muted-foreground mb-1">
          {payload[0].payload.month}
        </div>
      )}
      {payload.map((entry, index) => (
        <div key={index} className="text-sm">
          {entry.name}: {entry.value}
        </div>
      ))}
    </div>
  );
}
