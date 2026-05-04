"use client";

import { use } from "react";
import Link from "next/link";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ArrowLeft,
  ArrowRight,
  Brain,
  Clock,
  ExternalLink,
  FileText,
  RefreshCw,
  Server,
  Telescope,
  TrendingUp,
  X,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import {
  useAnomaly,
  useAnomalyAiAnalysis,
  useDismissAnomaly,
  usePromoteAnomaly,
} from "@/lib/hooks/use-anomalies";
import { cn, timeAgo } from "@/lib/utils";
import type {
  AnomalySeverity,
  AnomalyType,
  LogObservationStatus,
} from "@/lib/types";

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
          onClick: () => {
            window.location.href = `/incidents/${res.incident_id}`;
          },
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
      toast.success("AI analysis completed");
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
      <div className="space-y-6">
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
              <span
                className={cn(
                  "rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                  severityStyles[anomaly.severity]
                )}
              >
                {anomaly.severity}
              </span>
              <span
                className={cn(
                  "rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                  statusStyles[anomaly.status]
                )}
              >
                {statusLabel[anomaly.status]}
              </span>
            </div>
            <p className="mt-1 text-xs font-mono text-muted-foreground">
              ID: {anomaly._id}
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <Telescope className="h-3.5 w-3.5" />
                Heuristic Reasons
              </h3>
              <div className="flex flex-wrap gap-2">
                {anomaly.reasons.length > 0 ? (
                  anomaly.reasons.map((reason) => (
                    <span
                      key={reason}
                      className="rounded-md bg-muted/50 px-2 py-1 font-mono text-xs text-muted-foreground"
                    >
                      {reason}
                    </span>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No reasons recorded.</p>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <FileText className="h-3.5 w-3.5" />
                Log Message
              </h3>
              <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-border bg-muted/30 p-4 font-mono text-sm leading-relaxed">
                {anomaly.log_message || "(no log message)"}
              </pre>
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <Brain className="h-3.5 w-3.5" />
                  AI Analysis
                </h3>
                {!anomaly.ai_analysis && (
                  <button
                    onClick={onAnalyze}
                    disabled={aiAnalysis.isPending}
                    className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/20 disabled:opacity-50"
                  >
                    {aiAnalysis.isPending ? (
                      <>
                        <RefreshCw className="h-3 w-3 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Brain className="h-3 w-3" />
                        Run Analysis
                      </>
                    )}
                  </button>
                )}
              </div>

              {anomaly.ai_analysis ? (
                <div className="max-h-125 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-5 dark:border-border dark:bg-muted/20">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h1: ({ children }) => (
                        <h1 className="mb-3 mt-5 border-b border-blue-200 pb-1.5 text-base font-bold text-blue-700 first:mt-0 dark:border-blue-900/50 dark:text-blue-400">
                          {children}
                        </h1>
                      ),
                      h2: ({ children }) => (
                        <h2 className="mb-2 mt-4 text-sm font-bold text-blue-600 first:mt-0 dark:text-blue-300">
                          {children}
                        </h2>
                      ),
                      h3: ({ children }) => (
                        <h3 className="mb-1.5 mt-3 text-sm font-semibold text-violet-700 first:mt-0 dark:text-violet-300">
                          {children}
                        </h3>
                      ),
                      p: ({ children }) => (
                        <p className="mb-2.5 text-sm leading-relaxed text-slate-700 last:mb-0 dark:text-slate-300">
                          {children}
                        </p>
                      ),
                      ul: ({ children }) => (
                        <ul className="mb-2.5 list-disc space-y-1 pl-5 text-sm text-slate-700 dark:text-slate-300">
                          {children}
                        </ul>
                      ),
                      ol: ({ children }) => (
                        <ol className="mb-2.5 list-decimal space-y-1 pl-5 text-sm text-slate-700 dark:text-slate-300">
                          {children}
                        </ol>
                      ),
                      code: ({ children, className }) => {
                        const isBlock = className?.includes("language-");
                        return isBlock ? (
                          <code className="block overflow-x-auto rounded-r-lg border-l-2 border-blue-500 bg-slate-100 px-3 py-2.5 font-mono text-xs text-blue-800 dark:border-blue-600 dark:bg-[#0a1628] dark:text-green-400">
                            {children}
                          </code>
                        ) : (
                          <code className="rounded border border-violet-200 bg-violet-50 px-1.5 py-0.5 font-mono text-xs text-violet-700 dark:border-violet-500/25 dark:bg-violet-500/15 dark:text-violet-300">
                            {children}
                          </code>
                        );
                      },
                      pre: ({ children }) => (
                        <pre className="my-3 overflow-hidden rounded-lg">{children}</pre>
                      ),
                    }}
                  >
                    {anomaly.ai_analysis}
                  </ReactMarkdown>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No AI analysis available. Run analysis to generate a SOC review
                  using the current local Ollama integration.
                </p>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-5 rounded-xl border border-border bg-card p-5">
              <DetailItem label="Type">
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold capitalize",
                    typeStyles[anomaly.type]
                  )}
                >
                  {anomaly.type === "volume" ? (
                    <TrendingUp className="h-3.5 w-3.5" />
                  ) : (
                    <FileText className="h-3.5 w-3.5" />
                  )}
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

function DetailItem({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      {children}
    </div>
  );
}
