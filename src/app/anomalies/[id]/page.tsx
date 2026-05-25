"use client";

import { use, useState } from "react";
import { useAiAnalysisStream } from "@/lib/hooks/use-ai-stream";
import { useStickToBottom } from "@/lib/hooks/use-stick-to-bottom";
import { TypingCursor } from "@/components/shared/typing-cursor";
import Link from "next/link";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Brain,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCopy,
  Clock,
  Eye,
  ExternalLink,
  FileText,
  Loader2,
  RefreshCw,
  Server,
  ShieldAlert,
  Telescope,
  Terminal,
  TrendingUp,
  X,
  XCircle,
  WifiOff,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import {
  useAnomaly,
  useAnomalyAiAnalysis,
  useDismissAnomaly,
  usePromoteAnomaly,
} from "@/lib/hooks/use-anomalies";
import {
  useAiCommandsForSource,
  useApproveCommands,
  useRejectCommands,
} from "@/lib/hooks/use-ai-actions";
import { CommandDetailModal } from "@/components/shared/command-detail-modal";
import { AiActionsForSource } from "@/components/shared/ai-actions-for-source";
import { ManualCommandCard } from "@/components/shared/manual-command-card";
import { cn, timeAgo } from "@/lib/utils";
import type {
  AiCommand,
  AnomalySeverity,
  AnomalyType,
  LogObservationStatus,
} from "@/lib/types";

// ── Shared sub-components ─────────────────────────────────────────────────────
// ManualCommandCard now lives in @/components/shared/manual-command-card.

const RISK_STYLES: Record<string, string> = {
  low: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  high: "bg-red-500/10 text-red-400 border-red-500/20",
};

const STATUS_ICON = {
  pending: null,
  approved: <Loader2 className="h-3 w-3 animate-spin text-blue-400" />,
  executing: <Loader2 className="h-3 w-3 animate-spin text-blue-400" />,
  completed: <CheckCircle2 className="h-3 w-3 text-emerald-400" />,
  failed: <XCircle className="h-3 w-3 text-red-400" />,
  blocked: <ShieldAlert className="h-3 w-3 text-red-400" />,
  rejected: <XCircle className="h-3 w-3 text-muted-foreground" />,
};



function CommandCard({
  cmd,
  onApprove,
  onReject,
  approving,
  rejecting,
  onViewDetails,
}: {
  cmd: AiCommand;
  onApprove: () => void;
  onReject: () => void;
  approving: boolean;
  rejecting: boolean;
  onViewDetails: () => void;
}) {
  const canAct = cmd.status === "pending";

  return (
    <div className={cn(
      "rounded-lg border p-3 space-y-2 transition-colors",
      cmd.status === "pending"   ? "border-amber-500/20 bg-amber-500/5" :
      cmd.status === "executing" ? "border-blue-500/20 bg-blue-500/5" :
      cmd.status === "completed" ? "border-emerald-500/20 bg-emerald-500/5" :
      cmd.status === "blocked"   ? "border-red-500/20 bg-red-500/5" :
      "border-border bg-card/50"
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 min-w-0">
          <div className="mt-0.5 shrink-0">{STATUS_ICON[cmd.status]}</div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn("text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border", RISK_STYLES[cmd.risk_level] ?? RISK_STYLES.medium)}>
                {cmd.risk_level}
              </span>
              {cmd.is_read_only && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">diagnostic</span>
              )}
              <span className="text-[10px] text-muted-foreground">{cmd.os_type}</span>
            </div>
            <code className="block text-xs font-mono mt-1 text-foreground break-all">{cmd.command}</code>
            <p className="text-xs text-muted-foreground mt-0.5">{cmd.purpose}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          {/* Timestamp — show decided_at prominently for decided rows so the
              newest decision is easy to spot. Pending rows show created_at. */}
          <div className="text-right leading-tight">
            {cmd.decided_at ? (
              <>
                <p className="text-[10px] font-semibold text-foreground">
                  {new Date(cmd.decided_at).toLocaleString()}
                </p>
                <p className="text-[9px] text-muted-foreground/70">
                  decided · created {new Date(cmd.created_at).toLocaleString()}
                </p>
              </>
            ) : (
              <p className="text-[10px] text-muted-foreground">
                {new Date(cmd.created_at).toLocaleString()}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {canAct ? (
              <>
                <button onClick={onApprove} disabled={approving}
                  className="text-[11px] font-semibold px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors disabled:opacity-50">
                  Approve
                </button>
                <button onClick={onReject} disabled={rejecting}
                  className="text-[11px] font-semibold px-2 py-1 rounded bg-muted text-muted-foreground hover:text-foreground transition-colors">
                  Dismiss
                </button>
              </>
            ) : (
              <button onClick={onViewDetails}
                className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors">
                <Eye className="h-3 w-3" /> Details
              </button>
            )}
          </div>
        </div>
      </div>

      {cmd.status === "blocked" && cmd.error && (
        <p className="text-xs text-red-400">{cmd.error}</p>
      )}

      {cmd.status === "completed" && cmd.impact_verdict && (
        <p className={cn("text-[11px] font-semibold", {
          "text-emerald-400": cmd.impact_verdict === "resolved",
          "text-amber-400": cmd.impact_verdict === "partial",
          "text-muted-foreground": cmd.impact_verdict === "no_effect",
          "text-red-400": cmd.impact_verdict === "made_worse",
        })}>
          {cmd.impact_verdict.replace("_", " ")}
          {cmd.impact_summary ? ` · ${cmd.impact_summary}` : ""}
        </p>
      )}
    </div>
  );
}

// ── Badge style maps ──────────────────────────────────────────────────────────

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

const typeStyles: Record<AnomalyType, string> = {
  log: "bg-cyan-500/10 text-cyan-400",
  volume: "bg-amber-500/10 text-amber-400",
};

const statusLabel: Record<LogObservationStatus, string> = {
  pending_review: "Pending review",
  dismissed: "Dismissed",
  promoted_to_incident: "Promoted to incident",
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AnomalyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: anomaly, isLoading } = useAnomaly(id);
  const dismissMutation = useDismissAnomaly();
  const promoteMutation = usePromoteAnomaly();
  const aiAnalysis = useAnomalyAiAnalysis();
  const [cmdPage, setCmdPage] = useState(1);
  const { data: commandsData } = useAiCommandsForSource("anomaly", id, anomaly?.server_id, cmdPage);
  const approveCommands = useApproveCommands();
  const rejectCommands = useRejectCommands();
  const [selectedCmd, setSelectedCmd] = useState<AiCommand | null>(null);
  const [selectedCommands, setSelectedCommands] = useState<Set<string>>(new Set());

  // Streaming hook MUST be called before any conditional returns (Rules of Hooks).
  // anomaly may be undefined on first render — useAiAnalysisStream tolerates an undefined serverId.
  const analysisRunning = aiAnalysis.isPending || !!anomaly?.ai_analysis_in_progress;
  const { streamedMarkdown, gapDetected, streamCompleted } = useAiAnalysisStream("anomaly", id, anomaly?.server_id, analysisRunning);
  const analysisContent = (analysisRunning && streamedMarkdown) ? streamedMarkdown : (anomaly?.ai_analysis ?? "");
  const { scrollRef: analysisScrollRef, onScroll: onAnalysisScroll } = useStickToBottom<HTMLDivElement>(analysisContent);
  // See incident page — detect "agent finished but produced nothing" so we don't render an empty box.
  const isEmptyAnalysis = (md: string | null | undefined): boolean => {
    if (!md) return false;
    const body = md.replace(/^## AI (?:Triage |Anomaly )?Analysis\s*/i, "").replace(/---[\s\S]*$/, "").trim();
    return body.length === 0;
  };
  const justEndedEmpty = streamCompleted && !streamedMarkdown && isEmptyAnalysis(anomaly?.ai_analysis);

  const commands = commandsData?.results ?? [];
  const pendingCommands = commands.filter((c) => c.status === "pending");
  const cmdTotal = commandsData?.total ?? 0;
  const cmdTotalPages = Math.max(1, Math.ceil(cmdTotal / 10));

  const handleApproveSelected = async (ids: string[]) => {
    try {
      await approveCommands.mutateAsync({ command_ids: ids });
      setSelectedCommands(new Set());
      toast.success(`${ids.length} command(s) queued for execution`);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleRejectSelected = async (ids: string[]) => {
    try {
      await rejectCommands.mutateAsync({ command_ids: ids });
      setSelectedCommands(new Set());
      toast.success(`${ids.length} command(s) dismissed`);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const onDismiss = async () => {
    if (!anomaly) return;
    try {
      await dismissMutation.mutateAsync(anomaly._id);
      toast.success("Anomaly dismissed");
    } catch (err) {
      toast.error((err as Error).message ?? "Failed to dismiss");
    }
  };

  const onPromote = async () => {
    if (!anomaly) return;
    try {
      const res = await promoteMutation.mutateAsync(anomaly._id);
      toast.success("Promoted to incident", {
        description: `Incident ${res.incident_id.slice(-8)} created`,
        action: {
          label: "Open",
          onClick: () => { window.location.href = `/incidents/${res.incident_id}`; },
        },
      });
    } catch (err) {
      toast.error((err as Error).message ?? "Failed to promote");
    }
  };

  const onAnalyze = async () => {
    if (!anomaly) return;
    try {
      await aiAnalysis.mutateAsync(anomaly._id);
      toast.success("AI analysis complete — see Suggested Commands below");
    } catch (err) {
      toast.error((err as Error).message ?? "AI analysis failed");
    }
  };

  if (isLoading) {
    return (
      <AppShell>
        <div className="space-y-6 animate-pulse">
          <div className="h-8 w-64 rounded bg-muted" />
          <div className="h-64 rounded-xl bg-muted" />
        </div>
      </AppShell>
    );
  }

  if (!anomaly) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-muted-foreground">Anomaly not found.</p>
          <Link href="/anomalies" className="mt-4 text-sm text-primary hover:underline">
            Back to anomalies
          </Link>
        </div>
      </AppShell>
    );
  }

  const canReview = anomaly.status === "pending_review";
  const title = anomaly.type === "volume" ? "Volume anomaly" : "Log anomaly";

  return (
    <AppShell>
      {selectedCmd && (
        <CommandDetailModal cmd={selectedCmd} onClose={() => setSelectedCmd(null)} />
      )}
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link
            href="/anomalies"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold">{title}</h1>
              <span className={cn("rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", severityStyles[anomaly.severity])}>
                {anomaly.severity}
              </span>
              <span className={cn("rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", statusStyles[anomaly.status])}>
                {statusLabel[anomaly.status]}
              </span>
            </div>
            <p className="mt-1 text-xs font-mono text-muted-foreground">ID: {anomaly._id}</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main content */}
          <div className="space-y-6 lg:col-span-2">

            {/* Heuristic Reasons */}
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <Telescope className="h-3.5 w-3.5" />
                Heuristic Reasons
              </h3>
              <div className="flex flex-wrap gap-2">
                {anomaly.reasons.length > 0 ? (
                  anomaly.reasons.map((reason) => (
                    <span key={reason} className="rounded-md bg-muted/50 px-2 py-1 font-mono text-xs text-muted-foreground">
                      {reason}
                    </span>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No reasons recorded.</p>
                )}
              </div>
            </div>

            {/* Log Message */}
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <FileText className="h-3.5 w-3.5" />
                Log Message
              </h3>
              <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-border bg-muted/30 p-4 font-mono text-sm leading-relaxed">
                {anomaly.log_message || "(no log message)"}
              </pre>
            </div>

            {/* AI Analysis */}
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <Brain className="h-3.5 w-3.5" />
                  AI Analysis
                </h3>
                <button
                  onClick={onAnalyze}
                  disabled={analysisRunning}
                  className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/20 disabled:opacity-50"
                >
                  {analysisRunning ? (
                    <><Loader2 className="h-3 w-3 animate-spin" />Analyzing…</>
                  ) : anomaly.ai_analysis ? (
                    <><RefreshCw className="h-3 w-3" />Re-analyze</>
                  ) : (
                    <><Brain className="h-3 w-3" />Run Analysis</>
                  )}
                </button>
              </div>

              {/* Reconnect gap notice */}
              {gapDetected && analysisRunning && (
                <div className="mb-3 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-linear-to-r from-amber-500/10 to-orange-500/5 px-4 py-3 shadow-sm">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 border border-amber-500/25">
                    <WifiOff className="h-3.5 w-3.5 text-amber-400" />
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-xs font-semibold text-amber-300">Reconnected mid-analysis</p>
                    <p className="text-[11px] leading-relaxed text-amber-400/80">
                      Some output was streamed while you were away and couldn&apos;t be recovered.
                      Showing the latest output — the <span className="font-semibold text-amber-300">full analysis will appear automatically</span> when the agent finishes.
                    </p>
                  </div>
                </div>
              )}

              {/* Agent finished with no output — clearer than rendering an empty markdown block */}
              {justEndedEmpty && !analysisRunning && (
                <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-400" />
                  <div className="text-xs text-amber-300 space-y-0.5">
                    <p className="font-semibold">Analysis ended with no output.</p>
                    <p className="text-amber-400/70 leading-relaxed">
                      The AI agent finished without producing any content — most likely the LLM call failed (rate limit, bad credentials, or model unavailable).
                      Check the backend logs and click <span className="font-medium text-amber-300">Re-analyze</span> to retry.
                    </p>
                  </div>
                </div>
              )}

              {/* Analysis content — streaming while running, saved when done */}
              {!justEndedEmpty && ((analysisRunning && streamedMarkdown) || anomaly.ai_analysis) ? (
                <div
                  ref={analysisScrollRef}
                  onScroll={onAnalysisScroll}
                  className={cn(
                  "max-h-125 overflow-y-auto rounded-lg border p-5 bg-slate-50 dark:bg-muted/20",
                  analysisRunning
                    ? "border-primary/40"
                    : "border-slate-200 dark:border-border"
                )}>
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h1: ({ children }) => <h1 className="mb-3 mt-5 border-b border-blue-200 pb-1.5 text-base font-bold text-blue-700 first:mt-0 dark:border-blue-900/50 dark:text-blue-400">{children}</h1>,
                      h2: ({ children }) => <h2 className="mb-2 mt-4 text-sm font-bold text-blue-600 first:mt-0 dark:text-blue-300">{children}</h2>,
                      h3: ({ children }) => <h3 className="mb-1.5 mt-3 text-sm font-semibold text-violet-700 first:mt-0 dark:text-violet-300">{children}</h3>,
                      p: ({ children }) => <p className="mb-2.5 text-sm leading-relaxed text-slate-700 last:mb-0 dark:text-slate-300">{children}</p>,
                      ul: ({ children }) => <ul className="mb-2.5 list-disc space-y-1 pl-5 text-sm text-slate-700 dark:text-slate-300">{children}</ul>,
                      ol: ({ children }) => <ol className="mb-2.5 list-decimal space-y-1 pl-5 text-sm text-slate-700 dark:text-slate-300">{children}</ol>,
                      li: ({ children }) => (
                        <li className="flex items-start gap-2 leading-relaxed">
                          <span className="text-blue-500 mt-0.5 shrink-0 text-xs">▸</span>
                          <span>{children}</span>
                        </li>
                      ),
                      strong: ({ children }) => <strong className="font-semibold text-slate-900 dark:text-white">{children}</strong>,
                      em: ({ children }) => <em className="italic text-slate-500 dark:text-slate-400">{children}</em>,
                      code: ({ children, className }) => {
                        const isBlock = className?.includes("language-");
                        return isBlock
                          ? <code className="block bg-slate-100 dark:bg-[#0a1628] border-l-2 border-blue-500 dark:border-blue-600 rounded-r-lg px-3 py-2.5 text-xs font-mono text-blue-800 dark:text-green-400 overflow-x-auto">{children}</code>
                          : <code className="bg-violet-50 dark:bg-violet-500/15 border border-violet-200 dark:border-violet-500/25 rounded px-1.5 py-0.5 text-xs font-mono text-violet-700 dark:text-violet-300">{children}</code>;
                      },
                      pre: ({ children }) => <pre className="my-3 rounded-lg overflow-hidden">{children}</pre>,
                      blockquote: ({ children }) => <blockquote className="border-l-2 border-blue-500 pl-3.5 py-0.5 my-2.5 bg-blue-50 dark:bg-blue-500/5 rounded-r italic text-slate-600 dark:text-slate-400">{children}</blockquote>,
                      hr: () => <hr className="border-slate-200 dark:border-slate-700 my-4" />,
                    }}
                  >
                    {(analysisRunning && streamedMarkdown) ? streamedMarkdown : anomaly.ai_analysis!}
                  </ReactMarkdown>
                  {analysisRunning && <TypingCursor />}
                </div>
              ) : analysisRunning ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  AI agent is gathering evidence, please wait…
                </div>
              ) : justEndedEmpty ? null /* banner above already explains the empty result */ : (
                <p className="text-sm text-muted-foreground">
                  No AI analysis available. Click &quot;Run Analysis&quot; to investigate this anomaly with the AI triage agent.
                </p>
              )}
            </div>

            {/* AI Status-Change Suggestions (only present when server is suggest-level
                and the agent has proposed dismiss/promote actions) */}
            <AiActionsForSource sourceType="anomaly" sourceId={id} serverId={anomaly.server_id} />

            {/* Manual Commands */}
            {anomaly.ai_manual_commands && anomaly.ai_manual_commands.length > 0 && (
              <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <Terminal className="h-3.5 w-3.5 text-violet-400" />
                    Manual Commands
                  </h3>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20">
                    run via terminal
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  These commands need sudo or an interactive session — copy and run them in the{" "}
                  <span className="font-medium text-foreground">Terminal</span> tab on the server page.
                </p>
                <div className="space-y-2">
                  {anomaly.ai_manual_commands.map((mc, i) => (
                    <ManualCommandCard key={i} command={mc.command} purpose={mc.purpose} note={mc.note} />
                  ))}
                </div>
              </div>
            )}

            {/* Suggested Commands */}
            {(commands.length > 0 || cmdTotal > 0) && (
              <div className="rounded-xl border border-border bg-card p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <Terminal className="h-3.5 w-3.5" />
                    Suggested Commands
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                      {cmdTotal}
                    </span>
                  </h3>
                  {pendingCommands.length > 0 && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleApproveSelected(pendingCommands.map((c) => c._id))}
                        disabled={approveCommands.isPending}
                        className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
                      >
                        Approve all
                      </button>
                      <button
                        onClick={() => handleRejectSelected(pendingCommands.map((c) => c._id))}
                        disabled={rejectCommands.isPending}
                        className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Dismiss all
                      </button>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  {commands.map((cmd) => (
                    <CommandCard
                      key={cmd._id}
                      cmd={cmd}
                      onApprove={() => handleApproveSelected([cmd._id])}
                      onReject={() => handleRejectSelected([cmd._id])}
                      approving={approveCommands.isPending}
                      rejecting={rejectCommands.isPending}
                      onViewDetails={() => setSelectedCmd(cmd)}
                    />
                  ))}
                </div>
                {cmdTotalPages > 1 && (
                  <div className="flex items-center justify-between pt-1">
                    <p className="text-xs text-muted-foreground tabular-nums">
                      Page {cmdPage} of {cmdTotalPages}
                    </p>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setCmdPage((p) => Math.max(1, p - 1))}
                        disabled={cmdPage <= 1}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setCmdPage((p) => Math.min(cmdTotalPages, p + 1))}
                        disabled={cmdPage >= cmdTotalPages}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="space-y-5 rounded-xl border border-border bg-card p-5">
              <DetailItem label="Type">
                <span className={cn("inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold capitalize", typeStyles[anomaly.type])}>
                  {anomaly.type === "volume" ? <TrendingUp className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
                  {anomaly.type}
                </span>
              </DetailItem>

              <DetailItem label="Score">
                <span className="font-mono text-sm">{anomaly.score}/10</span>
              </DetailItem>

              <DetailItem label="Detected">
                <p className="text-sm">{new Date(anomaly.detected_at).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{timeAgo(anomaly.detected_at)}</p>
              </DetailItem>

              {anomaly.log_timestamp && (
                <DetailItem label="Log timestamp">
                  <p className="text-sm">{new Date(anomaly.log_timestamp).toLocaleString()}</p>
                </DetailItem>
              )}

              {anomaly.reviewed_at && (
                <DetailItem label="Reviewed">
                  <p className="text-sm">{new Date(anomaly.reviewed_at).toLocaleString()}</p>
                </DetailItem>
              )}

              {anomaly.ai_analyzed_at && (
                <DetailItem label="AI analyzed">
                  <p className="text-sm">{new Date(anomaly.ai_analyzed_at).toLocaleString()}</p>
                </DetailItem>
              )}

              <DetailItem label="Server">
                <Link
                  href={`/servers/${anomaly.server_id}`}
                  className="flex items-center gap-1.5 text-sm text-primary hover:underline"
                >
                  <Server className="h-3.5 w-3.5" />
                  {anomaly.server_hostname || anomaly.server_id.slice(0, 12)}
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </DetailItem>

              {anomaly.log_id && (
                <DetailItem label="Log ID">
                  <span className="break-all font-mono text-xs">{anomaly.log_id}</span>
                </DetailItem>
              )}

              {anomaly.promoted_incident_id && (
                <DetailItem label="Promoted incident">
                  <Link
                    href={`/incidents/${anomaly.promoted_incident_id}`}
                    className="flex items-center gap-1.5 text-sm text-primary hover:underline"
                  >
                    {anomaly.promoted_incident_id.slice(-8)}
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </DetailItem>
              )}
            </div>

            {canReview && (
              <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  Review Actions
                </h3>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={onPromote}
                    disabled={promoteMutation.isPending}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                  >
                    <ArrowRight className="h-4 w-4" />
                    Promote to Incident
                  </button>
                  <button
                    onClick={onDismiss}
                    disabled={dismissMutation.isPending}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold transition-colors hover:bg-muted disabled:opacity-50"
                  >
                    <X className="h-4 w-4" />
                    Dismiss
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function DetailItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}
