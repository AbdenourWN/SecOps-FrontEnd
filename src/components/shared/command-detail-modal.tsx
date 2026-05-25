"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AlertTriangle, CheckCircle2, ExternalLink, Loader2, RefreshCw, ShieldOff, XCircle } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useAiAnalysis, useAiCommand, useRetryCommand } from "@/lib/hooks/use-ai-actions";
import type { AiCommand } from "@/lib/types";

const RISK_STYLES: Record<string, string> = {
  low: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  high: "bg-red-500/10 text-red-400 border-red-500/20",
};

function MetricRow({ label, pre, post }: { label: string; pre?: number | null; post?: number | null }) {
  if (pre == null && post == null) return null;
  const changed = pre != null && post != null && Math.abs(pre - post) > 0.1;
  return (
    <div className="flex items-center justify-between text-xs py-1 border-b border-border/50 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-mono font-semibold tabular-nums", changed ? "text-amber-400" : "text-foreground")}>
        {pre != null ? `${pre.toFixed(1)}%` : "—"} → {post != null ? `${post.toFixed(1)}%` : "—"}
      </span>
    </div>
  );
}

function StatusBanner({
  cmd,
  onRetry,
  isRetrying,
}: {
  cmd: AiCommand;
  onRetry: () => void;
  isRetrying: boolean;
}) {
  const isRetryable =
    cmd.status === "failed" ||
    (cmd.status === "completed" && cmd.exit_code != null && cmd.exit_code !== 0);

  if (cmd.status === "rejected") {
    return (
      <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2.5">
        <XCircle className="h-3.5 w-3.5 text-amber-400 mt-0.5 shrink-0" />
        <div className="text-xs text-amber-300 space-y-0.5">
          <p className="font-semibold">Rejected — this command was never executed.</p>
          {cmd.decided_by && (
            <p className="text-amber-400/70">
              Rejected by <strong>{cmd.decided_by}</strong>
              {cmd.decided_at ? ` on ${new Date(cmd.decided_at).toLocaleString()}` : ""}.
            </p>
          )}
        </div>
      </div>
    );
  }

  if (cmd.status === "blocked") {
    const reason = cmd.blocked_by_guardrail ?? "safety guardrail";
    return (
      <div className="flex items-start gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2.5">
        <ShieldOff className="h-3.5 w-3.5 text-red-400 mt-0.5 shrink-0" />
        <p className="text-xs text-red-300">
          <span className="font-semibold">Blocked by {reason}.</span>
          {" "}This command did not execute. Review the guardrail policy before re-submitting manually.
        </p>
      </div>
    );
  }

  if (cmd.status === "failed") {
    const errorText = cmd.stderr || cmd.error || "No additional details.";
    return (
      <div className="flex items-start justify-between gap-3 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2.5">
        <div className="flex items-start gap-2 min-w-0">
          <AlertTriangle className="h-3.5 w-3.5 text-red-400 mt-0.5 shrink-0" />
          <div className="text-xs text-red-300 min-w-0">
            <p className="font-semibold">Execution failed.</p>
            <p className="text-red-400/70 truncate mt-0.5">{errorText.split("\n")[0]}</p>
          </div>
        </div>
        {isRetryable && (
          <button
            onClick={onRetry}
            disabled={isRetrying}
            className="shrink-0 flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn("h-3 w-3", isRetrying && "animate-spin")} />
            {isRetrying ? "Queuing…" : "Retry"}
          </button>
        )}
      </div>
    );
  }

  if (cmd.status === "completed" && cmd.exit_code != null && cmd.exit_code !== 0) {
    return (
      <div className="flex items-start justify-between gap-3 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2.5">
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-400 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-300">
            <span className="font-semibold">Exited with code {cmd.exit_code}.</span>
            {" "}The command ran but returned a non-zero exit code. Check stderr below.
          </p>
        </div>
        <button
          onClick={onRetry}
          disabled={isRetrying}
          className="shrink-0 flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn("h-3 w-3", isRetrying && "animate-spin")} />
          {isRetrying ? "Queuing…" : "Retry"}
        </button>
      </div>
    );
  }

  if (cmd.status === "completed" && cmd.exit_code === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2.5">
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
        <p className="text-xs text-emerald-300">
          <span className="font-semibold">Completed successfully</span>
          {cmd.duration_ms != null ? ` in ${cmd.duration_ms} ms.` : "."}
        </p>
      </div>
    );
  }

  return null;
}

export function CommandDetailModal({
  cmd: initialCmd,
  onClose,
  sourceHref,
  sourceLabel,
}: {
  cmd: AiCommand;
  onClose: () => void;
  sourceHref?: string;
  sourceLabel?: string;
}) {
  // Subscribe to live command data — the parent only passes a snapshot, so
  // without this the impact analysis (written after execution finishes) never
  // appears until the modal is closed and reopened. `useAiCommand` polls every
  // 5s and invalidates on the `ai_actions` WS topic.
  const { data: liveCmd } = useAiCommand(initialCmd._id);
  const cmd = liveCmd ?? initialCmd;

  const { data: impact } = useAiAnalysis(cmd.impact_analysis_id);
  const retry = useRetryCommand();

  const handleRetry = () => {
    retry.mutate(cmd._id, { onSuccess: onClose });
  };

  // If stdout is empty, fall back to the error field so the operator always sees context
  const stdoutDisplay = cmd.stdout || null;
  const stdoutFallback = !cmd.stdout && cmd.error ? cmd.error : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-border shrink-0">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn("text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border", RISK_STYLES[cmd.risk_level] ?? RISK_STYLES.medium)}>
                {cmd.risk_level} risk
              </span>
              {cmd.is_read_only && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  diagnostic
                </span>
              )}
              <span className="text-[10px] text-muted-foreground uppercase font-semibold">{cmd.os_type}</span>
              {cmd.exit_code != null && (
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
            <code className="block text-sm font-mono text-foreground break-all leading-relaxed">
              {cmd.command}
            </code>
            <p className="text-xs text-muted-foreground">{cmd.purpose}</p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 h-7 w-7 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <XCircle className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {/* Status banner — always rendered when relevant */}
          <StatusBanner cmd={cmd} onRetry={handleRetry} isRetrying={retry.isPending} />

          {/* Execution metadata */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            {([
              ["Status", cmd.status],
              ["Duration", cmd.duration_ms != null ? `${cmd.duration_ms} ms` : "—"],
              ["Executed at", cmd.executed_at ? new Date(cmd.executed_at).toLocaleString() : "—"],
              ["Decided by", cmd.decided_by ?? "—"],
            ] as [string, string][]).map(([label, value]) => (
              <div key={label} className="rounded-lg bg-muted/30 px-3 py-2">
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wide mb-0.5">{label}</p>
                <p className="font-semibold capitalize">{value}</p>
              </div>
            ))}

            {/* Server — always shown */}
            <div className="rounded-lg bg-muted/30 px-3 py-2">
              <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wide mb-0.5">Server</p>
              <Link
                href={`/servers/${cmd.server_id}`}
                onClick={onClose}
                className="font-semibold text-primary hover:underline flex items-center gap-1 truncate"
              >
                {cmd.server_hostname || cmd.server_id.slice(0, 12)}
                <ExternalLink className="h-3 w-3 shrink-0" />
              </Link>
            </div>

            {/* Source — only when passed (ai-actions page) */}
            {sourceHref && sourceLabel && (
              <div className="rounded-lg bg-muted/30 px-3 py-2">
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wide mb-0.5">Source</p>
                <Link
                  href={sourceHref}
                  onClick={onClose}
                  className="font-semibold text-primary hover:underline flex items-center gap-1 truncate"
                >
                  {sourceLabel}
                  <ExternalLink className="h-3 w-3 shrink-0" />
                </Link>
              </div>
            )}
          </div>

          {/* stdout */}
          <div>
            <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wide mb-1.5">
              stdout
              {!stdoutDisplay && !stdoutFallback && (
                <span className="normal-case font-normal ml-1">(empty)</span>
              )}
              {stdoutFallback && (
                <span className="normal-case font-normal ml-1 text-amber-400/70">(no stdout — error surfaced)</span>
              )}
            </p>
            {stdoutDisplay ? (
              <pre className="rounded-lg bg-black/40 border border-border px-3 py-2.5 text-[11px] font-mono text-green-400 whitespace-pre-wrap overflow-x-auto max-h-40 overflow-y-auto">
                {stdoutDisplay}
              </pre>
            ) : stdoutFallback ? (
              <pre className="rounded-lg bg-amber-950/30 border border-amber-500/20 px-3 py-2.5 text-[11px] font-mono text-amber-300 whitespace-pre-wrap overflow-x-auto max-h-40 overflow-y-auto">
                {stdoutFallback}
              </pre>
            ) : (
              <p className="text-xs text-muted-foreground italic">No output.</p>
            )}
          </div>

          {/* stderr */}
          {cmd.stderr && (
            <div>
              <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wide mb-1.5 flex items-center gap-1.5">
                stderr
                <span className="text-red-400 normal-case font-normal">(non-empty)</span>
              </p>
              <pre className="rounded-lg bg-red-950/30 border border-red-500/20 px-3 py-2.5 text-[11px] font-mono text-red-300 whitespace-pre-wrap overflow-x-auto max-h-40 overflow-y-auto">
                {cmd.stderr}
              </pre>
            </div>
          )}

          {/* Before / after metrics */}
          {(cmd.pre_snapshot || cmd.post_snapshot) && (
            <div>
              <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wide mb-2">
                Server State (before → after)
              </p>
              <div className="rounded-lg border border-border bg-muted/20 px-4 py-3">
                <MetricRow label="CPU"  pre={cmd.pre_snapshot?.metrics.cpu_usage}  post={cmd.post_snapshot?.metrics.cpu_usage} />
                <MetricRow label="RAM"  pre={cmd.pre_snapshot?.metrics.ram_usage}  post={cmd.post_snapshot?.metrics.ram_usage} />
                <MetricRow label="Disk" pre={cmd.pre_snapshot?.metrics.disk_usage} post={cmd.post_snapshot?.metrics.disk_usage} />
                {cmd.pre_snapshot?.open_incidents_count != null && (
                  <div className="flex items-center justify-between text-xs py-1">
                    <span className="text-muted-foreground">Open incidents</span>
                    <span className="font-mono font-semibold tabular-nums">
                      {cmd.pre_snapshot.open_incidents_count} → {cmd.post_snapshot?.open_incidents_count ?? "—"}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* AI Impact Analysis */}
          {(cmd.impact_analysis_id || cmd.status === "completed") && (
            <div>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wide">AI Impact Analysis</p>
                {cmd.impact_verdict && (
                  <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border", {
                    "bg-emerald-500/10 text-emerald-400 border-emerald-500/20": cmd.impact_verdict === "resolved",
                    "bg-amber-500/10 text-amber-400 border-amber-500/20": cmd.impact_verdict === "partial",
                    "bg-muted text-muted-foreground border-border": cmd.impact_verdict === "no_effect",
                    "bg-red-500/10 text-red-400 border-red-500/20": cmd.impact_verdict === "made_worse",
                  })}>
                    {cmd.impact_verdict.replace(/_/g, " ")}
                  </span>
                )}
                {cmd.impact_addressed_root_cause && (
                  <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border", {
                    "bg-emerald-500/10 text-emerald-400 border-emerald-500/20": cmd.impact_addressed_root_cause === "yes",
                    "bg-amber-500/10 text-amber-400 border-amber-500/20": cmd.impact_addressed_root_cause === "partial",
                    "bg-red-500/10 text-red-400 border-red-500/20": cmd.impact_addressed_root_cause === "no",
                    "bg-muted text-muted-foreground border-border": cmd.impact_addressed_root_cause === "unknown",
                  })}>
                    root cause: {cmd.impact_addressed_root_cause}
                  </span>
                )}
              </div>
              {!cmd.impact_analysis_id ? (
                <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0 text-primary" />
                  <span>Analyzing impact… the AI is comparing before/after state. This usually takes 10-20s.</span>
                </div>
              ) : impact ? (
                <div className="rounded-lg bg-muted/20 border border-border px-4 py-3 max-h-64 overflow-y-auto text-sm">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      p: ({ children }) => <p className="text-xs text-muted-foreground leading-relaxed mb-2">{children}</p>,
                      strong: ({ children }) => <strong className="text-foreground font-semibold">{children}</strong>,
                      code: ({ children }) => <code className="text-[11px] font-mono bg-muted px-1 rounded">{children}</code>,
                    }}
                  >
                    {impact.markdown}
                  </ReactMarkdown>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground animate-pulse">Loading impact analysis…</div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 px-6 py-3 border-t border-border flex items-center justify-between">
          <p className="text-[10px] text-muted-foreground font-mono">
            {cmd._id} · run {cmd.run_id}
            {cmd.retry_of && <span className="ml-1 text-amber-400/60">· retry of {cmd.retry_of.slice(-8)}</span>}
          </p>
          <button onClick={onClose} className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
