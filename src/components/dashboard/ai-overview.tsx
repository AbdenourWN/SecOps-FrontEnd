"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { Sparkles, Loader2, RefreshCw, Bot } from "lucide-react";

import { useAiOverview, useGenerateAiOverview } from "@/lib/hooks/use-dashboard";
import { useAiAnalysisStream } from "@/lib/hooks/use-ai-stream";
import { useStickToBottom } from "@/lib/hooks/use-stick-to-bottom";
import { TypingCursor } from "@/components/shared/typing-cursor";
import { cn, timeAgo } from "@/lib/utils";

/**
 * App-wide AI overview card — replaces the old (mock) severity-trend chart.
 *
 * On-demand only: nothing runs until the admin clicks Generate. The result
 * streams in live over the `app.ai` WS topic and is persisted, so revisiting
 * the dashboard shows the last overview (with a "generated X ago" stamp)
 * without burning another LLM call.
 */
export function AiOverview() {
  const { data: overview, isLoading, refetch } = useAiOverview();
  const generate = useGenerateAiOverview();

  // Optimistic "running" flag — set on click, before the fire-and-forget POST
  // returns, so the stream hook's gate is open when the first token lands.
  const [justStarted, setJustStarted] = useState(false);

  const isRunning = justStarted || generate.isPending;

  const { streamedMarkdown, streamCompleted } = useAiAnalysisStream(
    "app",
    "global",
    undefined,
    isRunning,
    "app.ai",
  );

  // Render-time clear (React docs pattern) — once the stream finishes, drop the
  // optimistic flag so the persisted result takes over.
  if (justStarted && streamCompleted) setJustStarted(false);

  // When the stream completes, refetch the persisted overview so the saved
  // markdown + timestamp replace the streamed buffer.
  useEffect(() => {
    if (streamCompleted) refetch();
  }, [streamCompleted, refetch]);

  const savedMarkdown = overview?.markdown ?? "";
  const content = isRunning ? streamedMarkdown : savedMarkdown || streamedMarkdown;
  const hasContent = content.trim().length > 0;

  const { scrollRef, onScroll } = useStickToBottom<HTMLDivElement>(content);

  const handleGenerate = async () => {
    setJustStarted(true);
    try {
      await generate.mutateAsync();
    } catch (err) {
      setJustStarted(false);
      toast.error((err as Error).message || "Failed to start AI overview");
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card px-5 py-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="h-4 w-4 text-primary shrink-0" />
          <h3 className="text-sm font-semibold truncate">AI Platform Overview</h3>
          {overview?.created_at && !isRunning && (
            <span className="text-[11px] text-muted-foreground shrink-0">
              · {timeAgo(overview.created_at)}
            </span>
          )}
        </div>
        <button
          onClick={handleGenerate}
          disabled={isRunning}
          className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/20 disabled:opacity-50 shrink-0"
        >
          {isRunning ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Analyzing…
            </>
          ) : hasContent ? (
            <>
              <RefreshCw className="h-3.5 w-3.5" />
              Regenerate
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5" />
              Generate
            </>
          )}
        </button>
      </div>

      {/* Body */}
      {isLoading ? (
        <div className="space-y-2 animate-pulse">
          <div className="h-4 w-2/3 rounded bg-muted" />
          <div className="h-4 w-full rounded bg-muted" />
          <div className="h-4 w-5/6 rounded bg-muted" />
        </div>
      ) : hasContent ? (
        <div
          ref={scrollRef}
          onScroll={onScroll}
          className={cn(
            "min-h-96 max-h-160 overflow-y-auto rounded-lg border p-4 bg-slate-50 dark:bg-muted/20",
            isRunning ? "border-primary/40" : "border-slate-200 dark:border-border",
          )}
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h2: ({ children }) => (
                <h2 className="mb-1.5 mt-4 text-xs font-bold uppercase tracking-wider text-blue-600 first:mt-0 dark:text-blue-300">
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="mb-1 mt-3 text-sm font-semibold text-violet-700 first:mt-0 dark:text-violet-300">
                  {children}
                </h3>
              ),
              p: ({ children }) => (
                <p className="mb-2.5 text-sm leading-relaxed text-slate-700 last:mb-0 dark:text-slate-300">
                  {children}
                </p>
              ),
              ul: ({ children }) => (
                <ul className="mb-2.5 space-y-1 pl-1 text-sm text-slate-700 dark:text-slate-300">
                  {children}
                </ul>
              ),
              li: ({ children }) => (
                <li className="flex items-start gap-2 leading-relaxed">
                  <span className="mt-0.5 shrink-0 text-xs text-blue-500">▸</span>
                  <span>{children}</span>
                </li>
              ),
              strong: ({ children }) => (
                <strong className="font-semibold text-slate-900 dark:text-white">
                  {children}
                </strong>
              ),
              code: ({ children }) => (
                <code className="rounded bg-violet-50 px-1.5 py-0.5 font-mono text-xs text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
                  {children}
                </code>
              ),
            }}
          >
            {content}
          </ReactMarkdown>
          {isRunning && <TypingCursor />}
        </div>
      ) : isRunning ? (
        <div className="flex min-h-96 items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          Reading server status, incidents, anomalies and automation activity…
        </div>
      ) : (
        <div className="flex min-h-96 flex-col items-center justify-center gap-3 py-10 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
            <Bot className="h-6 w-6 text-primary" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold">No overview yet</p>
            <p className="max-w-sm text-xs text-muted-foreground leading-relaxed">
              Generate an AI summary of the whole platform — server status,
              incidents, anomalies and automation — in one quick read.
            </p>
          </div>
          <button
            onClick={handleGenerate}
            className="mt-1 flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Generate overview
          </button>
        </div>
      )}
    </div>
  );
}
