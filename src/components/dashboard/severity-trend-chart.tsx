"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

// Mock data for 7-day trend (will be replaced with real API when available)
const mockTrendData = [
  { day: "MON", critical: 3, major: 8, minor: 12 },
  { day: "TUE", critical: 5, major: 6, minor: 15 },
  { day: "WED", critical: 2, major: 10, minor: 8 },
  { day: "THU", critical: 7, major: 5, minor: 11 },
  { day: "FRI", critical: 4, major: 9, minor: 14 },
  { day: "SAT", critical: 1, major: 3, minor: 6 },
  { day: "SUN", critical: 3, major: 7, minor: 9 },
];

export function SeverityTrendChart() {
  return (
    <div className="rounded-xl border border-border bg-card max-[400px]:px-2 px-5 py-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold max-[400px]:max-w-30">
          Incident Severity Trend (7 Days)
        </h3>
        <div className="flex items-center gap-4 text-xs max-[400px]:flex-col">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm bg-red-500" />
            CRITICAL
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm bg-orange-400" />
            MAJOR
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm bg-slate-400" />
            MINOR
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={mockTrendData}>
          <defs>
            <linearGradient id="critGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="majGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#FB923C" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#FB923C" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="minGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#94A3B8" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#94A3B8" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#334155"
            vertical={false}
          />
          <XAxis
            dataKey="day"
            tick={{ fill: "#64748B", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#64748B", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={30}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1E293B",
              border: "1px solid #334155",
              borderRadius: "8px",
              color: "#F1F5F9",
              fontSize: "12px",
            }}
          />
          <Area
            type="monotone"
            dataKey="critical"
            stroke="#EF4444"
            fill="url(#critGrad)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="major"
            stroke="#FB923C"
            fill="url(#majGrad)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="minor"
            stroke="#94A3B8"
            fill="url(#minGrad)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
