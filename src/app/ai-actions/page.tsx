"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Bot, Check, Eye, X, Clock, CheckCircle2, Terminal, XCircle, Loader2, ShieldAlert, ChevronLeft, ChevronRight, AlertTriangle, ExternalLink, Server } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { CommandDetailModal } from "@/components/shared/command-detail-modal";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { DateRangeFilter, type DateRange } from "@/components/shared/date-range-filter";
import { cn } from "@/lib/utils";
import {
  useAiActions,
  useApproveAiAction,
  useRejectAiAction,
  useAiCommands,
  useApproveCommands,
  useRejectCommands,
} from "@/lib/hooks/use-ai-actions";
import { useServers } from "@/lib/hooks/use-servers";
import type { AiPendingAction, AiActionStatus, AiCommand } from "@/lib/types";

const ACTION_LABELS: Record<string, string> = {
  dismiss_anomaly: "Dismiss Anomaly",
  promote_anomaly: "Promote Anomaly → Incident",
  mark_incident_false_positive: "Mark Incident False Positive",
  // Phase 28.4 — suggestion actions from the script execution review
  disable_script_for_server: "Disable Script for This Server",
  disable_rule_for_server: "Disable Rule for This Server",
  suggest_manual_remediation: "Replace Auto-fix with Manual Checklist",
  // Phase 28.5 — per-server library actions
  create_server_rule: "Create Server-Scoped Rule",
  create_server_script: "Create Server-Scoped Script",
  swap_remediation_script: "Swap Remediation Script for This Server",
};

function StatusBadge({ status }: { status: AiActionStatus }) {
  if (status === "pending")
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20">
        <Clock className="h-3 w-3" /> Pending
      </span>
    );
  if (status === "approved")
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
        <CheckCircle2 className="h-3 w-3" /> Approved
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/20">
      <XCircle className="h-3 w-3" /> Rejected
    </span>
  );
}

function ActionCard({ action }: { action: AiPendingAction }) {
  const approve = useApproveAiAction();
  const reject = useRejectAiAction();
  const isPending = action.status === "pending";

  const handleApprove = async () => {
    try {
      await approve.mutateAsync(action._id);
      toast.success("Action approved and executed");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleReject = async () => {
    try {
      await reject.mutateAsync(action._id);
      toast.success("Action rejected");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <div
      className={cn(
        "rounded-xl border p-5 space-y-3 transition-colors",
        isPending ? "border-amber-500/20 bg-amber-500/5" : "border-border bg-card/50",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold">
              {ACTION_LABELS[action.action_type] ?? action.action_type}
            </span>
            <StatusBadge status={action.status} />
          </div>
          <p className="text-[11px] text-muted-foreground font-mono">
            run_id: {action.run_id}
          </p>
        </div>
        <div className="text-right shrink-0 space-y-0.5">
          {/* For decided rows, surface decided_at as the primary timestamp so
              you can scan the list for "most recently actioned". Created_at
              stays as a small secondary line. */}
          {action.decided_at ? (
            <>
              <p className="text-xs font-semibold text-foreground">
                {new Date(action.decided_at).toLocaleString()}
              </p>
              <p className="text-[10px] text-muted-foreground/70">
                decided · created {new Date(action.created_at).toLocaleString()}
              </p>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">
              {new Date(action.created_at).toLocaleString()}
            </p>
          )}
        </div>
      </div>

      {/* Payload */}
      <div className="rounded-lg bg-muted/30 border border-border px-3 py-2 text-xs font-mono space-y-0.5">
        {Object.entries(action.payload).map(([k, v]) => {
          // Phase 28.4 — `manual_commands` array (from suggest_manual_remediation)
          // gets a dedicated nested renderer so it doesn't stringify to
          // "[object Object],…". Other arrays/objects fall back to JSON.stringify
          // which is at least readable.
          if (k === "manual_commands" && Array.isArray(v)) {
            return (
              <div key={k}>
                <span className="text-muted-foreground">{k}:</span>
                <ul className="mt-1 space-y-1 pl-2 border-l border-border/60">
                  {(v as Array<{ command?: string; purpose?: string }>).map(
                    (mc, i) => (
                      <li key={i} className="space-y-0.5">
                        <code className="text-violet-300 break-all">
                          {mc.command || "(no command)"}
                        </code>
                        {mc.purpose && (
                          <div className="text-[11px] text-muted-foreground font-sans">
                            {mc.purpose}
                          </div>
                        )}
                      </li>
                    ),
                  )}
                </ul>
              </div>
            );
          }
          // Phase 28.5 — render long script bodies / regex patterns in a
          // dedicated code block instead of inlining them next to the field
          // label. These come from create_server_rule / create_server_script
          // / swap_remediation_script payloads.
          if (
            (k === "content" || k === "new_script_content" || k === "pattern")
            && typeof v === "string" && v.length > 0
          ) {
            return (
              <div key={k}>
                <span className="text-muted-foreground">{k}:</span>
                <pre className="mt-1 max-h-72 overflow-auto rounded-md bg-zinc-950 border border-border/60 p-2 text-[11px] text-zinc-200 whitespace-pre-wrap break-all">
{String(v)}
                </pre>
              </div>
            );
          }
          if (Array.isArray(v) && v.every((x) => typeof x === "string")) {
            return (
              <div key={k}>
                <span className="text-muted-foreground">{k}:</span>{" "}
                <span className="text-foreground">{(v as string[]).join(", ") || "—"}</span>
              </div>
            );
          }
          if (typeof v === "object" && v !== null) {
            return (
              <div key={k}>
                <span className="text-muted-foreground">{k}:</span>{" "}
                <span className="text-foreground break-all">
                  {JSON.stringify(v)}
                </span>
              </div>
            );
          }
          return (
            <div key={k}>
              <span className="text-muted-foreground">{k}:</span>{" "}
              <span className="text-foreground">{String(v)}</span>
            </div>
          );
        })}
      </div>

      {/* Phase 28.5 — auto-flip info badge for create_server_* and swap actions.
          Tells the operator that approving on a global-mode server will
          transparently switch it to `both`. */}
      {(action.action_type === "create_server_rule"
        || action.action_type === "create_server_script"
        || action.action_type === "swap_remediation_script") && (
        <div className="text-[11px] text-blue-300/80 bg-blue-500/5 border border-blue-500/20 rounded-md px-3 py-1.5">
          Approving will insert this into the server&apos;s private library. If the
          server&apos;s library mode is still <b>Global only</b>, it will switch to
          <b> Both</b> automatically so the new entry takes effect.
        </div>
      )}

      {/* Source + server links */}
      {(action.source_id || action.server_id) && (
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {action.source_id && action.source_type && (() => {
            // Phase 28.4 — script-execution-review actions are sourced from an
            // automation_logs row; the right place to land the operator is the
            // remediation history page (no per-row deep link yet).
            // Phase 28.5 — `server` source type fires from the server-overview
            // agent; deep-link to the server's AI Overview tab.
            const t = action.source_type;
            const href =
              t === "automation_log" ? `/automation/history/${action.source_id}`
              : t === "incident" ? `/incidents/${action.source_id}`
              : t === "server" ? `/servers/${action.source_id}#ai-overview`
              : `/anomalies/${action.source_id}`;
            const label =
              t === "automation_log" ? "Remediation run"
              : t === "incident" ? "Incident"
              : t === "server" ? "Server overview"
              : "Anomaly";
            return (
              <Link
                href={href}
                className="flex items-center gap-1 font-semibold text-primary hover:underline"
              >
                {label} {action.source_id.slice(-8)}
                <ExternalLink className="h-3 w-3" />
              </Link>
            );
          })()}
          {action.server_id && (
            <Link
              href={`/servers/${action.server_id}`}
              className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Server className="h-3 w-3" />
              {action.server_hostname || action.server_id.slice(-8)}
            </Link>
          )}
        </div>
      )}

      {/* Decision info or action buttons */}
      {isPending ? (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleApprove}
            disabled={approve.isPending || reject.isPending}
            className="gap-1.5 bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30"
            variant="ghost"
          >
            <Check className="h-3.5 w-3.5" />
            Approve &amp; Execute
          </Button>
          <Button
            size="sm"
            onClick={handleReject}
            disabled={approve.isPending || reject.isPending}
            className="gap-1.5 text-red-400 hover:bg-red-500/10 border border-red-500/20"
            variant="ghost"
          >
            <X className="h-3.5 w-3.5" />
            Reject
          </Button>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          {action.status === "approved" ? "Approved" : "Rejected"} by{" "}
          <span className="font-medium">{action.decided_by ?? "operator"}</span>{" "}
          {action.decided_at ? `at ${new Date(action.decided_at).toLocaleString()}` : ""}
        </p>
      )}
    </div>
  );
}

const RISK_STYLES: Record<string, string> = {
  low: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  high: "bg-red-500/10 text-red-400 border-red-500/20",
};


// ── Command row (list item) ────────────────────────────────────────────────────

function CommandRow({ cmd, onView }: { cmd: AiCommand; onView: () => void }) {
  const approve = useApproveCommands();
  const reject = useRejectCommands();
  const hasNonZeroExit = cmd.status === "completed" && cmd.exit_code != null && cmd.exit_code !== 0;

  const handleApprove = async () => {
    try {
      await approve.mutateAsync({ command_ids: [cmd._id] });
      toast.success("Command queued for execution");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleReject = async () => {
    try {
      await reject.mutateAsync({ command_ids: [cmd._id] });
      toast.success("Command dismissed");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const borderClass =
    hasNonZeroExit ? "border-amber-500/20 bg-amber-500/5" :
    cmd.status === "completed" ? "border-emerald-500/20 bg-emerald-500/5" :
    cmd.status === "executing" ? "border-blue-500/20 bg-blue-500/5" :
    cmd.status === "blocked" ? "border-red-500/20 bg-red-500/5" :
    cmd.status === "pending" ? "border-amber-500/20 bg-amber-500/5" :
    "border-border bg-card/50";

  return (
    <div className={cn("rounded-xl border p-4 space-y-2", borderClass)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn("text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border", RISK_STYLES[cmd.risk_level] ?? RISK_STYLES.medium)}>
              {cmd.risk_level}
            </span>
            {cmd.is_read_only && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                diagnostic
              </span>
            )}
            <span className="text-[10px] text-muted-foreground uppercase">{cmd.os_type}</span>
            {/* Exit code badge */}
            {cmd.status === "completed" && cmd.exit_code != null && (
              <span className={cn(
                "text-[10px] font-bold px-1.5 py-0.5 rounded border",
                cmd.exit_code === 0
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : "bg-amber-500/10 text-amber-400 border-amber-500/20"
              )}>
                exit {cmd.exit_code}
              </span>
            )}
          </div>
          <code className="block text-xs font-mono text-foreground break-all">{cmd.command}</code>
          <p className="text-xs text-muted-foreground">{cmd.purpose}</p>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <p className="text-xs text-muted-foreground">{new Date(cmd.created_at).toLocaleString()}</p>
          {["completed", "failed", "blocked"].includes(cmd.status) && (
            <button
              onClick={onView}
              className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              <Eye className="h-3 w-3" /> Details
            </button>
          )}
        </div>
      </div>

      {/* Actions */}
      {cmd.status === "pending" && (
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={handleApprove} disabled={approve.isPending}
            className="gap-1.5 bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30 text-xs">
            <Check className="h-3 w-3" /> Approve
          </Button>
          <Button size="sm" variant="ghost" onClick={handleReject} disabled={reject.isPending}
            className="gap-1.5 text-red-400 hover:bg-red-500/10 border border-red-500/20 text-xs">
            <X className="h-3 w-3" /> Dismiss
          </Button>
        </div>
      )}
      {cmd.status === "executing" && (
        <p className="text-xs text-blue-400 flex items-center gap-1">
          <Loader2 className="h-3 w-3 animate-spin" /> Executing…
        </p>
      )}
      {hasNonZeroExit && (
        <p className="text-xs text-amber-400 flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          Command ran but returned exit code {cmd.exit_code} — click Details to see stderr.
        </p>
      )}
      {cmd.status === "blocked" && (
        <p className="text-xs text-red-400 flex items-center gap-1">
          <ShieldAlert className="h-3 w-3" /> {cmd.error}
        </p>
      )}
      {cmd.status === "completed" && cmd.exit_code === 0 && cmd.impact_verdict && (
        <p className={cn("text-xs font-medium", {
          "text-emerald-400": cmd.impact_verdict === "resolved",
          "text-amber-400": cmd.impact_verdict === "partial" || cmd.impact_verdict === "no_effect",
          "text-red-400": cmd.impact_verdict === "made_worse",
        })}>
          {cmd.impact_verdict.replace(/_/g, " ")}
          {cmd.impact_summary ? ` · ${cmd.impact_summary}` : ""}
        </p>
      )}
    </div>
  );
}

const STATUS_TABS: { value: "pending" | "approved" | "rejected" | "all"; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "all", label: "All" },
];

type MainTab = "status-changes" | "commands";

function Pagination({
  page,
  total,
  pageSize,
  onPage,
}: {
  page: number;
  total: number;
  pageSize: number;
  onPage: (p: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return (
    <div className="flex items-center justify-between pt-2">
      <p className="text-xs text-muted-foreground tabular-nums">
        {from}–{to} of {total}
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          className="flex items-center justify-center h-7 w-7 rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <span className="text-xs font-semibold tabular-nums px-2">
          {page} / {totalPages}
        </span>
        <button
          onClick={() => onPage(page + 1)}
          disabled={page >= totalPages}
          className="flex items-center justify-center h-7 w-7 rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

const TAB_INFO: Record<MainTab, { icon: React.ReactNode; label: string; description: string }> = {
  "status-changes": {
    icon: <Bot className="h-3 w-3" />,
    label: "Status Changes",
    description:
      "These are status changes the AI agent wants to make to your incidents and anomalies — like dismissing a false positive, promoting an anomaly to a real incident, or marking an incident as a false positive. They only appear on servers set to Suggest autonomy level. Nothing executes until you approve.",
  },
  commands: {
    icon: <Terminal className="h-3 w-3" />,
    label: "Commands",
    description:
      "Shell or PowerShell commands the AI agent recommended during triage. Each command runs on the relevant server when approved, captures its output, and produces an AI-written before/after impact report.",
  },
};

export default function AiActionsPage() {
  const [mainTab, setMainTab] = useState<MainTab>("commands");

  // Modal state
  const [selectedCmd, setSelectedCmd] = useState<AiCommand | null>(null);

  // Status-changes tab state
  const [statusFilter, setStatusFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [statusSourceType, setStatusSourceType] = useState<"all" | "incident" | "anomaly">("all");
  const [statusServerId, setStatusServerId] = useState<string>("all");
  const [statusDateRange, setStatusDateRange] = useState<DateRange>({});
  const [statusPage, setStatusPage] = useState(1);

  // Commands tab state
  const [cmdStatus, setCmdStatus] = useState<string>("pending");
  const [cmdSourceType, setCmdSourceType] = useState<"all" | "incident" | "anomaly">("all");
  const [cmdServerId, setCmdServerId] = useState<string>("all");
  const [cmdDateRange, setCmdDateRange] = useState<DateRange>({});
  const [cmdPage, setCmdPage] = useState(1);

  const { data: serversData } = useServers();
  const servers = serversData?.results ?? [];

  const { data, isLoading } = useAiActions({
    status: statusFilter,
    source_type: statusSourceType !== "all" ? statusSourceType : undefined,
    server_id: statusServerId !== "all" ? statusServerId : undefined,
    from_date: statusDateRange.from ?? undefined,
    to_date: statusDateRange.to ?? undefined,
    page: statusPage,
  });
  const { data: cmdsData, isLoading: cmdsLoading } = useAiCommands({
    status: cmdStatus !== "all" ? cmdStatus : undefined,
    source_type: cmdSourceType !== "all" ? cmdSourceType : undefined,
    server_id: cmdServerId !== "all" ? cmdServerId : undefined,
    from_date: cmdDateRange.from ?? undefined,
    to_date: cmdDateRange.to ?? undefined,
    page: cmdPage,
  });

  // Reset to page 1 when any filter changes
  const handleStatusFilter = (val: typeof statusFilter) => { setStatusFilter(val); setStatusPage(1); };
  const handleStatusSourceType = (val: typeof statusSourceType) => { setStatusSourceType(val); setStatusPage(1); };
  const handleStatusServer = (val: string) => { setStatusServerId(val); setStatusPage(1); };
  const handleStatusDate = (v: DateRange) => { setStatusDateRange(v); setStatusPage(1); };
  const handleCmdStatus = (val: string) => { setCmdStatus(val); setCmdPage(1); };
  const handleCmdSourceType = (val: typeof cmdSourceType) => { setCmdSourceType(val); setCmdPage(1); };
  const handleCmdServer = (val: string) => { setCmdServerId(val); setCmdPage(1); };
  const handleCmdDate = (v: DateRange) => { setCmdDateRange(v); setCmdPage(1); };

  const tab = TAB_INFO[mainTab];

  return (
    <AppShell>
      {selectedCmd && (
        <CommandDetailModal
          cmd={selectedCmd}
          onClose={() => setSelectedCmd(null)}
          sourceHref={
            selectedCmd.source_type === "incident"
              ? `/incidents/${selectedCmd.source_id}`
              : `/anomalies/${selectedCmd.source_id}`
          }
          sourceLabel={
            selectedCmd.source_type === "incident"
              ? `Incident ${selectedCmd.source_id.slice(-8)}`
              : `Anomaly ${selectedCmd.source_id.slice(-8)}`
          }
        />
      )}
      <div className="max-w-3xl mx-auto space-y-6 pb-16">
        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold">AI Actions</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Proposed actions from the AI triage agent that require your approval before anything changes.
          </p>
        </div>

        {/* Main tabs */}
        <div className="flex gap-1 p-1 rounded-lg bg-muted/50 border border-border w-fit">
          {(Object.entries(TAB_INFO) as [MainTab, typeof TAB_INFO[MainTab]][]).map(([key, info]) => (
            <button key={key} onClick={() => setMainTab(key)}
              className={cn("flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors",
                mainTab === key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
              {info.icon}{info.label}
            </button>
          ))}
        </div>

        {/* Tab description */}
        <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
          <p className="text-xs text-muted-foreground leading-relaxed">{tab.description}</p>
        </div>

        {/* ── Status Changes tab ─────────────────────────────────── */}
        {mainTab === "status-changes" && (
          <>
            <div className="space-y-2">
              <div className="flex gap-1 p-1 rounded-lg bg-muted/50 border border-border w-fit">
                {STATUS_TABS.map((t) => (
                  <button key={t.value} onClick={() => handleStatusFilter(t.value)}
                    className={cn("px-3 py-1.5 text-xs font-semibold rounded-md transition-colors",
                      statusFilter === t.value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Source type */}
                <div className="flex gap-1 p-1 rounded-lg bg-muted/50 border border-border">
                  {(["all", "incident", "anomaly"] as const).map((t) => (
                    <button key={t} onClick={() => handleStatusSourceType(t)}
                      className={cn("px-3 py-1.5 text-xs font-semibold rounded-md transition-colors capitalize",
                        statusSourceType === t ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                      {t === "all" ? "All sources" : t === "incident" ? "Incidents" : "Anomalies"}
                    </button>
                  ))}
                </div>

                {/* Server dropdown */}
                {servers.length > 0 && (
                  <Select value={statusServerId} onValueChange={(v) => handleStatusServer(v ?? "all")}>
                    <SelectTrigger className="h-8 w-45 text-xs font-semibold">
                      <Server className="h-3 w-3 mr-1 text-muted-foreground" />
                      <span className="truncate">
                        {statusServerId === "all"
                          ? "All servers"
                          : servers.find((s) => s._id === statusServerId)?.hostname ?? "Unknown server"}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All servers</SelectItem>
                      {servers.map((srv) => (
                        <SelectItem key={srv._id} value={srv._id}>
                          {srv.hostname}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                <DateRangeFilter value={statusDateRange} onChange={handleStatusDate} />
              </div>
            </div>
            {isLoading ? (
              <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />)}</div>
            ) : !data?.results?.length ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Bot className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">
                  No {statusFilter === "all" ? "" : statusFilter} status changes.
                </p>
                {statusFilter === "pending" && (
                  <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                    Status changes appear here when a server&apos;s AI autonomy level is set to{" "}
                    <span className="font-medium text-foreground">Suggest</span> and the agent proposes a dismiss, promote, or false-positive action.
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {data.results.map((action) => <ActionCard key={action._id} action={action} />)}
                <Pagination
                  page={data.page}
                  total={data.total}
                  pageSize={data.page_size}
                  onPage={setStatusPage}
                />
              </div>
            )}
          </>
        )}

        {/* ── Commands tab ───────────────────────────────────────── */}
        {mainTab === "commands" && (
          <>
            {/* Filter row */}
            <div className="space-y-2">
              {/* Status */}
              <div className="flex flex-wrap gap-1 p-1 rounded-lg bg-muted/50 border border-border w-fit">
                {["pending", "executing", "completed", "failed", "blocked", "rejected", "all"].map((s) => (
                  <button key={s} onClick={() => handleCmdStatus(s)}
                    className={cn("px-3 py-1.5 text-xs font-semibold rounded-md transition-colors capitalize",
                      cmdStatus === s ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                    {s}
                  </button>
                ))}
              </div>

              {/* Source type + server in one row */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Source type */}
                <div className="flex gap-1 p-1 rounded-lg bg-muted/50 border border-border">
                  {(["all", "incident", "anomaly"] as const).map((t) => (
                    <button key={t} onClick={() => handleCmdSourceType(t)}
                      className={cn("px-3 py-1.5 text-xs font-semibold rounded-md transition-colors capitalize",
                        cmdSourceType === t ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                      {t === "all" ? "All sources" : t === "incident" ? "Incidents" : "Anomalies"}
                    </button>
                  ))}
                </div>

                {/* Server dropdown */}
                {servers.length > 0 && (
                  <Select value={cmdServerId} onValueChange={(v) => handleCmdServer(v ?? "all")}>
                    <SelectTrigger className="h-8 w-45 text-xs font-semibold">
                      <Server className="h-3 w-3 mr-1 text-muted-foreground" />
                      <span className="truncate">
                        {cmdServerId === "all"
                          ? "All servers"
                          : servers.find((s) => s._id === cmdServerId)?.hostname ?? "Unknown server"}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All servers</SelectItem>
                      {servers.map((srv) => (
                        <SelectItem key={srv._id} value={srv._id}>
                          {srv.hostname}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                <DateRangeFilter value={cmdDateRange} onChange={handleCmdDate} />
              </div>
            </div>
            {cmdsLoading ? (
              <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}</div>
            ) : !cmdsData?.results?.length ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Terminal className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">
                  No {cmdStatus === "all" ? "" : cmdStatus} commands.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Commands appear after running AI Analysis on an incident or anomaly.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {cmdsData.results.map((cmd) => (
                  <CommandRow key={cmd._id} cmd={cmd} onView={() => setSelectedCmd(cmd)} />
                ))}
                <Pagination
                  page={cmdsData.page}
                  total={cmdsData.total}
                  pageSize={cmdsData.page_size}
                  onPage={setCmdPage}
                />
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
