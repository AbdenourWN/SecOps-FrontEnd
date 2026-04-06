"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { format } from "date-fns";
import type { MetricResponse } from "@/lib/types";

interface MetricChartsProps {
  metrics: MetricResponse[];
}

export function MetricCharts({ metrics }: MetricChartsProps) {
  const data = [...metrics]
    .reverse()
    .map((m) => ({
      time: format(new Date(m.timestamp), "HH:mm"),
      cpu: m.cpu_usage,
      ram: m.ram_usage,
      disk: m.disk_usage,
    }));

  const charts = [
    { key: "cpu" as const, label: "CPU Usage", color: "#3b82f6" },
    { key: "ram" as const, label: "RAM Usage", color: "#8b5cf6" },
    { key: "disk" as const, label: "Disk Usage", color: "#f97316" },
  ];

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-dashed border-border py-12">
        <p className="text-sm text-muted-foreground">No metric data available</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {charts.map((chart) => (
        <Card key={chart.key}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{chart.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={data}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  formatter={(value) => [`${Number(value).toFixed(1)}%`, chart.label]}
                />
                <Area
                  type="monotone"
                  dataKey={chart.key}
                  stroke={chart.color}
                  fill={chart.color}
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
