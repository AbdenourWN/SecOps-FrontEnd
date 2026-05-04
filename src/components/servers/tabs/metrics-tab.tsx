"use client";

import { useState, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Cpu, HardDrive, MemoryStick, TrendingUp, BarChart3 } from "lucide-react";
import { useServerMetricsHistory } from "@/lib/hooks/use-metrics";
import { cn } from "@/lib/utils";

const QUICK_RANGES = [
  { key: "1h",  label: "1H",  ms: 3_600_000 },
  { key: "6h",  label: "6H",  ms: 21_600_000 },
  { key: "24h", label: "24H", ms: 86_400_000 },
  { key: "7d",  label: "7D",  ms: 604_800_000 },
] as const;

type QuickRange = (typeof QUICK_RANGES)[number]["key"] | "custom";

function pct(v: number) {
  return `${v.toFixed(1)}%`;
}

function colorForValue(v: number) {
  return v > 80 ? "text-red-400" : v > 60 ? "text-yellow-400" : "";
}

interface MetricsTabProps {
  serverId: string;
}

export function MetricsTab({ serverId }: MetricsTabProps) {
  const [quickRange, setQuickRange] = useState<QuickRange>("24h");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const { fromIso, toIso } = useMemo(() => {
    if (quickRange === "custom") {
      return {
        fromIso: fromDate ? `${fromDate}T00:00:00.000Z` : undefined,
        toIso: toDate ? `${toDate}T23:59:59.999Z` : undefined,
      };
    }
    const rng = QUICK_RANGES.find((r) => r.key === quickRange)!;
    const now = new Date();
    return {
      fromIso: new Date(now.getTime() - rng.ms).toISOString(),
      toIso: now.toISOString(),
    };
  }, [quickRange, fromDate, toDate]);

  const { data: metrics = [], isLoading } = useServerMetricsHistory(serverId, {
    limit: 1000,
    fromDate: fromIso,
    toDate: toIso,
  });

  const chartData = useMemo(
    () =>
      [...metrics].reverse().map((m) => ({
        time: new Date(m.timestamp).toLocaleString([], {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        cpu: Number(m.cpu_usage.toFixed(1)),
        ram: Number(m.ram_usage.toFixed(1)),
        disk: Number(m.disk_usage.toFixed(1)),
      })),
    [metrics],
  );

  const stats = useMemo(() => {
    if (!metrics.length) return null;
    const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
    const cpu = metrics.map((m) => m.cpu_usage);
    const ram = metrics.map((m) => m.ram_usage);
    const disk = metrics.map((m) => m.disk_usage);
    return {
      cpu:  { avg: avg(cpu),  max: Math.max(...cpu),  min: Math.min(...cpu)  },
      ram:  { avg: avg(ram),  max: Math.max(...ram),  min: Math.min(...ram)  },
      disk: { avg: avg(disk), max: Math.max(...disk), min: Math.min(...disk) },
    };
  }, [metrics]);

  return (
    <div className="space-y-5">
      {/* Filter bar */}
      <div className="rounded-xl border border-border bg-card/50 p-4 flex flex-col sm:flex-row items-end gap-4 flex-wrap">
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">
            Time Range
          </label>
          <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-lg border border-border">
            {QUICK_RANGES.map((r) => (
              <button
                key={r.key}
                onClick={() => setQuickRange(r.key)}
                className={cn(
                  "px-3 py-1.5 text-xs font-bold rounded-md transition-all",
                  quickRange === r.key
                    ? "bg-card shadow-sm text-foreground border border-border"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {r.label}
              </button>
            ))}
            <button
              onClick={() => setQuickRange("custom")}
              className={cn(
                "px-3 py-1.5 text-xs font-bold rounded-md transition-all",
                quickRange === "custom"
                  ? "bg-card shadow-sm text-foreground border border-border"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Custom
            </button>
          </div>
        </div>

        {quickRange === "custom" && (
          <div className="flex items-end gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">
                From
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="px-3 py-2 rounded-lg bg-background border border-border text-sm focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">
                To
              </label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="px-3 py-2 rounded-lg bg-background border border-border text-sm focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              />
            </div>
          </div>
        )}

        <div className="ml-auto self-center text-xs text-muted-foreground">
          {isLoading ? (
            <span className="animate-pulse">Loading…</span>
          ) : (
            <span>
              <span className="font-semibold text-foreground">{metrics.length}</span>{" "}
              data points
            </span>
          )}
        </div>
      </div>

      {/* Stats summary */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {(
            [
              { label: "CPU",  color: "blue",   data: stats.cpu,  icon: Cpu },
              { label: "RAM",  color: "green",  data: stats.ram,  icon: MemoryStick },
              { label: "Disk", color: "orange", data: stats.disk, icon: HardDrive },
            ] as const
          ).map(({ label, data, icon: Icon }) => (
            <div
              key={label}
              className="rounded-xl border border-border bg-card p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {label}
                </span>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                {(
                  [
                    { sub: "AVG", val: data.avg },
                    { sub: "MAX", val: data.max },
                    { sub: "MIN", val: data.min },
                  ] as const
                ).map(({ sub, val }) => (
                  <div key={sub}>
                    <p className="text-[10px] text-muted-foreground mb-0.5">{sub}</p>
                    <p
                      className={cn(
                        "text-lg font-bold tabular-nums",
                        sub === "MAX" ? colorForValue(val) : "",
                      )}
                    >
                      {pct(val)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Chart */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              Resource History
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              CPU, RAM and Disk over the selected time window
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="h-72 flex items-center justify-center">
            <span className="animate-pulse text-sm text-muted-foreground">
              Loading metrics…
            </span>
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-72 flex flex-col items-center justify-center text-muted-foreground">
            <TrendingUp className="h-8 w-8 mb-3 opacity-20" />
            <p className="text-sm">No metric data in this time range</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={288}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="mCpuGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="mRamGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="mDiskGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F97316" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#F97316" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis
                dataKey="time"
                tick={{ fill: "#64748B", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: "#64748B", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                domain={[0, 100]}
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
                formatter={(value, name) => [
                  `${Number(value).toFixed(1)}%`,
                  name,
                ]}
                labelStyle={{ color: "#94A3B8", marginBottom: "4px" }}
              />
              <Area
                type="monotone"
                dataKey="cpu"
                stroke="#2563EB"
                fill="url(#mCpuGrad)"
                strokeWidth={2}
                name="CPU %"
              />
              <Area
                type="monotone"
                dataKey="ram"
                stroke="#10B981"
                fill="url(#mRamGrad)"
                strokeWidth={2}
                strokeDasharray="5 5"
                name="RAM %"
              />
              <Area
                type="monotone"
                dataKey="disk"
                stroke="#F97316"
                fill="url(#mDiskGrad)"
                strokeWidth={2}
                strokeDasharray="2 4"
                name="Disk %"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}

        <div className="flex items-center gap-6 mt-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-blue-500" /> CPU %
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-green-400" /> RAM %
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-orange-400" /> Disk %
          </span>
        </div>
      </div>

      {/* Raw data table */}
      {metrics.length > 0 && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="bg-muted/30 px-4 py-2.5 border-b border-border flex items-center justify-between">
            <span className="text-xs font-mono font-semibold text-muted-foreground">
              RAW READINGS
            </span>
            <span className="text-xs text-muted-foreground">
              {metrics.length} records
            </span>
          </div>
          <div className="overflow-auto max-h-72">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Timestamp
                  </th>
                  <th className="text-right px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    CPU %
                  </th>
                  <th className="text-right px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    RAM %
                  </th>
                  <th className="text-right px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Disk %
                  </th>
                </tr>
              </thead>
              <tbody>
                {metrics.map((m, i) => (
                  <tr
                    key={m._id ?? i}
                    className="border-b border-border/40 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-2 font-mono text-muted-foreground">
                      {new Date(m.timestamp).toLocaleString()}
                    </td>
                    <td
                      className={cn(
                        "px-4 py-2 text-right font-semibold tabular-nums",
                        colorForValue(m.cpu_usage),
                      )}
                    >
                      {pct(m.cpu_usage)}
                    </td>
                    <td
                      className={cn(
                        "px-4 py-2 text-right font-semibold tabular-nums",
                        colorForValue(m.ram_usage),
                      )}
                    >
                      {pct(m.ram_usage)}
                    </td>
                    <td
                      className={cn(
                        "px-4 py-2 text-right font-semibold tabular-nums",
                        colorForValue(m.disk_usage),
                      )}
                    >
                      {pct(m.disk_usage)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
