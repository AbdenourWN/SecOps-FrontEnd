"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import {
  useRemediationHistory,
  useRemediationHistoryStats,
} from "@/lib/hooks/use-scripts";
import { useServers } from "@/lib/hooks/use-servers";
import { useScripts } from "@/lib/hooks/use-scripts";
import { cn, timeAgo } from "@/lib/utils";
import {
  Bot,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
  FileText,
  Activity,
  TrendingUp,
  AlertTriangle,
  ArrowLeft,
  Terminal,
} from "lucide-react";
import type { RemediationRun } from "@/lib/types";

const PAGE_SIZE = 25;

type StatusFilter = "all" | "success" | "failed";

export default function AutomationHistoryPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [serverFilter, setServerFilter] = useState<string>("all");
  const [scriptFilter, setScriptFilter] = useState<string>("all");
  const [page, setPage] = useState(0);
  const [selectedRun, setSelectedRun] = useState<RemediationRun | null>(null);

  const { data: servers } = useServers();
  const { data: scripts } = useScripts();

  const filters = useMemo(
    () => ({
      status: statusFilter === "all" ? undefined : statusFilter,
      server_id: serverFilter === "all" ? undefined : serverFilter,
      script_id: scriptFilter === "all" ? undefined : scriptFilter,
    }),
    [statusFilter, serverFilter, scriptFilter]
  );

  const { data: stats } = useRemediationHistoryStats(filters);
  const { data: runs, isLoading } = useRemediationHistory({
    ...filters,
    limit: PAGE_SIZE,
    skip: page * PAGE_SIZE,
  });

  const total = stats?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilters =
    statusFilter !== "all" || serverFilter !== "all" || scriptFilter !== "all";

  const resetFilters = () => {
    setStatusFilter("all");
    setServerFilter("all");
    setScriptFilter("all");
    setPage(0);
  };

  const handleStatusChange = (v: string) => {
    setStatusFilter(v as StatusFilter);
    setPage(0);
  };
  const handleServerChange = (v: string) => {
    setServerFilter(v);
    setPage(0);
  };
  const handleScriptChange = (v: string) => {
    setScriptFilter(v);
    setPage(0);
  };

  return (
    <AppShell>
      <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <Link
              href="/automation"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors mb-3"
            >
              <ArrowLeft className="h-3 w-3" />
              Back to Playbooks
            </Link>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold mb-4 border border-primary/20">
              <Bot className="h-3.5 w-3.5" />
              AUTOMATION ACTIVITY
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
              Remediation History
            </h1>
            <p className="text-muted-foreground mt-2 max-w-xl leading-relaxed">
              Audit trail of every auto-remediation run across your fleet.
              Inspect output, diagnose failures, and trace each action back to
              its triggering incident.
            </p>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Total Runs"
            value={stats?.total ?? 0}
            icon={<Activity className="h-4 w-4" />}
            accent="primary"
          />
          <StatCard
            label="Successful"
            value={stats?.success ?? 0}
            icon={<CheckCircle2 className="h-4 w-4" />}
            accent="success"
          />
          <StatCard
            label="Failed"
            value={stats?.failed ?? 0}
            icon={<AlertTriangle className="h-4 w-4" />}
            accent="danger"
          />
          <StatCard
            label="Last 24h"
            value={stats?.last_24h ?? 0}
            hint={
              stats && stats.total > 0
                ? `${stats.success_rate}% success rate`
                : undefined
            }
            icon={<TrendingUp className="h-4 w-4" />}
            accent="secondary"
          />
        </div>

        {/* Filter bar */}
        <div className="rounded-2xl border border-border bg-card/40 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Filters
            </p>
            {hasFilters && (
              <button
                onClick={resetFilters}
                className="ml-auto inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-danger transition-colors"
              >
                <X className="h-3 w-3" />
                Clear all
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            <FilterSelect
              label="Status"
              value={statusFilter}
              onChange={handleStatusChange}
              options={[
                { value: "all", label: "All statuses" },
                { value: "success", label: "Success" },
                { value: "failed", label: "Failed" },
              ]}
            />
            <FilterSelect
              label="Server"
              value={serverFilter}
              onChange={handleServerChange}
              options={[
                { value: "all", label: "All servers" },
                ...(servers ?? []).map((s) => ({
                  value: s._id,
                  label: s.hostname,
                })),
              ]}
            />
            <FilterSelect
              label="Playbook"
              value={scriptFilter}
              onChange={handleScriptChange}
              options={[
                { value: "all", label: "All playbooks" },
                ...(scripts ?? []).map((s) => ({
                  value: s._id,
                  label: s.name,
                })),
              ]}
            />
          </div>
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-bold">
              Runs{" "}
              <span className="text-muted-foreground font-normal">
                ({total.toLocaleString()})
              </span>
            </h2>
            <span className="text-[10px] text-muted-foreground font-mono">
              Newest first · auto-refresh 15s
            </span>
          </div>

          {isLoading ? (
            <div className="divide-y divide-border">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="p-4">
                  <div className="h-4 bg-muted rounded animate-pulse w-2/3 mb-2" />
                  <div className="h-3 bg-muted rounded animate-pulse w-1/3" />
                </div>
              ))}
            </div>
          ) : !runs || runs.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center gap-2">
              <div className="h-12 w-12 bg-muted rounded-full flex items-center justify-center text-muted-foreground mb-2">
                <Bot className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold">No remediation runs found</p>
              <p className="text-xs text-muted-foreground">
                {hasFilters
                  ? "Try adjusting your filters"
                  : "Auto-fixes will appear here when detection rules trigger"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border">
                    <th className="text-left px-5 py-3 w-[140px]">Status</th>
                    <th className="text-left px-5 py-3">Playbook</th>
                    <th className="text-left px-5 py-3">Server</th>
                    <th className="text-left px-5 py-3 w-[140px]">When</th>
                    <th className="text-left px-5 py-3 w-[100px]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((run) => {
                    const ok = run.status === "success";
                    return (
                      <tr
                        key={run._id}
                        className="border-b border-border/60 hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-5 py-3">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold",
                              ok
                                ? "bg-success/15 text-success"
                                : "bg-danger/15 text-danger"
                            )}
                          >
                            {ok ? (
                              <CheckCircle2 className="h-3 w-3" />
                            ) : (
                              <XCircle className="h-3 w-3" />
                            )}
                            {ok ? "SUCCESS" : "FAILED"}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <Terminal className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="font-semibold truncate">
                              {run.script_name}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3 font-mono text-xs">
                          {run.server_hostname}
                        </td>
                        <td className="px-5 py-3 text-xs text-muted-foreground">
                          {timeAgo(run.executed_at)}
                        </td>
                        <td className="px-5 py-3">
                          <button
                            onClick={() => setSelectedRun(run)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-muted hover:bg-primary hover:text-primary-foreground text-[11px] font-semibold transition-colors"
                          >
                            <FileText className="h-3 w-3" />
                            Details
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {total > 0 && (
            <div className="px-5 py-3 border-t border-border flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Page <span className="font-bold">{page + 1}</span> of{" "}
                <span className="font-bold">{totalPages}</span>
                <span className="mx-2">·</span>
                Showing {page * PAGE_SIZE + 1}–
                {Math.min((page + 1) * PAGE_SIZE, total)} of{" "}
                {total.toLocaleString()}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() =>
                    setPage((p) => Math.min(totalPages - 1, p + 1))
                  }
                  disabled={page >= totalPages - 1}
                  className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Detail modal */}
      {selectedRun && (
        <RunDetailModal
          run={selectedRun}
          onClose={() => setSelectedRun(null)}
        />
      )}
    </AppShell>
  );
}

// ─────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  hint,
  icon,
  accent,
}: {
  label: string;
  value: number;
  hint?: string;
  icon: React.ReactNode;
  accent: "primary" | "success" | "danger" | "secondary";
}) {
  const accentClasses = {
    primary: "text-primary bg-primary/10",
    success: "text-success bg-success/10",
    danger: "text-danger bg-danger/10",
    secondary: "text-secondary bg-secondary/10",
  };
  return (
    <div className="rounded-2xl border border-border bg-card/40 backdrop-blur-md p-5 flex flex-col gap-3 overflow-hidden relative">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <div
          className={cn(
            "h-7 w-7 rounded-lg flex items-center justify-center",
            accentClasses[accent]
          )}
        >
          {icon}
        </div>
      </div>
      <p className="text-4xl font-black tabular-nums">
        {value.toLocaleString()}
      </p>
      {hint && (
        <p className="text-[11px] text-muted-foreground font-semibold">
          {hint}
        </p>
      )}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-3 py-2 rounded-lg bg-muted/50 border border-border focus:border-primary/50 outline-none text-sm font-medium min-w-[180px]"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function RunDetailModal({
  run,
  onClose,
}: {
  run: RemediationRun;
  onClose: () => void;
}) {
  const ok = run.status === "success";
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-card w-full max-w-2xl rounded-2xl border border-border shadow-2xl max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-border">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold",
                    ok
                      ? "bg-success/15 text-success"
                      : "bg-danger/15 text-danger"
                  )}
                >
                  {ok ? (
                    <CheckCircle2 className="h-3 w-3" />
                  ) : (
                    <XCircle className="h-3 w-3" />
                  )}
                  {ok ? "SUCCESS" : "FAILED"}
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {new Date(run.executed_at).toLocaleString()}
                </span>
              </div>
              <h3 className="text-lg font-bold truncate">{run.script_name}</h3>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Metadata grid */}
          <div className="grid grid-cols-2 gap-4">
            <MetaField label="Server" value={run.server_hostname} mono />
            <MetaField
              label="Triggering Incident"
              value={
                run.incident_id ? (
                  <Link
                    href={`/incidents/${run.incident_id}`}
                    className="text-primary hover:underline font-mono text-xs"
                  >
                    {run.incident_id.slice(-8)}
                  </Link>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )
              }
            />
          </div>

          {/* Output */}
          {run.output && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                Output
              </p>
              <pre className="bg-[#0f172a] text-green-400 p-4 rounded-xl text-xs font-mono overflow-x-auto max-h-60 overflow-y-auto whitespace-pre-wrap">
                {run.output}
              </pre>
            </div>
          )}

          {/* Error */}
          {run.error && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-danger mb-2">
                Error
              </p>
              <pre className="bg-danger/5 border border-danger/30 text-danger p-4 rounded-xl text-xs font-mono overflow-x-auto max-h-60 overflow-y-auto whitespace-pre-wrap">
                {run.error}
              </pre>
            </div>
          )}

          {!run.output && !run.error && (
            <p className="text-sm text-muted-foreground italic text-center py-6">
              No output or error captured for this run.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function MetaField({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
        {label}
      </p>
      <div className={cn("text-sm font-semibold", mono && "font-mono")}>
        {value}
      </div>
    </div>
  );
}
