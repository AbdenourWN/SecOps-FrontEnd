"use client";

import { AppShell } from "@/components/layout/app-shell";
import {
  useIncident,
  useUpdateIncidentStatus,
  useAiAnalysis,
} from "@/lib/hooks/use-incidents";
import {
  useAiCommandsForSource,
  useApproveCommands,
  useRejectCommands,
} from "@/lib/hooks/use-ai-actions";
import { CommandDetailModal } from "@/components/shared/command-detail-modal";
import { AiActionsForSource } from "@/components/shared/ai-actions-for-source";
import { ManualCommandCard } from "@/components/shared/manual-command-card";
import { ImpactReviewBlock } from "@/components/shared/impact-review-block";
import { useAnalyzeRemediationRun } from "@/lib/hooks/use-scripts";
import { TypingCursor } from "@/components/shared/typing-cursor";
import { SeverityBadge, timeAgo } from "@/components/shared/badges";
import { cn } from "@/lib/utils";
import { RISK_STYLES } from "@/lib/constants";
import { STATUS_ICON } from "@/components/shared/command-status-icon";
import {
  ArrowLeft,
  Brain,
  ChevronLeft,
  ChevronRight,
  ClipboardCopy,
  Eye,
  RefreshCw,
  Server,
  Clock,
  Shield,
  Terminal,
  Loader2,
  FileText,
  ExternalLink,
  AlertTriangle,
  WifiOff,
} from "lucide-react";
import type { AiCommand } from "@/lib/types";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { use, useState } from "react";
import { useAiAnalysisStream } from "@/lib/hooks/use-ai-stream";
import { useStickToBottom } from "@/lib/hooks/use-stick-to-bottom";
import { toast } from "sonner";
import { getFriendlyMessage } from "@/lib/errors";
import Link from "next/link";
import type { IncidentStatus } from "@/lib/types";

// ManualCommandCard now lives in @/components/shared/manual-command-card and is
// shared with the anomaly detail page + the AI Overview tab on the server page.

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
    <div
      className={cn(
        "rounded-lg border p-3 space-y-2 transition-colors",
        cmd.status === "pending" ? "border-amber-500/20 bg-amber-500/5" :
        cmd.status === "executing" ? "border-blue-500/20 bg-blue-500/5" :
        cmd.status === "completed" ? "border-emerald-500/20 bg-emerald-500/5" :
        cmd.status === "blocked" ? "border-red-500/20 bg-red-500/5" :
        "border-border bg-card/50"
      )}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 min-w-0">
          <div className="mt-0.5 shrink-0">{STATUS_ICON[cmd.status]}</div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn("text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border", RISK_STYLES[cmd.risk_level] ?? RISK_STYLES.medium)}>
                {cmd.risk_level}
              </span>
              {cmd.is_read_only && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  diagnostic
                </span>
              )}
              <span className="text-[10px] text-muted-foreground">{cmd.os_type}</span>
            </div>
            <code className="block text-xs font-mono mt-1 text-foreground break-all">{cmd.command}</code>
            <p className="text-xs text-muted-foreground mt-0.5">{cmd.purpose}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          {/* Timestamp — show decided_at prominently for any decided row so
              you can spot the most-recent decision. Pending rows fall back
              to created_at. */}
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

      {/* Blocked reason */}
      {cmd.status === "blocked" && cmd.error && (
        <p className="text-xs text-red-400">{cmd.error}</p>
      )}

      {/* Impact verdict summary */}
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

export default function IncidentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: incident, isLoading } = useIncident(id);
  const updateStatus = useUpdateIncidentStatus();
  const aiAnalysis = useAiAnalysis();
  const analysisRunning = aiAnalysis.isPending || !!incident?.ai_analysis_in_progress;
  const { streamedMarkdown, gapDetected, streamCompleted } = useAiAnalysisStream("incident", id, incident?.server_id, analysisRunning);
  const analysisContent = (analysisRunning && streamedMarkdown) ? streamedMarkdown : (incident?.ai_analysis ?? "");
  const { scrollRef: analysisScrollRef, onScroll: onAnalysisScroll } = useStickToBottom<HTMLDivElement>(analysisContent);
  // Empty-output detection: the agent finished (or just-ended) and the platform
  // saved an analysis row whose markdown is just the "## AI Triage Analysis"
  // header + footer with no body. This happens when the LLM call fails before
  // producing any tokens — we surface a clear retry message instead of an empty box.
  const isEmptyAnalysis = (md: string | null | undefined): boolean => {
    if (!md) return false;
    const body = md.replace(/^## AI Triage Analysis\s*/i, "").replace(/---[\s\S]*$/, "").trim();
    return body.length === 0;
  };
  const justEndedEmpty = streamCompleted && !streamedMarkdown && isEmptyAnalysis(incident?.ai_analysis);
  const [cmdPage, setCmdPage] = useState(1);
  const { data: commandsData } = useAiCommandsForSource("incident", id, incident?.server_id, cmdPage);
  const approveCommands = useApproveCommands();
  const rejectCommands = useRejectCommands();
  const [selectedCmd, setSelectedCmd] = useState<AiCommand | null>(null);

  const commands = commandsData?.results ?? [];
  const pendingCommands = commands.filter((c) => c.status === "pending");
  const cmdTotal = commandsData?.total ?? 0;
  const cmdTotalPages = Math.max(1, Math.ceil(cmdTotal / 10));

  const handleApproveSelected = async (ids: string[]) => {
    try {
      await approveCommands.mutateAsync({ command_ids: ids });
      toast.success(`${ids.length} command(s) queued for execution`);
    } catch (err) {
      toast.error(getFriendlyMessage(err));
    }
  };

  const handleRejectSelected = async (ids: string[]) => {
    try {
      await rejectCommands.mutateAsync({ command_ids: ids });
      toast.success(`${ids.length} command(s) dismissed`);
    } catch (err) {
      toast.error(getFriendlyMessage(err));
    }
  };

  const handleStatusChange = async (newStatus: IncidentStatus) => {
    try {
      await updateStatus.mutateAsync({ id, status: newStatus });
      toast.success(`Status updated to ${newStatus.replace("_", " ")}`);
    } catch (err) {
      toast.error(getFriendlyMessage(err));
    }
  };

  const handleAiAnalysis = async () => {
    try {
      await aiAnalysis.mutateAsync(id);
      toast.success("AI analysis complete — see Suggested Commands below");
    } catch (err) {
      toast.error(getFriendlyMessage(err));
    }
  };

  if (isLoading) {
    return (
      <AppShell>
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-64 bg-muted rounded" />
          <div className="h-64 bg-muted rounded-xl" />
        </div>
      </AppShell>
    );
  }

  if (!incident) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-muted-foreground">Incident not found.</p>
          <Link
            href="/incidents"
            className="mt-4 text-sm text-primary hover:underline"
          >
            Back to incidents
          </Link>
        </div>
      </AppShell>
    );
  }

  const statuses: IncidentStatus[] = [
    "open",
    "verifying",
    "investigating",
    "resolved",
    "false_positive",
  ];

  return (
    <AppShell>
      {selectedCmd && (
        <CommandDetailModal cmd={selectedCmd} onClose={() => setSelectedCmd(null)} />
      )}
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link
            href="/incidents"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">Incident Detail</h1>
              <SeverityBadge severity={incident.severity} />
            </div>
            <p className="text-xs text-muted-foreground font-mono mt-1">
              ID: {incident._id}
            </p>
          </div>
        </div>

        {/* Automation skipped banner */}
        {incident.automation_skipped_reason && (
          <div className={cn(
            "flex items-start gap-3 rounded-xl border px-4 py-3 text-sm",
            incident.automation_skipped_reason === "script_disabled"
              ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
              : "bg-red-500/10 border-red-500/30 text-red-400"
          )}>
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <span className="font-semibold">
                {incident.automation_skipped_reason === "script_disabled"
                  ? "Automation skipped — linked script is disabled."
                  : "Automation skipped — linked script was deleted."}
              </span>
              <span className="ml-1 text-muted-foreground">
                {incident.automation_skipped_reason === "script_disabled"
                  ? "Alert was sent instead. Re-enable the script in the Automation page to restore auto-remediation."
                  : "Alert was sent instead. Link a new script to this rule to restore auto-remediation."}
              </span>
            </div>
          </div>
        )}

        {/* Remediation exhausted banner */}
        {incident.automation_failure_reason === "remediation_exhausted" && (
          <div className="flex items-start gap-3 rounded-xl border px-4 py-3 text-sm bg-red-500/10 border-red-500/30 text-red-400">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <span className="font-semibold">
                Auto-remediation exhausted — failed {incident.remediation_attempts ?? 0}× without resolving the issue.
              </span>
              <span className="ml-1 text-muted-foreground">
                The system has stopped retrying for this server + rule. Investigate manually, then resolve this incident to re-arm auto-remediation. If the linked script is the wrong fix for this server, disable it in the Automation page.
              </span>
            </div>
          </div>
        )}

        {/* Verifying banner */}
        {incident.status === "verifying" && incident.automation_failure_reason !== "remediation_exhausted" && (
          <div className="flex items-start gap-3 rounded-xl border px-4 py-3 text-sm bg-cyan-500/10 border-cyan-500/30 text-cyan-400">
            <RefreshCw className="h-4 w-4 mt-0.5 shrink-0 animate-spin" />
            <div>
              <span className="font-semibold">
                Verifying remediation
                {(incident.remediation_attempts ?? 0) > 1 && ` (attempt ${incident.remediation_attempts}/3)`}
                {" — "}
                {incident.verification_until
                  ? `auto-resolves at ${new Date(incident.verification_until).toLocaleTimeString()} unless the rule re-fires.`
                  : "auto-resolves when the verification window passes without recurrence."}
              </span>
              <span className="ml-1 text-muted-foreground">
                If the underlying problem persists, this incident will be retried (up to 3×) before escalating.
              </span>
            </div>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <FileText className="h-3.5 w-3.5" />
                Description
              </h3>
              <p className="text-sm leading-relaxed">{incident.description}</p>
            </div>

            {/* Auto-fix Review — Phase 28.4. Only shown when a remediation actually ran for this incident. */}
            {incident.latest_remediation && (
              <AutoFixReviewCard
                incidentId={incident._id}
                latest={incident.latest_remediation}
              />
            )}

            {/* Context */}
            {incident.context && Object.keys(incident.context).length > 0 && (
              <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                  Context
                </h3>
                <div className="space-y-2">
                  {Object.entries(incident.context).map(([key, value]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between rounded-lg bg-muted/30 px-4 py-2.5"
                    >
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {key}
                      </span>
                      <span className="font-mono text-sm">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI Analysis */}
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Brain className="h-3.5 w-3.5" />
                  AI Analysis
                </h3>
                <button
                  onClick={handleAiAnalysis}
                  disabled={analysisRunning}
                  className="flex items-center gap-2 rounded-lg bg-primary/10 text-primary px-3 py-1.5 text-xs font-semibold hover:bg-primary/20 transition-colors disabled:opacity-50"
                >
                  {analysisRunning ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Analyzing…
                    </>
                  ) : incident.ai_analysis ? (
                    <>
                      <RefreshCw className="h-3 w-3" />
                      Re-analyze
                    </>
                  ) : (
                    <>
                      <Brain className="h-3 w-3" />
                      Run Analysis
                    </>
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
              {!justEndedEmpty && ((analysisRunning && streamedMarkdown) || incident.ai_analysis) ? (
                <div
                  ref={analysisScrollRef}
                  onScroll={onAnalysisScroll}
                  className={cn(
                  "max-h-125 overflow-y-auto rounded-lg bg-slate-50 dark:bg-muted/20 border p-5",
                  analysisRunning
                    ? "border-primary/40 shadow-[0_0_0_1px_rgba(var(--primary)/0.15)] animate-pulse-border"
                    : "border-slate-200 dark:border-border"
                )}>
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h1: ({ children }) => <h1 className="text-base font-bold text-blue-700 dark:text-blue-400 border-b border-blue-200 dark:border-blue-900/50 pb-1.5 mb-3 mt-5 first:mt-0">{children}</h1>,
                      h2: ({ children }) => <h2 className="text-sm font-bold text-blue-600 dark:text-blue-300 mb-2 mt-4 first:mt-0">{children}</h2>,
                      h3: ({ children }) => <h3 className="text-sm font-semibold text-violet-700 dark:text-violet-300 mb-1.5 mt-3 first:mt-0">{children}</h3>,
                      p: ({ children }) => <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 mb-2.5 last:mb-0">{children}</p>,
                      ul: ({ children }) => <ul className="space-y-1 mb-2.5 text-sm text-slate-700 dark:text-slate-300 pl-1">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 mb-2.5 text-sm text-slate-700 dark:text-slate-300">{children}</ol>,
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
                    {(analysisRunning && streamedMarkdown) ? streamedMarkdown : incident.ai_analysis!}
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
                  No AI analysis available. Click &quot;Run Analysis&quot; to
                  investigate this incident with the AI triage agent.
                </p>
              )}
            </div>

            {/* AI Status-Change Suggestions (only present when server is suggest-level
                and the agent has proposed dismiss/promote/mark-false-positive actions) */}
            <AiActionsForSource sourceType="incident" sourceId={id} serverId={incident.server_id} />

            {/* Manual Commands */}
            {incident.ai_manual_commands && incident.ai_manual_commands.length > 0 && (
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
                  {incident.ai_manual_commands.map((mc, i) => (
                    <ManualCommandCard key={i} command={mc.command} purpose={mc.purpose} note={mc.note} />
                  ))}
                </div>
              </div>
            )}

            {/* Phase 28.5.2 — Manual Commands from the post-remediation review.
                Kept distinct from the triage-produced `ai_manual_commands`
                above so neither overwrites the other. The amber accent
                signals "the automation didn't fix this — here's what the
                AI suggests doing by hand." Links back to the remediation
                run that produced these via the meta sub-doc. */}
            {incident.ai_remediation_manual_commands && incident.ai_remediation_manual_commands.length > 0 && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5 space-y-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                      Post-Remediation Manual Checklist
                    </h3>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      AI-suggested after auto-fix
                    </span>
                  </div>
                  {incident.ai_remediation_manual_commands_meta?.automation_log_id && (
                    <Link
                      href={`/automation/history/${incident.ai_remediation_manual_commands_meta.automation_log_id}`}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-300 hover:text-amber-200 transition-colors"
                    >
                      View remediation run
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  )}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  The post-execution AI review concluded the auto-fix didn&apos;t address the root cause and proposed this manual checklist instead. The triage commands above are unchanged — these are an <span className="font-medium text-amber-300">additional</span> set tied to the most recent remediation attempt.
                </p>
                {incident.ai_remediation_manual_commands_meta?.reason && (
                  <p className="text-[11px] text-amber-200/80 italic border-l-2 border-amber-500/40 pl-2.5">
                    {incident.ai_remediation_manual_commands_meta.reason}
                  </p>
                )}
                <div className="space-y-2">
                  {incident.ai_remediation_manual_commands.map((mc, i) => (
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
            <div className="rounded-xl border border-border bg-card p-5 space-y-5">
              {/* Status */}
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">
                  Status
                </label>
                <Select
                  value={incident.status}
                  onValueChange={(v) => handleStatusChange(v as IncidentStatus)}
                >
                  <SelectTrigger className="w-full h-9 text-sm font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statuses.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s
                          .replace("_", " ")
                          .replace(/\b\w/g, (c) => c.toUpperCase())}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Severity */}
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">
                  Severity
                </label>
                <SeverityBadge severity={incident.severity} />
              </div>

              {/* Detected */}
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block flex items-center gap-1.5">
                  <Clock className="h-3 w-3" />
                  Detected
                </label>
                <p className="text-sm">
                  {new Date(incident.detected_at).toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">
                  {timeAgo(incident.detected_at)}
                </p>
              </div>

              {/* Resolved */}
              {incident.resolved_at && (
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block">
                    Resolved
                  </label>
                  <p className="text-sm">
                    {new Date(incident.resolved_at).toLocaleString()}
                  </p>
                </div>
              )}

              {/* Rule */}
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Shield className="h-3 w-3" />
                  Detection Rule
                </label>
                <Link
                  href={`/rules/${incident.rule_id}`}
                  className="flex items-center gap-1.5 text-sm text-primary hover:underline"
                >
                  {incident.rule_id.slice(0, 12)}…{" "}
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>

              {/* Server */}
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Server className="h-3 w-3" />
                  Server
                </label>
                <Link
                  href={`/servers/${incident.server_id}`}
                  className="flex items-center gap-1.5 text-sm text-primary hover:underline"
                >
                  {incident.server_hostname || incident.server_id.slice(0, 12)}
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 28.4 — Auto-fix Review card
//
// Shown when the incident's latest_remediation field is populated (the AI
// post-execution review for the most recent automation run on this incident).
// Renders the shared `ImpactReviewBlock` plus a "Run Analysis / Re-analyze"
// button so the operator can manually trigger or refresh the review if the
// server's `script_review_enabled` toggle was off at execution time.
// ─────────────────────────────────────────────────────────────────────────────
function AutoFixReviewCard({
  latest,
}: {
  incidentId: string;
  latest: NonNullable<
    import("@/lib/types").IncidentResponse["latest_remediation"]
  >;
}) {
  const analyze = useAnalyzeRemediationRun();
  const reviewInProgress =
    latest.ai_review_verdict === "in_progress" || analyze.isPending;
  const hasReview =
    !!latest.ai_review_id ||
    (latest.ai_review_verdict != null &&
      latest.ai_review_verdict !== "review_failed" &&
      latest.ai_review_verdict !== "in_progress");
  const reviewFailed = latest.ai_review_verdict === "review_failed";

  const handleAnalyze = async () => {
    try {
      await analyze.mutateAsync(latest.automation_log_id);
      toast.success("AI review started — usually 10–20s");
    } catch (err) {
      toast.error(getFriendlyMessage(err));
    }
  };

  return (
    <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-5 space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <Brain className="h-3.5 w-3.5 text-violet-400" />
          Auto-fix Review
          {latest.script_name && (
            <span className="text-muted-foreground/60 normal-case font-normal">
              · {latest.script_name}
            </span>
          )}
        </h3>
        <button
          onClick={handleAnalyze}
          disabled={reviewInProgress}
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors",
            "bg-primary text-primary-foreground hover:bg-primary/90",
            "disabled:opacity-60 disabled:cursor-not-allowed",
          )}
        >
          {reviewInProgress ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              Analyzing…
            </>
          ) : hasReview || reviewFailed ? (
            <>
              <RefreshCw className="h-3 w-3" />
              Re-analyze
            </>
          ) : (
            <>
              <Brain className="h-3 w-3" />
              Run Analysis
            </>
          )}
        </button>
      </div>

      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <span
          className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold",
            latest.status === "success"
              ? "bg-success/15 text-success"
              : "bg-danger/15 text-danger",
          )}
        >
          {latest.status === "success" ? "SUCCESS" : "FAILED"}
        </span>
        {latest.executed_at && (
          <span className="font-mono">
            {new Date(latest.executed_at).toLocaleString()}
          </span>
        )}
        <Link
          href="/automation/history"
          className="ml-auto inline-flex items-center gap-1 text-primary hover:underline"
        >
          Full history
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>

      {!hasReview && !reviewFailed && !reviewInProgress && (
        <p className="text-xs text-muted-foreground leading-relaxed">
          No AI review yet for this auto-fix run. Click{" "}
          <span className="font-semibold text-foreground">Run Analysis</span> to
          have the AI compare pre/post-execution state and judge whether the
          script addressed the root cause.
        </p>
      )}

      {(hasReview || reviewFailed || reviewInProgress) && (
        <ImpactReviewBlock
          analysisId={latest.ai_review_id ?? undefined}
          verdict={latest.ai_review_verdict}
          summary={latest.ai_review_summary}
          pending={reviewInProgress && !latest.ai_review_id}
        />
      )}
    </div>
  );
}
