"use client";

/**
 * Shared verdict pill + AI review renderer used by:
 *   - `/automation/history` detail modal (script execution review)
 *   - Incident detail page Auto-fix Review section
 *   - Commands tab CommandDetailModal (existing 28.1 impact analysis)
 *
 * Visuals are intentionally identical across surfaces — verdict pill colour,
 * root-cause pill, evidence list, markdown body. Pass either `analysisId`
 * (fetches via `useAiAnalysis`) or a pre-fetched `analysis` object.
 */
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";
import { useAiAnalysis } from "@/lib/hooks/use-ai-actions";
import type { ScriptReviewVerdict } from "@/lib/types";

export interface ImpactReviewBlockProps {
  // Either the analysis id (fetched here) OR a denormalised verdict + summary
  // that can render while the full markdown is still being fetched.
  analysisId?: string | null;
  verdict?: ScriptReviewVerdict | string | null;
  summary?: string | null;
  // Optional: indicates the upstream system is still working on this review.
  // Used when verdict is null and we want a spinner instead of empty state.
  pending?: boolean;
  // When true, no markdown body is rendered — just the verdict pill row.
  compact?: boolean;
  className?: string;
}

const VERDICT_LABEL: Record<string, string> = {
  resolved: "resolved",
  partial: "partial",
  no_effect: "no effect",
  made_worse: "made worse",
  review_failed: "review unavailable",
  in_progress: "review in progress",
};

const VERDICT_PILL: Record<string, string> = {
  resolved: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  partial: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  no_effect: "bg-muted text-muted-foreground border-border",
  made_worse: "bg-red-500/10 text-red-400 border-red-500/20",
  review_failed: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  in_progress: "bg-primary/10 text-primary border-primary/20",
};

const ROOT_CAUSE_PILL: Record<string, string> = {
  yes: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  partial: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  no: "bg-red-500/10 text-red-400 border-red-500/20",
  unknown: "bg-muted text-muted-foreground border-border",
};

export function VerdictPill({
  verdict,
  className,
  pending,
}: {
  verdict?: string | null;
  className?: string;
  /**
   * When true, render the "in_progress" styling regardless of the verdict
   * value. Used by surfaces (remediation detail page) where the review is
   * actively streaming and the persisted verdict may still be the previous
   * run's final state.
   */
  pending?: boolean;
}) {
  const effective = pending ? "in_progress" : verdict;
  if (!effective) return null;
  const label = VERDICT_LABEL[effective] ?? effective.replace(/_/g, " ");
  return (
    <span
      className={cn(
        "inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border whitespace-nowrap",
        VERDICT_PILL[effective] ?? "bg-muted text-muted-foreground border-border",
        className,
      )}
    >
      {label}
    </span>
  );
}

export function ImpactReviewBlock({
  analysisId,
  verdict,
  summary,
  pending,
  compact,
  className,
}: ImpactReviewBlockProps) {
  const { data: analysis, isLoading } = useAiAnalysis(analysisId ?? undefined);
  const structured = (analysis?.structured ?? {}) as {
    outcome?: string;
    addressed_root_cause?: "yes" | "partial" | "no" | "unknown";
    before_after_delta?: string;
    evidence?: string[];
    follow_up_required?: boolean;
    follow_up_reason?: string | null;
    next_recommended_action?: string | null;
    summary_one_line?: string;
  };

  const effectiveVerdict = verdict ?? structured.outcome ?? null;
  const effectiveSummary =
    summary ?? structured.summary_one_line ?? structured.before_after_delta ?? "";

  // Spinner state — review not yet written / still in flight.
  if (pending || effectiveVerdict === "in_progress") {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5 text-xs",
          className,
        )}
      >
        <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0 text-primary" />
        <span className="text-muted-foreground">
          AI is reviewing the run — this usually takes 10–20s.
        </span>
      </div>
    );
  }

  // Hard failure path — keep the modal visible but flag it.
  if (effectiveVerdict === "review_failed") {
    return (
      <div
        className={cn(
          "flex items-start gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-xs",
          className,
        )}
      >
        <AlertCircle className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
        <div className="space-y-0.5">
          <p className="font-semibold text-foreground">Review unavailable</p>
          <p className="text-muted-foreground">
            {effectiveSummary || "The AI review could not be generated for this run."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {/* Verdict + root-cause pill row */}
      <div className="flex items-center gap-2 flex-wrap">
        <VerdictPill verdict={effectiveVerdict ?? undefined} />
        {structured.addressed_root_cause && (
          <span
            className={cn(
              "inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border whitespace-nowrap",
              ROOT_CAUSE_PILL[structured.addressed_root_cause] ??
                "bg-muted text-muted-foreground border-border",
            )}
          >
            root cause: {structured.addressed_root_cause}
          </span>
        )}
        {effectiveVerdict === "resolved" && (
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
        )}
      </div>

      {/* One-line summary */}
      {effectiveSummary && (
        <p className="text-xs text-foreground/85 leading-relaxed">
          {effectiveSummary}
        </p>
      )}

      {/* Compact mode stops here — used on the row inline display */}
      {compact && <div className="hidden" />}

      {!compact && (
        <>
          {/* Evidence bullets */}
          {structured.evidence && structured.evidence.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Evidence
              </p>
              <ul className="space-y-0.5 text-[11px] text-foreground/85 leading-relaxed pl-1">
                {structured.evidence.map((e, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-primary mt-0.5 shrink-0">▸</span>
                    <span>{e}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Follow-up callout */}
          {(structured.follow_up_required || structured.next_recommended_action) && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                Recommended follow-up
              </p>
              {structured.follow_up_reason && (
                <p className="text-[11px] text-amber-200/90 leading-relaxed">
                  {structured.follow_up_reason}
                </p>
              )}
              {structured.next_recommended_action && (
                <p className="text-[11px] text-amber-100/90 leading-relaxed font-mono">
                  → {structured.next_recommended_action}
                </p>
              )}
            </div>
          )}

          {/* Full markdown body — loaded when analysisId is provided */}
          {analysisId && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Full review
              </p>
              {isLoading ? (
                <div className="text-xs text-muted-foreground animate-pulse">
                  Loading review…
                </div>
              ) : analysis ? (
                <div className="rounded-lg bg-muted/20 border border-border px-4 py-3 max-h-64 overflow-y-auto text-sm">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      p: ({ children }) => (
                        <p className="text-xs text-muted-foreground leading-relaxed mb-2">
                          {children}
                        </p>
                      ),
                      strong: ({ children }) => (
                        <strong className="text-foreground font-semibold">
                          {children}
                        </strong>
                      ),
                      code: ({ children }) => (
                        <code className="text-[11px] font-mono bg-muted px-1 rounded">
                          {children}
                        </code>
                      ),
                      ul: ({ children }) => (
                        <ul className="text-xs text-muted-foreground space-y-1 pl-3 mb-2 list-disc">
                          {children}
                        </ul>
                      ),
                    }}
                  >
                    {analysis.markdown}
                  </ReactMarkdown>
                </div>
              ) : null}
            </div>
          )}
        </>
      )}
    </div>
  );
}
