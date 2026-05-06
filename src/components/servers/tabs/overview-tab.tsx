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
import {
  Cpu,
  HardDrive,
  MemoryStick,
  AlertTriangle,
  Shield,
  Clock,
  Settings2,
  Activity,
  CalendarDays,
} from "lucide-react";
import { SeverityBadge } from "@/components/shared/badges";
import { useServerMetrics } from "@/lib/hooks/use-metrics";
import { cn, timeAgo } from "@/lib/utils";
import type {
  IncidentResponse,
  ServerResponse,
  DetectionConfig,
} from "@/lib/types";

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const DETECTION_FIELDS: {
  key: keyof DetectionConfig;
  label: string;
  unit: string;
  default: number | boolean;
}[] = [
  {
    key: "verification_window_minutes",
    label: "Verification window",
    unit: "min",
    default: 10,
  },
  {
    key: "max_remediation_attempts",
    label: "Max remediation attempts",
    unit: "attempts",
    default: 3,
  },
  {
    key: "incident_lookback_minutes",
    label: "Dedup lookback",
    unit: "min",
    default: 30,
  },
  {
    key: "recurrence_streak_threshold",
    label: "Recurrence streak",
    unit: "cycles",
    default: 3,
  },
  {
    key: "recurrence_lookback_hours",
    label: "Recurrence lookback",
    unit: "hrs",
    default: 2,
  },
  {
    key: "volume_spike_multiplier",
    label: "Volume spike multiplier",
    unit: "×",
    default: 10,
  },
  {
    key: "anomaly_dedup_window_hours",
    label: "Anomaly Dedup Window Hours",
    unit: "hrs",
    default: 2,
  },
  {
    key: "anomaly_suppression_ttl_hours",
    label: "Anomaly Suppression TTL Hours",
    unit: "hrs",
    default: 24,
  },
  {
    key: "anomaly_auto_promote",
    label: "Anomaly Auto Promote",
    unit: "",
    default: false,
  },
];

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
  server: ServerResponse;
}

export function OverviewTab({ serverId, incidents, server }: OverviewTabProps) {
  const isWindows = server.os_type === "windows";
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

  const dc = server.detection_config;
  const bh = server.business_hours;

  const warmupActive =
    server.pattern_warmup_until &&
    new Date(server.pattern_warmup_until) > new Date();

  return (
    <div className="space-y-6">
      {/* Row 1: Gauges + Chart */}
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
                  formatter={(value, name) => [
                    `${Number(value).toFixed(1)}%`,
                    name,
                  ]}
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

      {/* Row 2: Security Events + Service Health */}
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
              <p className="text-sm text-green-400/70">No security events ✓</p>
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
                  { label: "WinRM Service", active: true },
                  { label: "Windows Event Log", active: true },
                  { label: "Performance Counters", active: true },
                  { label: "Analysis Engine", active: false },
                ]
              : [
                  { label: "SSH Service", active: true },
                  { label: "Log Collector", active: true },
                  { label: "Metric Agent", active: true },
                  { label: "Analysis Engine", active: false },
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

      {/* Row 3: Business Hours + Anomaly State */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            BUSINESS HOURS
          </h3>
          {bh ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold mb-0.5">
                    Operating Hours
                  </p>
                  <p className="text-sm font-semibold font-mono">
                    {bh.start} – {bh.end}{" "}
                    <span className="text-muted-foreground font-sans font-normal text-xs">
                      UTC
                    </span>
                  </p>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold mb-2">
                  Active Days
                </p>
                <div className="flex gap-1.5 flex-wrap">
                  {DAY_NAMES.map((name, i) => {
                    const day = i + 1;
                    const active = bh.days.includes(day);
                    return (
                      <span
                        key={name}
                        className={cn(
                          "px-2.5 py-1 text-[11px] font-bold rounded-md border transition-colors",
                          active
                            ? "bg-primary/15 text-primary border-primary/30"
                            : "bg-muted/30 text-muted-foreground/40 border-border/40",
                        )}
                      >
                        {name}
                      </span>
                    );
                  })}
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Off-hours activity outside this window increases anomaly scores
                for time-of-day heuristics.
              </p>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground space-y-1">
              <p>Not configured</p>
              <p className="text-xs">
                All hours treated equally — time-of-day anomaly heuristic is
                inactive.
              </p>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            ANOMALY DETECTION STATE
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-1.5 border-b border-border/60">
              <span className="text-xs text-muted-foreground uppercase tracking-wider font-bold">
                Pattern Warm-up
              </span>
              {server.pattern_warmup_until ? (
                <span
                  className={cn(
                    "text-xs font-semibold",
                    warmupActive ? "text-yellow-400" : "text-green-400",
                  )}
                >
                  {warmupActive
                    ? `Active · ends ${timeAgo(server.pattern_warmup_until)}`
                    : "Complete"}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">Not set</span>
              )}
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-border/60">
              <span className="text-xs text-muted-foreground uppercase tracking-wider font-bold">
                Log Rate Baseline
              </span>
              <span className="text-xs font-semibold font-mono">
                {server.log_rate_baseline != null
                  ? `${server.log_rate_baseline.toFixed(2)} logs/min`
                  : "Not calibrated"}
              </span>
            </div>
            {server.log_rate_updated_at && (
              <div className="flex items-center justify-between py-1.5">
                <span className="text-xs text-muted-foreground uppercase tracking-wider font-bold">
                  Baseline Updated
                </span>
                <span className="text-xs text-muted-foreground">
                  {timeAgo(server.log_rate_updated_at)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Row 4: Detection Config */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-muted-foreground" />
          DETECTION CONFIGURATION
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {DETECTION_FIELDS.map((field) => {
            const effective = dc?.[field.key] ?? field.default;
            const isCustom =
              dc?.[field.key] != null && dc[field.key] !== field.default;
            return (
              <div
                key={field.key}
                className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-1"
              >
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {field.label}
                </p>
                <div className="flex items-end gap-1.5">
                  <span className="text-xl font-bold tabular-nums">
                    {typeof effective === "number"
                      ? Number.isInteger(effective)
                        ? effective
                        : effective.toFixed(2)
                      : effective.toString()}
                  </span>
                  <span className="text-xs text-muted-foreground mb-0.5">
                    {field.unit}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {isCustom ? (
                    <span className="text-primary font-semibold">
                      Custom (default: {field.default.toString()} {field.unit})
                    </span>
                  ) : (
                    <span>Default</span>
                  )}
                </p>
              </div>
            );
          })}
        </div>
        {!dc && (
          <p className="text-xs text-muted-foreground mt-3">
            All values are global defaults. Edit this server to customize
            detection behaviour.
          </p>
        )}
      </div>
    </div>
  );
}
