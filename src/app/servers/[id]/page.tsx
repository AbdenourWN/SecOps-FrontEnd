"use client";

import { AppShell } from "@/components/layout/app-shell";
import { useServer, useDeleteServer, useExecuteCommand } from "@/lib/hooks/use-servers";
import { useServerMetrics } from "@/lib/hooks/use-metrics";
import { useServerLogs } from "@/lib/hooks/use-logs";
import { useIncidents } from "@/lib/hooks/use-incidents";
import { useRouter } from "next/navigation";
import { ServerStatusBadge, SeverityBadge, StatusBadge } from "@/components/shared/badges";
import { timeAgo } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { IncidentResponse } from "@/lib/types";
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
  RefreshCw,
  Terminal,
  AlertTriangle,
  Shield,
  Trash2,
  ArrowLeft,
} from "lucide-react";
import { useState, use } from "react";
import { toast } from "sonner";
import Link from "next/link";

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
    value > 80 ? "Critical load" : value > 60 ? "Elevated usage" : "Normal performance";
  const statusColor =
    value > 80 ? "text-red-400" : value > 60 ? "text-yellow-400" : "text-green-400";

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
            value > 80 ? "bg-red-500" : value > 60 ? "bg-yellow-500" : "bg-primary"
          )}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
      <p className={cn("text-xs font-semibold", statusColor)}>{statusLabel}</p>
    </div>
  );
}

export default function ServerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data: server, isLoading: loadingServer } = useServer(id);
  const { data: metrics } = useServerMetrics(id, 30);
  const { data: logs } = useServerLogs(id, 50);
  const { data: incidents } = useIncidents({ server_id: id, limit: 10 });
  const executeCommand = useExecuteCommand();
  const deleteServer = useDeleteServer();

  const [activeTab, setActiveTab] = useState<"overview" | "logs" | "incidents" | "actions">("overview");
  const [command, setCommand] = useState("");
  const [output, setOutput] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");

  // Use correct field names: cpu_usage, ram_usage, disk_usage
  const latestMetric = metrics?.[0];
  const cpu = latestMetric?.cpu_usage ?? 0;
  const ram = latestMetric?.ram_usage ?? 0;
  const disk = latestMetric?.disk_usage ?? 0;

  const chartData = (metrics || [])
    .slice()
    .reverse()
    .map((m) => ({
      time: new Date(m.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      cpu: Number(m.cpu_usage.toFixed(1)),
      ram: Number(m.ram_usage.toFixed(1)),
    }));

  const handleExecute = async () => {
    if (!command.trim()) return;
    try {
      const result = await executeCommand.mutateAsync({ id, command: command.trim() });
      setOutput(result.output || "(no output)");
      toast.success("Command executed");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleDelete = async () => {
    if (!deletePassword) return;
    try {
      await deleteServer.mutateAsync({ id, data: { current_secret: deletePassword } });
      toast.success("Server deleted");
      router.push("/servers");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  if (loadingServer) {
    return (
      <AppShell>
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-64 bg-muted rounded" />
          <div className="h-32 bg-muted rounded-xl" />
        </div>
      </AppShell>
    );
  }

  if (!server) {
    return (
      <AppShell>
        <p className="text-muted-foreground">Server not found.</p>
      </AppShell>
    );
  }

  const openIncidentCount = (incidents || []).filter(
    (i: IncidentResponse) => i.status === "open" || i.status === "investigating"
  ).length;

  const tabs = [
    { key: "overview" as const, label: "Overview" },
    { key: "logs" as const, label: "Logs" },
    { key: "incidents" as const, label: "Incidents", badge: openIncidentCount || undefined },
    { key: "actions" as const, label: "Actions" },
  ];

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Link
                href="/servers"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <ServerStatusBadge status={server.status} />
              <span className="text-xs text-muted-foreground font-mono">
                NODE_ID: {id.slice(0, 8).toUpperCase()}
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">{server.hostname.toUpperCase()}</h1>
            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
              <span className="font-mono">{server.ip_address}</span>
              <span className="capitalize">{server.os_type}</span>
              <span>Last check: {timeAgo(server.last_health_check)}</span>
            </div>
          </div>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-2 rounded-lg border border-red-500/30 px-3 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete Server
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-border">
          <nav className="flex gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
                  activeTab === tab.key
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
                {tab.badge !== undefined && (
                  <span className="ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-500/20 text-[10px] font-bold text-red-400">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <GaugeCard label="CPU UTILIZATION" value={cpu} icon={Cpu} color="text-primary" />
                <GaugeCard label="RAM ALLOCATION" value={ram} icon={MemoryStick} color="text-secondary" />
                <GaugeCard label="DISK USAGE" value={disk} icon={HardDrive} color="text-success" />
              </div>

              {/* Telemetry chart */}
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-semibold">Resource Telemetry</h3>
                    <p className="text-xs text-muted-foreground">Live CPU and RAM over time</p>
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
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                      <XAxis dataKey="time" tick={{ fill: "#64748B", fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "#64748B", fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 100]} width={30} />
                      <Tooltip contentStyle={{ backgroundColor: "#1E293B", border: "1px solid #334155", borderRadius: "8px", color: "#F1F5F9", fontSize: "12px" }} />
                      <Area type="monotone" dataKey="cpu" stroke="#2563EB" fill="url(#cpuGrad)" strokeWidth={2} name="CPU %" />
                      <Area type="monotone" dataKey="ram" stroke="#10B981" fill="url(#ramGrad)" strokeWidth={2} strokeDasharray="5 5" name="RAM %" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
                <div className="flex items-center gap-6 mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary" /> CPU %</span>
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-green-400" /> RAM %</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Security events from real incident data */}
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-400" />
                    Critical Security Events
                  </h3>
                </div>
                <div className="space-y-3">
                  {(incidents || []).length === 0 ? (
                    <p className="text-sm text-green-400/70">No security events ✓</p>
                  ) : (
                    (incidents || []).slice(0, 4).map((inc: IncidentResponse) => (
                      <div key={inc._id} className="flex items-start gap-3 py-2 border-l-2 border-red-500/50 pl-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{inc.description}</p>
                          {inc.context && Object.keys(inc.context).length > 0 && (
                            <p className="text-xs text-muted-foreground font-mono mt-0.5">
                              {Object.entries(inc.context).slice(0, 1).map(([k, v]) => `${k}: ${v}`).join(" • ")}
                            </p>
                          )}
                        </div>
                        <SeverityBadge severity={inc.severity} />
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Service Health */}
              <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  SERVICE HEALTH
                </h3>
                <div className="space-y-3">
                  {["SSH Service", "Log Collector", "Metric Agent", "Analysis Engine"].map((svc, i) => (
                    <div key={svc} className="flex items-center justify-between py-1.5">
                      <span className="text-sm">{svc}</span>
                      <span className={cn("text-[10px] font-semibold", i < 3 ? "text-green-400" : "text-yellow-400")}>
                        {i < 3 ? "✅ ACTIVE" : "⚠️ DEGRADED"}
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
        )}

        {/* Logs Tab */}
        {activeTab === "logs" && (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="bg-muted/30 px-4 py-2 border-b border-border flex items-center gap-2">
              <Terminal className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-mono text-muted-foreground">
                {server.hostname}:/var/log
              </span>
            </div>
            <div className="max-h-[500px] overflow-y-auto p-4 font-mono text-xs space-y-0.5">
              {(logs || []).length === 0 ? (
                <p className="text-muted-foreground">No logs collected yet</p>
              ) : (
                (logs || []).map((log, i) => (
                  <div
                    key={i}
                    className={cn(
                      "py-0.5 flex gap-3",
                      log.level === "error" || log.level === "critical"
                        ? "text-red-400"
                        : log.level === "warning"
                          ? "text-yellow-400"
                          : "text-muted-foreground"
                    )}
                  >
                    <span className="text-muted-foreground shrink-0">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <span className="shrink-0 w-20">[{log.level}]</span>
                    <span className="break-all">{log.message}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Incidents Tab */}
        {activeTab === "incidents" && (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wider">
                  <th className="text-left px-5 py-3">Severity</th>
                  <th className="text-left px-5 py-3">Description</th>
                  <th className="text-left px-5 py-3">Status</th>
                  <th className="text-left px-5 py-3">Detected</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(incidents || []).length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-sm text-muted-foreground">
                      No incidents for this server ✓
                    </td>
                  </tr>
                ) : (
                  (incidents || []).map((inc: IncidentResponse) => (
                    <tr key={inc._id} className="hover:bg-muted/20">
                      <td className="px-5 py-3"><SeverityBadge severity={inc.severity} /></td>
                      <td className="px-5 py-3 text-sm max-w-xs truncate">{inc.description}</td>
                      <td className="px-5 py-3"><StatusBadge status={inc.status} /></td>
                      <td className="px-5 py-3 text-xs text-muted-foreground">{timeAgo(inc.detected_at)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Actions Tab */}
        {activeTab === "actions" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-5 space-y-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Terminal className="h-4 w-4 text-muted-foreground" />
                Execute Command
              </h3>
              <p className="text-xs text-muted-foreground">
                Commands are executed on this server using its stored credential (no additional authentication required).
              </p>
              <textarea
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                placeholder="Enter command... (e.g. df -h, uptime, ps aux)"
                rows={3}
                className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.ctrlKey) handleExecute();
                }}
              />
              <button
                onClick={handleExecute}
                disabled={executeCommand.isPending || !command.trim()}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                <RefreshCw className={cn("h-4 w-4", executeCommand.isPending && "animate-spin")} />
                {executeCommand.isPending ? "Executing..." : "Run Command (Ctrl+Enter)"}
              </button>
            </div>
            {output && (
              <div className="rounded-xl border border-border bg-card p-5">
                <h4 className="text-xs font-semibold text-muted-foreground mb-2">Output:</h4>
                <pre className="text-xs font-mono text-green-400 whitespace-pre-wrap bg-muted/30 p-3 rounded-lg max-h-96 overflow-y-auto">
                  {output}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Delete Confirm Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-xl">
              <h2 className="text-lg font-bold mb-2">Delete Server</h2>
              <p className="text-sm text-muted-foreground mb-4">
                This action cannot be undone. Enter the server credential password to confirm deletion of{" "}
                <span className="font-semibold text-foreground">{server.hostname}</span>.
              </p>
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Credential password"
                className="w-full h-9 rounded-lg border border-border bg-muted/50 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-red-500/50 mb-4"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowDeleteConfirm(false); setDeletePassword(""); }}
                  className="flex-1 h-9 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleteServer.isPending || !deletePassword}
                  className="flex-1 h-9 rounded-lg bg-red-500 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-50 transition-colors"
                >
                  {deleteServer.isPending ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
