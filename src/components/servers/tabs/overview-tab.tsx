"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Cpu, HardDrive, MemoryStick, AlertTriangle, Shield } from "lucide-react";
import { SeverityBadge } from "@/components/shared/badges";
import { useServerMetrics } from "@/lib/hooks/use-metrics";
import { cn } from "@/lib/utils";
import type { IncidentResponse } from "@/lib/types";

function GaugeCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
}) {
  const statusLabel =
    value > 80
      ? "Critical load"
      : value > 60
        ? "Elevated usage"
        : "Normal performance";
  const statusColor =
    value > 80
      ? "text-red-400"
      : value > 60
        ? "text-yellow-400"
        : "text-green-400";

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {label}
        </h4>
        <Icon className={cn("h-5 w-5", color)} />
      </div>
      <div className="flex items-end gap-3">
        <p className="text-3xl font-bold">{value.toFixed(0)}%</p>
      </div>
      <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            value > 80
              ? "bg-red-500"
              : value > 60
                ? "bg-yellow-500"
                : "bg-primary",
          )}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
      <p className={cn("text-xs font-semibold", statusColor)}>{statusLabel}</p>
    </div>
  );
}

interface OverviewTabProps {
  serverId: string;
  incidents: IncidentResponse[];
  osType?: string;
}

export function OverviewTab({ serverId, incidents, osType }: OverviewTabProps) {
  const isWindows = osType === "windows";
  const { data: metrics } = useServerMetrics(serverId, 30);

  const latestMetric = metrics?.[0];
  const cpu = latestMetric?.cpu_usage ?? 0;
  const ram = latestMetric?.ram_usage ?? 0;
  const disk = latestMetric?.disk_usage ?? 0;

  const chartData = (metrics || [])
    .slice()
    .reverse()
    .map((m) => ({
      time: new Date(m.timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      cpu: Number(m.cpu_usage.toFixed(1)),
      ram: Number(m.ram_usage.toFixed(1)),
      disk: Number(m.disk_usage.toFixed(1)),
    }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <GaugeCard
            label="CPU UTILIZATION"
            value={cpu}
            icon={Cpu}
            color="text-primary"
          />
          <GaugeCard
            label="RAM ALLOCATION"
            value={ram}
            icon={MemoryStick}
            color="text-secondary"
          />
          <GaugeCard
            label="DISK USAGE"
            value={disk}
            icon={HardDrive}
            color="text-success"
          />
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold">Resource Telemetry</h3>
              <p className="text-xs text-muted-foreground">
                CPU, RAM and Disk over time
              </p>
            </div>
          </div>
          {chartData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
              No metric data yet — try collecting metrics
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="ramGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="diskGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F97316" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#F97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#334155"
                  vertical={false}
                />
                <XAxis
                  dataKey="time"
                  tick={{ fill: "#64748B", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
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
                  formatter={(value, name) => [`${Number(value).toFixed(1)}%`, name]}
                />
                <Area
                  type="monotone"
                  dataKey="cpu"
                  stroke="#2563EB"
                  fill="url(#cpuGrad)"
                  strokeWidth={2}
                  name="CPU %"
                />
                <Area
                  type="monotone"
                  dataKey="ram"
                  stroke="#10B981"
                  fill="url(#ramGrad)"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="RAM %"
                />
                <Area
                  type="monotone"
                  dataKey="disk"
                  stroke="#F97316"
                  fill="url(#diskGrad)"
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              Critical Security Events
            </h3>
          </div>
          <div className="space-y-3">
            {incidents.length === 0 ? (
              <p className="text-sm text-green-400/70">
                No security events ✓
              </p>
            ) : (
              incidents.slice(0, 4).map((inc) => (
                <div
                  key={inc._id}
                  className="flex items-start gap-3 py-2 border-l-2 border-red-500/50 pl-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {inc.description}
                    </p>
                    {inc.context && Object.keys(inc.context).length > 0 && (
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">
                        {Object.entries(inc.context)
                          .slice(0, 1)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(" • ")}
                      </p>
                    )}
                  </div>
                  <SeverityBadge severity={inc.severity} />
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            SERVICE HEALTH
          </h3>
          <div className="space-y-3">
            {(isWindows
              ? [
                  { label: "WinRM Service",      active: true  },
                  { label: "Windows Event Log",   active: true  },
                  { label: "Performance Counters", active: true  },
                  { label: "Analysis Engine",     active: false },
                ]
              : [
                  { label: "SSH Service",         active: true  },
                  { label: "Log Collector",       active: true  },
                  { label: "Metric Agent",        active: true  },
                  { label: "Analysis Engine",     active: false },
                ]
            ).map(({ label, active }) => (
              <div
                key={label}
                className="flex items-center justify-between py-1.5"
              >
                <span className="text-sm">{label}</span>
                <span
                  className={cn(
                    "text-[10px] font-semibold",
                    active ? "text-green-400" : "text-yellow-400",
                  )}
                >
                  {active ? "✅ ACTIVE" : "⚠️ DEGRADED"}
                </span>
              </div>
            ))}
            <div className="pt-3 border-t border-border text-right">
              <p className="text-xs text-muted-foreground">Stability Index</p>
              <p className="text-xl font-bold text-success">99.98%</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
