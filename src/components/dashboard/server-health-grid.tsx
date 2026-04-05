"use client";

import { useServers } from "@/lib/hooks/use-servers";
import { useServerMetrics } from "@/lib/hooks/use-metrics";
import { cn } from "@/lib/utils";
import { useState } from "react";
import Link from "next/link";

type Filter = "all" | "failures";

function MetricBar({ value, color }: { value: number; color: string }) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] font-mono text-muted-foreground w-8 text-right">
        {pct.toFixed(0)}%
      </span>
    </div>
  );
}

function ServerCard({ server }: { server: ReturnType<typeof useServers>["data"] extends (infer T)[] | undefined ? T : never }) {
  const { data: metricsArray } = useServerMetrics(server._id, 1);
  const isOffline = server.status === "offline";
  const hasIncident = (server.open_incidents ?? 0) > 0;

  const latest = metricsArray?.[0];
  const cpu = latest?.cpu_usage ?? 0;
  const ram = latest?.ram_usage ?? 0;
  const disk = latest?.disk_usage ?? 0;

  return (
    <Link
      href={`/servers/${server._id}`}
      className={cn(
        "block rounded-xl border p-4 transition-all hover:shadow-md",
        isOffline
          ? "border-danger/40 bg-danger/5"
          : hasIncident
          ? "border-warning/40 bg-warning/5"
          : "border-border bg-card hover:border-primary/30"
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{server.hostname}</p>
          <p className="text-[10px] text-muted-foreground font-mono">{server.ip_address}</p>
        </div>
        <span
          className={cn(
            "shrink-0 ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full",
            isOffline
              ? "bg-danger/15 text-danger"
              : "bg-success/15 text-success"
          )}
        >
          {isOffline ? "OFFLINE" : "ONLINE"}
        </span>
      </div>

      {!isOffline && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1">
            <span className="w-8">CPU</span>
            <MetricBar value={cpu} color={cpu > 85 ? "bg-danger" : cpu > 65 ? "bg-warning" : "bg-primary"} />
          </div>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <span className="w-8">RAM</span>
            <MetricBar value={ram} color={ram > 85 ? "bg-danger" : ram > 65 ? "bg-warning" : "bg-secondary"} />
          </div>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <span className="w-8">DISK</span>
            <MetricBar value={disk} color={disk > 85 ? "bg-danger" : disk > 65 ? "bg-warning" : "bg-success"} />
          </div>
        </div>
      )}

      {hasIncident && !isOffline && (
        <p className="text-[10px] text-warning mt-2 font-semibold">
          ⚠ {server.open_incidents} active incident{(server.open_incidents ?? 0) > 1 ? "s" : ""}
        </p>
      )}
      {!hasIncident && !isOffline && (
        <p className="text-[10px] text-success mt-2 font-semibold">✓ No active incidents</p>
      )}
    </Link>
  );
}

export function ServerHealthGrid() {
  const { data: servers, isLoading } = useServers();
  const [filter, setFilter] = useState<Filter>("all");

  const displayed = (servers ?? []).filter((s) =>
    filter === "all" ? true : s.status === "offline" || (s.open_incidents ?? 0) > 0
  );

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-bold">Server Health Overview</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {(servers ?? []).filter((s) => s.status === "online").length} /{" "}
            {(servers ?? []).length} nodes online
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
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {f === "all" ? "All Nodes" : "Failures Only"}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : displayed.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-2">
          <p className="text-sm text-success font-semibold">✓ All systems operational</p>
          <p className="text-xs text-muted-foreground">No failures detected</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {displayed.map((server) => (
            <ServerCard key={server._id} server={server} />
          ))}
        </div>
      )}
    </div>
  );
}
