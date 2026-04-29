"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Activity,
  ArrowRight,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  FileText,
  Telescope,
  TrendingUp,
  X,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import {
  useAnomalies,
  useAnomalyStats,
  useDismissAnomaly,
  usePromoteAnomaly,
} from "@/lib/hooks/use-anomalies";
import { useServers } from "@/lib/hooks/use-servers";
import { cn, timeAgo } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import type {
  AnomalySeverity,
  AnomalyType,
  LogObservation,
  LogObservationStatus,
} from "@/lib/types";

const PAGE_SIZE = 25;

const severityStyles: Record<AnomalySeverity, string> = {
  high: "bg-red-500/15 text-red-400 border-red-500/30",
  medium: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  low: "bg-blue-500/15 text-blue-400 border-blue-500/30",
};

const statusStyles: Record<LogObservationStatus, string> = {
  pending_review: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  dismissed: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
  promoted_to_incident: "bg-purple-500/15 text-purple-400 border-purple-500/30",
};

const statusLabel: Record<LogObservationStatus, string> = {
  pending_review: "PENDING",
  dismissed: "DISMISSED",
  promoted_to_incident: "PROMOTED",
};

export default function AnomaliesPage() {
  const [serverFilter, setServerFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<AnomalySeverity | "all">("all");
  const [statusFilter, setStatusFilter] = useState<LogObservationStatus | "all">("pending_review");
  const [typeFilter, setTypeFilter] = useState<AnomalyType | "all">("all");
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: stats } = useAnomalyStats();
  const { data: serversData } = useServers({ page_size: 100 });
  const servers = serversData?.results ?? [];

  const { data, isLoading } = useAnomalies({
    server_id: serverFilter === "all" ? undefined : serverFilter,
    severity: severityFilter === "all" ? undefined : severityFilter,
    status: statusFilter === "all" ? undefined : statusFilter,
    type: typeFilter === "all" ? undefined : typeFilter,
    page,
    page_size: PAGE_SIZE,
  });

  const observations = data?.results ?? [];
  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  const dismissMutation = useDismissAnomaly();
  const promoteMutation = usePromoteAnomaly();

  const onDismiss = async (obs: LogObservation) => {
    try {
      await dismissMutation.mutateAsync(obs._id);
      toast.success("Anomaly dismissed");
    } catch (err) {
      toast.error((err as Error).message ?? "Failed to dismiss");
    }
  };

  const onPromote = async (obs: LogObservation) => {
    try {
      const res = await promoteMutation.mutateAsync(obs._id);
      toast.success("Promoted to incident", {
        description: `Incident ${res.incident_id.slice(-8)} created`,
        action: {
          label: "Open",
          onClick: () => {
            window.location.href = `/incidents/${res.incident_id}`;
          },
        },
      });
    } catch (err) {
      toast.error((err as Error).message ?? "Failed to promote");
    }
  };

  return (
    <AppShell>
      <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 text-cyan-400 text-xs font-bold mb-4 border border-cyan-500/20">
            <Telescope className="h-3.5 w-3.5" />
            HEURISTIC TIER 2
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight bg-linear-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
            Anomalies
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl leading-relaxed">
            Logs and signals that didn&apos;t match a detection rule but tripped a
            heuristic check (suspicious keyword, never-seen pattern, off-hours
            activity, or volume spike). Review, dismiss, or promote to a
            tracked incident.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Total Observed"
            value={stats?.total ?? 0}
            icon={<Activity className="h-4 w-4" />}
            tone="primary"
          />
          <StatCard
            label="Pending Review"
            value={stats?.pending ?? 0}
            icon={<Clock className="h-4 w-4" />}
            tone="cyan"
          />
          <StatCard
            label="Dismissed"
            value={stats?.dismissed ?? 0}
            icon={<X className="h-4 w-4" />}
            tone="muted"
          />
          <StatCard
            label="Promoted"
            value={stats?.promoted ?? 0}
            icon={<TrendingUp className="h-4 w-4" />}
            tone="purple"
          />
        </div>

        {/* Filters */}
        <div className="rounded-2xl border border-border bg-card/40 p-5 space-y-4">
          {/* Status pills */}
          <div className="flex flex-wrap items-center gap-2">
            {(["all", "pending_review", "dismissed", "promoted_to_incident"] as const).map((s) => (
              <button
                key={s}
                onClick={() => {
                  setStatusFilter(s);
                  setPage(1);
                }}
                className={cn(
                  "px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all capitalize",
                  statusFilter === s
                    ? "bg-card shadow-sm text-foreground border-border"
                    : "bg-transparent text-muted-foreground border-transparent hover:text-foreground"
                )}
              >
                {s === "all" ? "All" : statusLabel[s as LogObservationStatus]}
              </button>
            ))}
          </div>

          {/* Severity + Type + Server */}
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Severity
              </label>
              <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-lg border border-border">
                {(["all", "high", "medium", "low"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setSeverityFilter(s);
                      setPage(1);
                    }}
                    className={cn(
                      "px-3 py-1 text-[11px] font-semibold rounded-md capitalize transition-all",
                      severityFilter === s
                        ? "bg-card shadow-sm text-foreground border border-border"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Type
              </label>
              <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-lg border border-border">
                {(["all", "log", "volume"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      setTypeFilter(t);
                      setPage(1);
                    }}
                    className={cn(
                      "px-3 py-1 text-[11px] font-semibold rounded-md capitalize transition-all",
                      typeFilter === t
                        ? "bg-card shadow-sm text-foreground border border-border"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5 ml-auto">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Server
              </label>
              <Select
                value={serverFilter}
                onValueChange={(v) => {
                  if (!v) return;
                  setServerFilter(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="min-w-50">
                  <span className="flex flex-1 text-left text-sm line-clamp-1" data-slot="select-value">
                    {serverFilter === "all"
                      ? <span className="text-muted-foreground">All servers</span>
                      : (servers.find((s) => s._id === serverFilter)?.hostname ?? serverFilter)}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All servers</SelectItem>
                  {servers.map((s) => (
                    <SelectItem key={s._id} value={s._id}>
                      {s.hostname}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="h-20 rounded-xl bg-muted/40 border border-border animate-pulse"
              />
            ))}
          </div>
        ) : observations.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center border border-dashed border-border rounded-3xl bg-card/30">
            <div className="h-14 w-14 bg-success/10 rounded-full flex items-center justify-center text-success mb-4">
              <CheckCircle className="h-7 w-7" />
            </div>
            <h3 className="text-base font-bold">No anomalies for these filters</h3>
            <p className="text-muted-foreground text-sm mt-1 max-w-sm text-center">
              Either your fleet is quiet, or the heuristics need tuning. Try
              widening filters or check back later.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {observations.map((obs) => {
              const open = expanded === obs._id;
              return (
                <div
                  key={obs._id}
                  className={cn(
                    "rounded-xl border transition-colors",
                    obs.status === "pending_review"
                      ? "bg-card border-border hover:border-cyan-500/40"
                      : "bg-card/50 border-border/60 opacity-80"
                  )}
                >
                  <button
                    onClick={() => setExpanded(open ? null : obs._id)}
                    className="w-full text-left p-4 flex items-start gap-4"
                  >
                    {/* Type icon */}
                    <div
                      className={cn(
                        "shrink-0 h-10 w-10 rounded-lg flex items-center justify-center",
                        obs.type === "volume"
                          ? "bg-amber-500/10 text-amber-400"
                          : "bg-cyan-500/10 text-cyan-400"
                      )}
                    >
                      {obs.type === "volume" ? (
                        <TrendingUp className="h-5 w-5" />
                      ) : (
                        <FileText className="h-5 w-5" />
                      )}
                    </div>

                    {/* Body */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border",
                            severityStyles[obs.severity]
                          )}
                        >
                          {obs.severity}
                        </span>
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border",
                            statusStyles[obs.status]
                          )}
                        >
                          {statusLabel[obs.status]}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {obs.server_hostname || obs.server_id.slice(-6)}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono ml-auto">
                          {timeAgo(obs.detected_at)}
                        </span>
                      </div>
                      <p className="text-sm font-mono truncate">
                        {obs.log_message ?? "(no message)"}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        {obs.reasons.map((r) => (
                          <span
                            key={r}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground font-mono"
                          >
                            {r}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="shrink-0 text-muted-foreground">
                      {open ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </button>

                  {open && (
                    <div className="px-4 pb-4 border-t border-border/60 pt-3 space-y-3">
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <DetailField label="Score" value={obs.score.toString()} />
                        <DetailField
                          label="Detected At"
                          value={new Date(obs.detected_at).toLocaleString()}
                        />
                        {obs.log_timestamp && (
                          <DetailField
                            label="Log Timestamp"
                            value={new Date(obs.log_timestamp).toLocaleString()}
                          />
                        )}
                        {obs.log_id && (
                          <DetailField label="Log ID" value={obs.log_id} mono />
                        )}
                        {obs.promoted_incident_id && (
                          <DetailField
                            label="Promoted Incident"
                            value={
                              <Link
                                href={`/incidents/${obs.promoted_incident_id}`}
                                className="text-primary hover:underline font-mono"
                              >
                                {obs.promoted_incident_id.slice(-8)}
                              </Link>
                            }
                          />
                        )}
                      </div>

                      {obs.log_message && (
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                            Full message
                          </p>
                          <pre className="text-xs font-mono bg-muted/30 border border-border rounded-md p-3 overflow-x-auto whitespace-pre-wrap break-all max-h-40 overflow-y-auto">
                            {obs.log_message}
                          </pre>
                        </div>
                      )}

                      {obs.status === "pending_review" && (
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={() => onDismiss(obs)}
                            disabled={dismissMutation.isPending}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-semibold hover:bg-muted disabled:opacity-50 transition-colors"
                          >
                            <X className="h-3.5 w-3.5" />
                            Dismiss
                          </button>
                          <button
                            onClick={() => onPromote(obs)}
                            disabled={promoteMutation.isPending}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
                          >
                            <ArrowRight className="h-3.5 w-3.5" />
                            Promote to Incident
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
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
              >
                «
              </button>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-2 rounded-lg text-xs font-semibold border border-border bg-card hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-2 rounded-lg text-xs font-semibold border border-border bg-card hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
              <button
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
                className="px-3 py-2 rounded-lg text-xs font-semibold border border-border bg-card hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                »
              </button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function StatCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: "primary" | "cyan" | "muted" | "purple";
}) {
  const toneClass = {
    primary: "text-primary bg-primary/10",
    cyan: "text-cyan-400 bg-cyan-500/10",
    muted: "text-muted-foreground bg-muted",
    purple: "text-purple-400 bg-purple-500/10",
  }[tone];
  return (
    <div className="rounded-2xl border border-border bg-card/40 backdrop-blur-md p-5 flex flex-col gap-3 overflow-hidden relative">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center", toneClass)}>
          {icon}
        </div>
      </div>
      <p className="text-4xl font-black tabular-nums">{value.toLocaleString()}</p>
    </div>
  );
}

function DetailField({
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
      <div className={cn("text-sm font-semibold", mono && "font-mono")}>{value}</div>
    </div>
  );
}
