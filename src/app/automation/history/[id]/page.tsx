"use client";

import { use, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowLeft,
  Brain,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock,
  ExternalLink,
  FileText,
  Loader2,
  RefreshCw,
  Server as ServerIcon,
  Terminal,
  WifiOff,
  XCircle,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import {
  useRemediationRun,
  useAnalyzeRemediationRun,
} from "@/lib/hooks/use-scripts";
import { useAiAnalysisStream } from "@/lib/hooks/use-ai-stream";
import { useStickToBottom } from "@/lib/hooks/use-stick-to-bottom";
import { useAiAnalysis } from "@/lib/hooks/use-ai-actions";
import { TypingCursor } from "@/components/shared/typing-cursor";
import { AiActionsForSource } from "@/components/shared/ai-actions-for-source";
import { VerdictPill } from "@/components/shared/impact-review-block";
import { ManualCommandCard } from "@/components/shared/manual-command-card";
import { cn, timeAgo } from "@/lib/utils";

// ── Helpers ─────────────────────────────────────────────────────────────────────

function isEmptyAnalysisBody(md: string | null | undefined): boolean {
  if (!md) return false;
  const body = md
    .replace(/^## AI Script Execution Review\s*/i, "")
    .replace(/---[\s\S]*$/, "")
    .trim();
  return body.length === 0;
}

// ── Page ────────────────────────────────────────────────────────────────────────

export default function RemediationRunDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const { data: run, isLoading } = useRemediationRun(id);
  const analyze = useAnalyzeRemediationRun();

  // Optimistic "review running" flag set the moment the operator clicks
  // Run/Re-analyze. The /analyze endpoint is fire-and-forget — it returns
  // {status: "queued"} in ~50ms, so analyze.isPending alone collapses to
  // false long before the first WS token arrives, and the stream hook then
  // drops all tokens via its isRunningRef gate. This flag bridges the gap
  // between the click and the moment the DB-persisted verdict
  // "in_progress" comes back through query invalidation.
  const [analysisJustStarted, setAnalysisJustStarted] = useState(false);

  // Render-time clear (React docs pattern: "Adjusting state when a prop
  // changes"). Once the natural sources have caught up — either the DB
  // verdict flipped to in_progress, or the stream has completed — we drop
  // the optimistic flag and let the real state drive the UI.
  if (
    analysisJustStarted &&
    (run?.ai_review_verdict === "in_progress" ||
      run?.ai_review_verdict === "review_failed" ||
      run?.ai_review_verdict === "resolved" ||
      run?.ai_review_verdict === "partial" ||
      run?.ai_review_verdict === "no_effect" ||
      run?.ai_review_verdict === "made_worse")
  ) {
    setAnalysisJustStarted(false);
  }

  // Streaming hooks MUST be called before any conditional returns. Tolerates an
  // undefined server_id while the run is loading.
  const reviewInProgress =
    run?.ai_review_verdict === "in_progress" ||
    analyze.isPending ||
    analysisJustStarted;
  const { streamedMarkdown, gapDetected, streamCompleted } = useAiAnalysisStream(
    "automation_log",
    id,
    run?.server_id,
    reviewInProgress,
  );

  // Same render-time pattern — stream-complete also clears the optimistic flag.
  if (analysisJustStarted && streamCompleted) {
    setAnalysisJustStarted(false);
  }

  // The persisted analysis markdown lives in the ai_analysis collection — fetch
  // it via the existing hook once the review row is denormalised onto the log.
  const savedAnalysis = useAiAnalysis(run?.ai_review_id);
  const savedMarkdown = savedAnalysis.data?.markdown ?? "";

  // Choose what to render in the streaming pane: streamed-while-running takes
  // priority, fall back to the persisted analysis once complete.
  const analysisContent = (reviewInProgress && streamedMarkdown)
    ? streamedMarkdown
    : savedMarkdown;
  const { scrollRef: analysisScrollRef, onScroll: onAnalysisScroll } =
    useStickToBottom<HTMLDivElement>(analysisContent);

  const justEndedEmpty =
    streamCompleted && !streamedMarkdown && isEmptyAnalysisBody(savedMarkdown);

  const handleAnalyze = async () => {
    if (!run) return;
    // Flip optimistic-running flag BEFORE the network call so the WS
    // subscription's isRunningRef catches the first inbound token. The
    // fire-and-forget endpoint resolves before tokens arrive, so we can't
    // wait on the mutation.
    setAnalysisJustStarted(true);
    try {
      await analyze.mutateAsync(run._id);
      toast.success("AI review started — usually 10–20s");
    } catch (err) {
      setAnalysisJustStarted(false);
      toast.error((err as Error).message);
    }
  };

  if (isLoading) {
    return (
      <AppShell>
        <div className="space-y-6 animate-pulse p-6 md:p-10 max-w-6xl mx-auto">
          <div className="h-8 w-64 rounded bg-muted" />
          <div className="h-32 rounded-xl bg-muted" />
          <div className="h-64 rounded-xl bg-muted" />
        </div>
      </AppShell>
    );
  }

  if (!run) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-muted-foreground">Remediation run not found.</p>
          <Link
            href="/automation/history"
            className="mt-4 text-sm text-primary hover:underline"
          >
            Back to remediation history
          </Link>
        </div>
      </AppShell>
    );
  }

  const ok = run.status === "success";
  const hasSavedReview =
    !!run.ai_review_id ||
    (run.ai_review_verdict != null &&
      run.ai_review_verdict !== "review_failed" &&
      run.ai_review_verdict !== "in_progress");
  const reviewFailed = run.ai_review_verdict === "review_failed";

  return (
    <AppShell>
      <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-6">
        {/* Breadcrumb + back */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link
            href="/automation/history"
            className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Remediation history
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="font-mono">{run._id.slice(-8)}</span>
        </div>

        {/* Header card */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-3">
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase",
                    ok
                      ? "bg-success/15 text-success"
                      : "bg-danger/15 text-danger",
                  )}
                >
                  {ok ? (
                    <CheckCircle2 className="h-3 w-3" />
                  ) : (
                    <XCircle className="h-3 w-3" />
                  )}
                  {ok ? "Success" : "Failed"}
                </span>
                {run.ai_review_verdict && (
                  <VerdictPill
                    verdict={run.ai_review_verdict}
                    pending={reviewInProgress}
                  />
                )}
                <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
                  <Clock className="h-3 w-3" />
                  {new Date(run.executed_at).toLocaleString()} · {timeAgo(run.executed_at)}
                </span>
              </div>

              <h1 className="text-2xl font-bold tracking-tight">
                {run.script_name}
              </h1>
              {run.ai_review_summary && !reviewInProgress && (
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {run.ai_review_summary}
                </p>
              )}

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <MetaRow
                  icon={<ServerIcon className="h-3.5 w-3.5" />}
                  label="Server"
                  value={
                    <Link
                      href={`/servers/${run.server_id}`}
                      className="text-primary hover:underline font-mono"
                    >
                      {run.server_hostname}
                    </Link>
                  }
                />
                <MetaRow
                  icon={<Terminal className="h-3.5 w-3.5" />}
                  label="Script"
                  value={
                    <Link
                      href={`/automation/${run.script_id}`}
                      className="text-primary hover:underline truncate inline-flex items-center gap-1"
                    >
                      <span className="truncate">{run.script_name}</span>
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </Link>
                  }
                />
                <MetaRow
                  icon={<FileText className="h-3.5 w-3.5" />}
                  label="Triggering incident"
                  value={
                    run.incident_id ? (
                      <Link
                        href={`/incidents/${run.incident_id}`}
                        className="text-primary hover:underline font-mono inline-flex items-center gap-1"
                      >
                        <span>{run.incident_id.slice(-8)}</span>
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )
                  }
                />
              </div>
            </div>

            <button
              onClick={handleAnalyze}
              disabled={reviewInProgress}
              className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/20 disabled:opacity-50 self-start shrink-0"
            >
              {reviewInProgress ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Analyzing…
                </>
              ) : hasSavedReview ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5" />
                  Re-analyze
                </>
              ) : (
                <>
                  <Brain className="h-3.5 w-3.5" />
                  Run analysis
                </>
              )}
            </button>
          </div>
        </div>

        {/* Output + Error panels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <OutputPanel
            label="stdout"
            content={run.output}
            placeholder="No stdout captured."
          />
          <OutputPanel
            label="stderr / error"
            content={run.error}
            placeholder={run.status === "success" ? "Clean run — no stderr." : "No error captured."}
            danger={!!run.error}
          />
        </div>

        {/* AI Analysis (streaming) */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <Brain className="h-3.5 w-3.5" />
              AI Review
            </h3>
            {run.ai_review_verdict && !reviewInProgress && (
              <VerdictPill
                verdict={run.ai_review_verdict}
                pending={reviewInProgress}
              />
            )}
          </div>

          {/* Reconnect gap notice */}
          {gapDetected && reviewInProgress && (
            <div className="mb-3 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-linear-to-r from-amber-500/10 to-orange-500/5 px-4 py-3 shadow-sm">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 border border-amber-500/25">
                <WifiOff className="h-3.5 w-3.5 text-amber-400" />
              </div>
              <div className="min-w-0 space-y-0.5">
                <p className="text-xs font-semibold text-amber-300">
                  Reconnected mid-review
                </p>
                <p className="text-[11px] leading-relaxed text-amber-400/80">
                  Some output was streamed while you were away and couldn&apos;t be
                  recovered. The{" "}
                  <span className="font-semibold text-amber-300">
                    full review will appear automatically
                  </span>{" "}
                  when the agent finishes.
                </p>
              </div>
            </div>
          )}

          {reviewFailed && (
            <div className="mb-3 flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">
              <XCircle className="h-4 w-4 mt-0.5 shrink-0 text-red-400" />
              <div className="text-xs text-red-300 space-y-0.5">
                <p className="font-semibold">Review unavailable.</p>
                <p className="text-red-400/70 leading-relaxed">
                  {run.ai_review_summary || "The AI review failed."} Click
                  Re-analyze to retry.
                </p>
              </div>
            </div>
          )}

          {justEndedEmpty && !reviewInProgress && (
            <div className="mb-3 flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-400" />
              <div className="text-xs text-amber-300 space-y-0.5">
                <p className="font-semibold">Review ended with no output.</p>
                <p className="text-amber-400/70 leading-relaxed">
                  The AI agent finished without producing any content — likely
                  an LLM failure (rate limit, bad credentials, or model
                  unavailable). Click <span className="font-medium text-amber-300">Re-analyze</span> to retry.
                </p>
              </div>
            </div>
          )}

          {!justEndedEmpty && ((reviewInProgress && streamedMarkdown) || savedMarkdown) ? (
            <div
              ref={analysisScrollRef}
              onScroll={onAnalysisScroll}
              className={cn(
                "max-h-125 overflow-y-auto rounded-lg border p-5 bg-slate-50 dark:bg-muted/20",
                reviewInProgress
                  ? "border-primary/40"
                  : "border-slate-200 dark:border-border",
              )}
            >
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
                {(reviewInProgress && streamedMarkdown) ? streamedMarkdown : savedMarkdown}
              </ReactMarkdown>
              {reviewInProgress && <TypingCursor />}
            </div>
          ) : reviewInProgress ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              AI agent is reading the pre/post snapshots — usually 10–20s…
            </div>
          ) : !reviewFailed ? (
            <p className="text-sm text-muted-foreground">
              No AI review available. Click{" "}
              <span className="font-semibold text-foreground">Run analysis</span>{" "}
              to generate a verdict for this run.
            </p>
          ) : null}
        </div>

        {/* Manual checklist — denormalised onto the run via
            `suggest_manual_remediation` approval. The canonical store is the
            incident document (see Phase 28.5.2). Renders the same amber-accent
            style used on the incident detail page so the surfaces match. */}
        {run.ai_remediation_manual_commands &&
          run.ai_remediation_manual_commands.length > 0 && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5 space-y-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-amber-400" />
                  <h2 className="text-sm font-bold text-amber-300">
                    Post-Remediation Manual Checklist
                  </h2>
                  <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/20">
                    {run.ai_remediation_manual_commands.length} step
                    {run.ai_remediation_manual_commands.length === 1 ? "" : "s"}
                  </span>
                </div>
                {run.ai_remediation_manual_commands_meta?.incident_id && (
                  <Link
                    href={`/incidents/${run.ai_remediation_manual_commands_meta.incident_id}`}
                    className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                  >
                    View triggering incident
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                )}
              </div>

              <p className="text-xs text-amber-200/80 leading-relaxed">
                The AI agent reviewed this run and recommended the operator run
                these commands by hand instead of relying on further automation.
                Copy each one to a terminal on{" "}
                <span className="font-mono">{run.server_hostname}</span> and run
                it in order.
              </p>

              {run.ai_remediation_manual_commands_meta?.reason && (
                <div className="border-l-2 border-amber-400/50 pl-3 py-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-300/80 mb-0.5">
                    Why
                  </p>
                  <p className="text-[11px] italic text-amber-200/90 leading-relaxed">
                    {run.ai_remediation_manual_commands_meta.reason}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                {run.ai_remediation_manual_commands.map((mc, i) => (
                  <ManualCommandCard
                    key={i}
                    command={mc.command}
                    purpose={mc.purpose}
                    note={mc.note ?? undefined}
                  />
                ))}
              </div>
            </div>
          )}

        {/* AI Suggestion Actions for this remediation run.
            The shared component already filters by source_type+source_id,
            renders Pending/Approved/Rejected status, and provides one-click
            approve/reject. Each card now shows the full payload (script body,
            manual commands, regex pattern) plus a Why callout and auto-flip
            notice — operators can decide without leaving this page. */}
        {run.server_id && (
          <RelatedAiActions sourceId={id} serverId={run.server_id} />
        )}
      </div>
    </AppShell>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────────

function MetaRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2">
      <div className="mt-0.5 text-muted-foreground shrink-0">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
          {label}
        </p>
        <div className="mt-0.5 text-sm truncate">{value}</div>
      </div>
    </div>
  );
}

function OutputPanel({
  label,
  content,
  placeholder,
  danger,
}: {
  label: string;
  content: string | null | undefined;
  placeholder: string;
  danger?: boolean;
}) {
  const text = (content ?? "").trim();
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className={cn(
        "mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider",
        danger && text ? "text-danger" : "text-muted-foreground",
      )}>
        <Terminal className="h-3.5 w-3.5" />
        {label}
      </h3>
      {text ? (
        <pre className={cn(
          "p-4 rounded-lg text-xs font-mono overflow-x-auto max-h-72 overflow-y-auto whitespace-pre-wrap",
          danger
            ? "bg-danger/5 border border-danger/30 text-danger"
            : "bg-[#0f172a] text-green-400",
        )}>
          {text}
        </pre>
      ) : (
        <p className="text-xs text-muted-foreground italic py-2">{placeholder}</p>
      )}
    </div>
  );
}

function RelatedAiActions({
  sourceId,
  serverId,
}: {
  sourceId: string;
  serverId: string;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" />
          AI suggestion actions for this run
        </h2>
        <Link
          href={`/ai-actions?source_type=automation_log&source_id=${sourceId}`}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          Open in inbox
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>
      <AiActionsForSource
        sourceType="automation_log"
        sourceId={sourceId}
        serverId={serverId}
      />
    </div>
  );
}
