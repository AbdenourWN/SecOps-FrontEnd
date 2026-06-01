"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Brain, BrainCircuit, Loader2, RefreshCw, ServerOff, Terminal } from "lucide-react";
import { toast } from "sonner";
import { getFriendlyMessage } from "@/lib/errors";
import { useServerAiOverview, useServerLatestOverview } from "@/lib/hooks/use-servers";
import { useAiAnalysisStream } from "@/lib/hooks/use-ai-stream";
import { useStickToBottom } from "@/lib/hooks/use-stick-to-bottom";
import { TypingCursor } from "@/components/shared/typing-cursor";
import { ManualCommandCard } from "@/components/shared/manual-command-card";
import { cn } from "@/lib/utils";
import type { AiManualCommand, ServerResponse } from "@/lib/types";

interface AiOverviewTabProps {
  server: ServerResponse;
}

type WindowKey = 1 | 6 | 24;

const WINDOW_OPTIONS: { key: WindowKey; label: string }[] = [
  { key: 1, label: "1h" },
  { key: 6, label: "6h" },
  { key: 24, label: "24h" },
];

export function AiOverviewTab({ server }: AiOverviewTabProps) {
  const [hours, setHours] = useState<WindowKey>(24);

  const overview = useServerAiOverview();
  const { data: latest, isLoading: latestLoading } = useServerLatestOverview(server._id);

  const analysisRunning = overview.isPending || !!server.ai_analysis_in_progress;
  const { streamedMarkdown } = useAiAnalysisStream(
    "server",
    server._id,
    server._id,
    analysisRunning,
  );

  const cachedMarkdown = latest?.markdown ?? "";
  const displayMarkdown = analysisRunning && streamedMarkdown
    ? streamedMarkdown
    : cachedMarkdown;

  const manualCommands: AiManualCommand[] =
    (latest?.structured?.manual_commands as AiManualCommand[] | undefined) ?? [];

  // Sticky-to-bottom scroll while tokens are streaming in
  const { scrollRef, onScroll } = useStickToBottom<HTMLDivElement>(displayMarkdown);

  const handleRun = async () => {
    try {
      await overview.mutateAsync({ id: server._id, hours });
      toast.success("Server overview ready");
    } catch (err) {
      toast.error(getFriendlyMessage(err));
    }
  };

  const hasAnalysis = !!cachedMarkdown || !!streamedMarkdown;

  return (
    <div className="space-y-6">
      {/* Intro / header strip */}
      <div className="rounded-xl border border-border bg-card/40 p-4 space-y-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <BrainCircuit className="h-5 w-5 text-primary shrink-0" />
            <div className="min-w-0">
              <h2 className="text-sm font-bold">AI Server Overview</h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Whole-server diagnostic + risk analysis over a chosen time window.
                Produces a state summary, trend analysis, suspicious-activity flags, predictions,
                and a step-by-step manual command checklist.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Window pill toggle */}
            <div className="flex gap-1 p-1 rounded-lg bg-muted/40 border border-border">
              {WINDOW_OPTIONS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setHours(key)}
                  disabled={analysisRunning}
                  className={cn(
                    "px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors",
                    hours === key
                      ? "bg-background shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                    analysisRunning && "opacity-50 cursor-not-allowed",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            <button
              onClick={handleRun}
              disabled={analysisRunning}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors",
                "bg-primary text-primary-foreground hover:bg-primary/90",
                "disabled:opacity-60 disabled:cursor-not-allowed",
              )}
            >
              {analysisRunning ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Analyzing…
                </>
              ) : hasAnalysis ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5" />
                  Re-analyze
                </>
              ) : (
                <>
                  <Brain className="h-3.5 w-3.5" />
                  Run Analysis
                </>
              )}
            </button>
          </div>
        </div>

        {latest && !analysisRunning && (
          <p className="text-[11px] text-muted-foreground">
            Last analyzed{" "}
            <span className="font-semibold text-foreground">
              {new Date(latest.created_at).toLocaleString()}
            </span>{" "}
            · window {Math.round((latest.window_minutes ?? 0) / 60)}h · confidence{" "}
            {typeof latest.confidence === "number" ? Math.round(latest.confidence * 100) : 0}%
          </p>
        )}
      </div>

      {/* Empty state */}
      {!hasAnalysis && !latestLoading && !analysisRunning && (
        <div className="rounded-xl border border-dashed border-border bg-card/30 py-16 flex flex-col items-center text-center px-6">
          <ServerOff className="h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-semibold">No overview yet for this server</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-md leading-relaxed">
            Click <span className="font-semibold text-foreground">Run Analysis</span> to generate
            a whole-server AI report. The agent pulls metrics, logs, incidents, anomalies and
            remediation runs from the last {hours}h and produces a step-by-step diagnostic checklist.
          </p>
        </div>
      )}

      {/* Markdown report */}
      {(hasAnalysis || latestLoading) && (
        <div className="space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Report
          </p>
          {latestLoading && !displayMarkdown ? (
            <div className="h-40 rounded-lg bg-muted/40 animate-pulse" />
          ) : (
            <div
              ref={scrollRef}
              onScroll={onScroll}
              className={cn(
                "max-h-[600px] overflow-y-auto rounded-lg bg-slate-50 dark:bg-muted/20 border p-5",
                analysisRunning
                  ? "border-primary/40 shadow-[0_0_0_1px_rgba(var(--primary)/0.15)] animate-pulse-border"
                  : "border-slate-200 dark:border-border",
              )}
            >
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
                  table: ({ children }) => (
                    <div className="overflow-x-auto my-3">
                      <table className="w-full text-xs border border-border rounded-md">{children}</table>
                    </div>
                  ),
                  th: ({ children }) => <th className="text-left font-semibold px-2 py-1 border-b border-border bg-muted/40">{children}</th>,
                  td: ({ children }) => <td className="px-2 py-1 border-b border-border/50 align-top">{children}</td>,
                }}
              >
                {displayMarkdown}
              </ReactMarkdown>
              {analysisRunning && <TypingCursor />}
            </div>
          )}
        </div>
      )}

      {/* Manual commands — wrapped in the same violet-tinted card the incident
          detail page uses, so the section reads as a distinct "checklist" block
          rather than a continuation of the report. */}
      {manualCommands.length > 0 && !analysisRunning && (
        <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-5 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Terminal className="h-3.5 w-3.5 text-violet-400" />
              Manual Diagnostic Commands
            </h3>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20">
              run in your own shell
            </span>
            <span className="text-[10px] font-semibold text-muted-foreground ml-auto">
              {manualCommands.length} command{manualCommands.length === 1 ? "" : "s"}
            </span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Copy each command into an Administrator PowerShell / SSH session on the server. Each card
            explains the purpose, what output to expect, and the step-by-step follow-up if it fails.
          </p>
          <div className="space-y-2">
            {manualCommands.map((mc, i) => (
              <ManualCommandCard
                key={i}
                command={mc.command}
                purpose={mc.purpose}
                expected_output={mc.expected_output}
                steps={mc.steps}
                risk_level={mc.risk_level}
                os_type={mc.os_type}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
