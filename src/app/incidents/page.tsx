"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { useIncidents, useIncidentStats } from "@/lib/hooks/use-incidents";
import { useServers } from "@/lib/hooks/use-servers";
import { Shield, AlertTriangle, CheckCircle, Flame, Search, Activity } from "lucide-react";
import { timeAgo, cn } from "@/lib/utils";
import Link from "next/link";
import type { SeverityLevel, IncidentStatus } from "@/lib/types";

const PAGE_SIZE = 10;

export default function IncidentsPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [filterSeverity, setFilterSeverity] = useState<SeverityLevel | "all">("all");
  const [filterStatus, setFilterStatus] = useState<IncidentStatus | "all">("all");
  const [page, setPage] = useState(1);

  const setSeverityAndReset = (v: SeverityLevel | "all") => { setFilterSeverity(v); setPage(1); };
  const setStatusAndReset = (v: IncidentStatus | "all") => { setFilterStatus(v); setPage(1); };
  const executeSearch = () => { setSearch(searchInput); setPage(1); };

  const { data: stats } = useIncidentStats();
  const { data: serversData } = useServers({ page_size: 100 });
  const servers = serversData?.results ?? [];

  const { data, isLoading } = useIncidents({
    severity: filterSeverity === "all" ? undefined : filterSeverity,
    status: filterStatus === "all" ? undefined : filterStatus,
    search: search || undefined,
    page,
    page_size: PAGE_SIZE,
  });

  const incidents = data?.results ?? [];
  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 1;

  return (
    <AppShell>
      <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-danger/10 text-danger text-xs font-bold mb-4 border border-danger/20">
              <Shield className="h-3.5 w-3.5" />
              THREAT INTELLIGENCE
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
              Security Incidents
            </h1>
            <p className="text-muted-foreground mt-2 max-w-xl leading-relaxed">
              Real-time threat detections matching custom SecOps rules. Investigate and remediate anomalies instantly.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && executeSearch()}
                placeholder="Search signatures..."
                className="pl-9 pr-4 py-2.5 rounded-xl bg-card border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all text-sm shadow-sm outline-none w-64"
              />
            </div>
            <button
              onClick={executeSearch}
              className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold shadow-sm hover:bg-primary/90 transition-all"
            >
              Search
            </button>
          </div>
        </div>

        {/* Global Impact Dashboard */}
        <div className="rounded-3xl border border-border bg-card/30 backdrop-blur-md p-6 lg:p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-danger/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-6 flex items-center gap-2">
            <Activity className="h-4 w-4" /> Global Impact Summary
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-[10px] uppercase font-bold text-danger mb-2">Critical Assets Impacted</p>
              <p className="text-3xl font-black">{stats?.by_severity?.critical || 0}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-orange-500 mb-2">High Severity Events</p>
              <p className="text-3xl font-black">{stats?.by_severity?.high || 0}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-warning mb-2">Active Investigations</p>
              <p className="text-3xl font-black">{stats?.by_status?.investigating || 0}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-success mb-2">Resolved Threats</p>
              <p className="text-3xl font-black">{stats?.by_status?.resolved || 0}</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 pb-4">
          <div className="flex items-center gap-2 bg-muted/30 p-1 rounded-xl border border-border">
            {(["all", "critical", "high", "medium", "low"] as const).map((sev) => (
              <button
                key={sev}
                onClick={() => setSeverityAndReset(sev)}
                className={cn(
                  "px-4 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all",
                  filterSeverity === sev
                    ? "bg-card shadow-sm text-foreground border border-border"
                    : "text-muted-foreground hover:text-foreground border border-transparent"
                )}
              >
                {sev}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 bg-muted/30 p-1 rounded-xl border border-border ml-auto">
            {(["all", "open", "investigating", "resolved"] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusAndReset(st)}
                className={cn(
                  "px-4 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all",
                  filterStatus === st
                    ? "bg-card shadow-sm text-foreground border border-border"
                    : "text-muted-foreground hover:text-foreground border border-transparent"
                )}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Incident List */}
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 rounded-2xl bg-muted/60 animate-pulse border border-border" />
            ))}
          </div>
        ) : incidents.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center border border-dashed border-border rounded-3xl bg-card/30">
            <div className="h-16 w-16 bg-success/10 rounded-full flex items-center justify-center text-success mb-4">
              <CheckCircle className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold">No active incidents</h3>
            <p className="text-muted-foreground text-sm mt-1 max-w-sm text-center">
              Your infrastructure is completely secure. No anomalies detected matching the current filters.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {incidents.map((incident) => {
              const server = servers.find((s) => s._id === incident.server_id);
              return (
                <Link
                  href={`/incidents/${incident._id}`}
                  key={incident._id}
                  className={cn(
                    "group flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 rounded-2xl border transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5",
                    incident.severity === "critical" ? "bg-danger/5 border-danger/30 hover:border-danger/60"
                    : incident.severity === "high" ? "bg-orange-500/5 border-orange-500/30 hover:border-orange-500/60"
                    : incident.severity === "medium" ? "bg-warning/5 border-warning/30 hover:border-warning/60"
                    : "bg-card border-border hover:border-primary/40"
                  )}
                >
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className={cn(
                      "mt-1 p-2.5 rounded-xl shrink-0 shadow-sm",
                      incident.severity === "critical" ? "bg-danger text-white shadow-danger/20"
                      : incident.severity === "high" ? "bg-orange-500 text-white shadow-orange-500/20"
                      : incident.severity === "medium" ? "bg-warning text-white shadow-warning/20"
                      : "bg-blue-500 text-white shadow-blue-500/20"
                    )}>
                      {incident.severity === "critical" ? <Flame className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          {incident.rule_id || "ANOMALY DETECTED"}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">{timeAgo(incident.detected_at)}</span>
                      </div>
                      <h3 className="font-bold text-base truncate pr-4 group-hover:text-primary transition-colors">
                        {incident.description}
                      </h3>
                      {server && (
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5 font-mono">
                          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
                          {server.hostname} ({server.ip_address})
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mt-4 sm:mt-0 pl-14 sm:pl-0">
                    <div className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider border",
                      incident.status === "open" ? "bg-danger/10 text-danger border-danger/20"
                      : incident.status === "investigating" ? "bg-warning/10 text-warning border-warning/20"
                      : incident.status === "resolved" ? "bg-success/10 text-success border-success/20"
                      : "bg-muted text-muted-foreground border-border"
                    )}>
                      {incident.status}
                    </div>
                    <div className="hidden sm:flex text-sm font-semibold text-primary/80 group-hover:text-primary transition-colors items-center gap-1 opacity-0 group-hover:opacity-100 -translate-x-4 group-hover:translate-x-0 duration-300">
                      Investigate <span className="text-lg leading-none">&rarr;</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-muted-foreground">
              Page <span className="font-semibold text-foreground">{page}</span> of{" "}
              <span className="font-semibold text-foreground">{totalPages}</span>
              {" · "}
              <span className="font-semibold text-foreground">{data?.total ?? 0}</span> total
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(1)}
                disabled={page === 1}
                className="px-3 py-2 rounded-lg text-xs font-semibold border border-border bg-card hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >«</button>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-2 rounded-lg text-xs font-semibold border border-border bg-card hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >Prev</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .reduce<(number | "…")[]>((acc, p, idx, arr) => {
                  if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("…");
                  acc.push(p);
                  return acc;
                }, [])
                .map((item, idx) =>
                  item === "…" ? (
                    <span key={`ellipsis-${idx}`} className="px-2 text-xs text-muted-foreground">…</span>
                  ) : (
                    <button
                      key={item}
                      onClick={() => setPage(item as number)}
                      className={cn(
                        "px-4 py-2 rounded-lg text-xs font-semibold border transition-colors",
                        page === item
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border bg-card hover:bg-muted"
                      )}
                    >{item}</button>
                  )
                )}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-2 rounded-lg text-xs font-semibold border border-border bg-card hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >Next</button>
              <button
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
                className="px-3 py-2 rounded-lg text-xs font-semibold border border-border bg-card hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >»</button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
