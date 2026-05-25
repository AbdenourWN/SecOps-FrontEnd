"use client";

import { useServers } from "@/lib/hooks/use-servers";
import { cn, timeAgo } from "@/lib/utils";
import { useState } from "react";
import Link from "next/link";
import { Activity, Monitor } from "lucide-react";
import type { ServerResponse } from "@/lib/types";

type Filter = "all" | "failures";

function MetricBlock({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
        {label}
      </p>
      <p className="text-2xl font-black tabular-nums mb-2">{pct.toFixed(1)}%</p>
      <div className="h-1 rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            color,
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function ServerCard({ server }: { server: ServerResponse }) {
  // Tri-state status: online / reachable / offline (or unknown).
  // "reachable" = TCP works but credentials failed — distinct from offline.
  const isOffline = server.status === "offline";
  const isReachable = server.status === "reachable";
  const isOnline = server.status === "online";
  const incidentCount = server.open_incidents_count ?? 0;
  const hasIncident = incidentCount > 0;

  const cpu = server.last_metrics?.cpu_usage ?? 0;
  const ram = server.last_metrics?.ram_usage ?? 0;
  const disk = server.last_metrics?.disk_usage ?? 0;

  const pillClass = isOnline
    ? "border-success/40 text-success bg-success/10"
    : isReachable
      ? "border-amber-500/40 text-amber-400 bg-amber-500/10"
      : "border-danger/40 text-danger bg-danger/10";
  const dotClass = isOnline ? "bg-success" : isReachable ? "bg-amber-400" : "bg-danger";
  const pillLabel = isOnline ? "ONLINE" : isReachable ? "REACHABLE" : isOffline ? "OFFLINE" : "UNKNOWN";

  return (
    <Link
      href={`/servers/${server._id}`}
      className={cn(
        "block rounded-xl border p-5 transition-all hover:shadow-md",
        isOffline
          ? "border-danger/40 bg-danger/5"
          : isReachable
            ? "border-amber-500/40 bg-amber-500/5"
            : hasIncident
              ? "border-warning/40 bg-warning/5"
              : "border-border bg-green-700/10 hover:border-green-700/30",
      )}
    >
      {/* Header: icon + hostname/ip + status */}
      <div className="flex items-start justify-between gap-3 mb-5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 shrink-0 rounded-lg bg-muted/60 flex items-center justify-center">
            <Monitor className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold uppercase tracking-wide truncate">
              {server.hostname}
            </p>
            <p className="text-[11px] text-muted-foreground font-mono mt-0.5 truncate">
              {server.ip_address}
              <span className="mx-1.5 text-muted-foreground/50">|</span>
              <span className="capitalize">{server.os_type}</span>
            </p>
          </div>
        </div>
        <div className={cn("shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold", pillClass)}>
          {pillLabel}
          <span className={cn("h-1.5 w-1.5 rounded-full", dotClass)} />
        </div>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-3 gap-5 mb-4 max-[400px]:grid-cols-2">
        <MetricBlock
          label="CPU LOAD"
          value={cpu}
          color={cpu > 85 ? "bg-danger" : cpu > 65 ? "bg-warning" : "bg-primary"}
        />
        <MetricBlock
          label="RAM"
          value={ram}
          color={ram > 85 ? "bg-danger" : ram > 65 ? "bg-warning" : "bg-success"}
        />
        <MetricBlock
          label="DISK"
          value={disk}
          color={disk > 85 ? "bg-danger" : disk > 65 ? "bg-warning" : "bg-success"}
        />
      </div>
      <div className="flex items-center gap-1.5 text-muted-foreground my-2">
        <Activity className="h-4 w-4" />
        <span className="text-[10px] font-mono">
          last health checked: {timeAgo(server.last_health_check)}
        </span>
      </div>

      {/* Incident pill / clean state */}
      {hasIncident ? (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-danger/15 text-danger text-[10px] font-bold">
          {incidentCount} INCIDENT{incidentCount > 1 ? "S" : ""}
        </span>
      ) : (
        <p className="text-[11px] text-success font-semibold">
          No active incidents
        </p>
      )}
    </Link>
  );
}

export function ServerHealthGrid() {
  const { data: serversData, isLoading } = useServers({ page_size: 100 });
  const servers = serversData?.results ?? [];
  const [filter, setFilter] = useState<Filter>("all");

  const onlineCount = servers.filter((s) => s.status === "online").length;
  const reachableCount = servers.filter((s) => s.status === "reachable").length;
  const offlineCount = servers.filter((s) => s.status === "offline").length;

  const displayed = servers.filter((s) =>
    filter === "all"
      ? true
      : (s.status === "offline" || s.status === "reachable") || (s.open_incidents_count ?? 0) > 0,
  );

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-4 max-[400px]:flex-col gap-2 max-[400px]:text-center">
        <div>
          <h2 className="text-sm font-bold">Server Health Overview</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            <span className="text-success font-semibold">{onlineCount} online</span>
            {reachableCount > 0 && (
              <>
                {" · "}
                <span className="text-amber-400 font-semibold">{reachableCount} reachable</span>
              </>
            )}
            {offlineCount > 0 && (
              <>
                {" · "}
                <span className="text-danger font-semibold">{offlineCount} offline</span>
              </>
            )}
            {" · "}{servers.length} total
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-border p-0.5 text-xs">
          {(["all", "failures"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-1.5 rounded-md font-semibold capitalize transition-all",
                filter === f
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {f === "all" ? "All Nodes" : "Failures Only"}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 2xl:grid-cols-2 gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-48 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : displayed.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-2">
          <p className="text-sm text-success font-semibold">
            ✓ All systems operational
          </p>
          <p className="text-xs text-muted-foreground">No failures detected</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 2xl:grid-cols-2 gap-3">
          {displayed.map((server) => (
            <ServerCard key={server._id} server={server} />
          ))}
        </div>
      )}
    </div>
  );
}
