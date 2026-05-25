"use client";

import { use } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ArrowLeft,
  BrainCircuit,
  Clock,
  ExternalLink,
  Hash,
  Loader2,
  Server,
  Target,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { cn } from "@/lib/utils";
import { useAiAnalysis } from "@/lib/hooks/use-ai-actions";
import { useServer } from "@/lib/hooks/use-servers";
import type { AiAnalysis, AiAnalysisType } from "@/lib/types";

const ANALYSIS_TYPE_LABEL: Record<AiAnalysisType, string> = {
  incident_triage: "Incident Triage",
  anomaly_triage: "Anomaly Triage",
  server_overview: "Server Overview",
  script_execution_review: "Script Review",
  command_impact: "Command Impact",
};

const ANALYSIS_TYPE_COLOR: Record<AiAnalysisType, string> = {
  incident_triage: "bg-red-500/10 text-red-400 border-red-500/20",
  anomaly_triage: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  server_overview: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  script_execution_review: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  command_impact: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};

function sourceHref(a: AiAnalysis): string | null {
  if (!a.source_id) return null;
  if (a.source_type === "incident") return `/incidents/${a.source_id}`;
  if (a.source_type === "anomaly") return `/anomalies/${a.source_id}`;
  if (a.source_type === "server") return `/servers/${a.source_id}`;
  return null;
}

function sourceLabel(a: AiAnalysis): string {
  if (!a.source_id) return "—";
  const short = a.source_id.slice(-8);
  if (a.source_type === "incident") return `Incident ${short}`;
  if (a.source_type === "anomaly") return `Anomaly ${short}`;
  if (a.source_type === "server") return `Server ${short}`;
  if (a.source_type === "command") return `Command ${short}`;
  return short;
}

function MetaCell({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-card/40 px-3 py-2.5 space-y-1">
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className="text-sm font-medium text-foreground break-words">{children}</div>
    </div>
  );
}

function StructuredView({ data }: { data: Record<string, unknown> }) {
  const entries = Object.entries(data || {});
  if (!entries.length) return null;
  return (
    <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        Structured Output
      </p>
      <div className="space-y-2 text-xs">
        {entries.map(([key, value]) => (
          <div key={key} className="space-y-1">
            <p className="font-semibold text-foreground">{key}</p>
            <pre className="rounded-md bg-background/60 border border-border px-3 py-2 text-[11px] font-mono whitespace-pre-wrap break-words text-muted-foreground">
              {typeof value === "string" ? value : JSON.stringify(value, null, 2)}
            </pre>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AiAnalysisDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: a, isLoading, error } = useAiAnalysis(id);

  // Hostname enrichment — list endpoint denormalizes it, the single-row endpoint
  // does not, so we resolve it here when we have a server_id and no hostname yet.
  const { data: server } = useServer(a?.server_id ?? "");
  const serverHostname = a?.server_hostname || server?.hostname || "";

  if (isLoading) {
    return (
      <AppShell>
        <div className="max-w-3xl mx-auto py-20 flex items-center justify-center text-muted-foreground gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading analysis…
        </div>
      </AppShell>
    );
  }

  if (error || !a) {
    return (
      <AppShell>
        <div className="max-w-3xl mx-auto py-20 text-center space-y-3">
          <BrainCircuit className="h-10 w-10 text-muted-foreground/30 mx-auto" />
          <p className="text-sm text-muted-foreground">Analysis not found.</p>
          <Link href="/ai-analyses" className="text-sm font-semibold text-primary hover:underline">
            ← Back to all analyses
          </Link>
        </div>
      </AppShell>
    );
  }

  const typeColor = ANALYSIS_TYPE_COLOR[a.analysis_type] ?? "bg-muted text-muted-foreground border-border";
  const srcHref = sourceHref(a);

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-6 pb-16">
        {/* Back link */}
        <Link
          href="/ai-analyses"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All analyses
        </Link>

        {/* Header */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <BrainCircuit className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold">AI Analysis</h1>
            <span className={cn("text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border", typeColor)}>
              {ANALYSIS_TYPE_LABEL[a.analysis_type] ?? a.analysis_type}
            </span>
          </div>
          {a.summary && (
            <p className="text-sm text-foreground/90 leading-relaxed">{a.summary}</p>
          )}
        </div>

        {/* Metadata grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <MetaCell icon={Clock} label="Created">
            <span className="text-xs">{new Date(a.created_at).toLocaleString()}</span>
          </MetaCell>
          <MetaCell icon={Target} label="Anchored at">
            <span className="text-xs">{a.anchored_at ? new Date(a.anchored_at).toLocaleString() : "—"}</span>
          </MetaCell>
          <MetaCell icon={Clock} label="Window">
            <span className="text-xs">{a.window_minutes ? `${a.window_minutes} min` : "—"}</span>
          </MetaCell>
          <MetaCell icon={Hash} label="Confidence">
            <span className="text-xs">
              {typeof a.confidence === "number" && a.confidence > 0
                ? `${Math.round(a.confidence * 100)}%`
                : "—"}
            </span>
          </MetaCell>
        </div>

        {/* Source + server links */}
        <div className="rounded-xl border border-border bg-card/40 p-4 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Links
          </p>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            {srcHref ? (
              <Link
                href={srcHref}
                className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline"
              >
                {sourceLabel(a)}
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            ) : (
              <span className="text-muted-foreground">{sourceLabel(a)}</span>
            )}
            {a.server_id && (
              <Link
                href={`/servers/${a.server_id}`}
                className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Server className="h-3.5 w-3.5" />
                {serverHostname || a.server_id.slice(-8)}
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground/80 font-mono pt-1">
            <span>run_id: {a.run_id || "—"}</span>
            <span>analysis_id: {a._id}</span>
          </div>
        </div>

        {/* Markdown body */}
        {a.markdown && (
          <div className="rounded-xl border border-border bg-slate-50 dark:bg-muted/20 p-5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">
              Report
            </p>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ children }) => (
                  <h1 className="text-base font-bold text-blue-700 dark:text-blue-400 border-b border-blue-200 dark:border-blue-900/50 pb-1.5 mb-3 mt-5 first:mt-0">{children}</h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-sm font-bold text-blue-600 dark:text-blue-300 mb-2 mt-4 first:mt-0">{children}</h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-sm font-semibold text-violet-700 dark:text-violet-300 mb-1.5 mt-3 first:mt-0">{children}</h3>
                ),
                p: ({ children }) => (
                  <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 mb-2.5 last:mb-0">{children}</p>
                ),
                ul: ({ children }) => (
                  <ul className="space-y-1 mb-2.5 text-sm text-slate-700 dark:text-slate-300 pl-1">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal list-inside space-y-1 mb-2.5 text-sm text-slate-700 dark:text-slate-300">{children}</ol>
                ),
                li: ({ children }) => (
                  <li className="flex items-start gap-2 leading-relaxed">
                    <span className="text-blue-500 mt-0.5 shrink-0 text-xs">▸</span>
                    <span>{children}</span>
                  </li>
                ),
                strong: ({ children }) => (
                  <strong className="font-semibold text-slate-900 dark:text-white">{children}</strong>
                ),
                em: ({ children }) => (
                  <em className="italic text-slate-500 dark:text-slate-400">{children}</em>
                ),
                code: ({ children, className }) => {
                  const isBlock = className?.includes("language-");
                  return isBlock ? (
                    <code className="block bg-slate-100 dark:bg-[#0a1628] border-l-2 border-blue-500 dark:border-blue-600 rounded-r-lg px-3 py-2.5 text-xs font-mono text-blue-800 dark:text-green-400 overflow-x-auto">{children}</code>
                  ) : (
                    <code className="bg-violet-50 dark:bg-violet-500/15 border border-violet-200 dark:border-violet-500/25 rounded px-1.5 py-0.5 text-xs font-mono text-violet-700 dark:text-violet-300">{children}</code>
                  );
                },
                pre: ({ children }) => <pre className="my-3 rounded-lg overflow-hidden">{children}</pre>,
                blockquote: ({ children }) => (
                  <blockquote className="border-l-2 border-blue-500 pl-3.5 py-0.5 my-2.5 bg-blue-50 dark:bg-blue-500/5 rounded-r italic text-slate-600 dark:text-slate-400">{children}</blockquote>
                ),
                hr: () => <hr className="border-slate-200 dark:border-slate-700 my-4" />,
                table: ({ children }) => (
                  <div className="overflow-x-auto my-3">
                    <table className="w-full text-xs border border-border rounded-md">{children}</table>
                  </div>
                ),
                th: ({ children }) => (
                  <th className="text-left font-semibold px-2 py-1 border-b border-border bg-muted/40">{children}</th>
                ),
                td: ({ children }) => (
                  <td className="px-2 py-1 border-b border-border/50 align-top">{children}</td>
                ),
              }}
            >
              {a.markdown}
            </ReactMarkdown>
          </div>
        )}

        {/* Structured */}
        {a.structured && Object.keys(a.structured).length > 0 && (
          <StructuredView data={a.structured} />
        )}
      </div>
    </AppShell>
  );
}
