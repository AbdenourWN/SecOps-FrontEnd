"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BrainCircuit,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Server,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { DateRangeFilter, type DateRange } from "@/components/shared/date-range-filter";
import { cn } from "@/lib/utils";
import { useAiAnalysesList } from "@/lib/hooks/use-ai-actions";
import { useServers } from "@/lib/hooks/use-servers";
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

const ANALYSIS_TYPES: (AiAnalysisType | "all")[] = [
  "all",
  "incident_triage",
  "anomaly_triage",
  "command_impact",
  "server_overview",
  "script_execution_review",
];

function sourceHref(a: AiAnalysis): string | null {
  if (!a.source_id) return null;
  if (a.source_type === "incident") return `/incidents/${a.source_id}`;
  if (a.source_type === "anomaly") return `/anomalies/${a.source_id}`;
  if (a.source_type === "server") return `/servers/${a.source_id}`;
  if (a.source_type === "command") return null;
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

function AnalysisRow({ a }: { a: AiAnalysis }) {
  const typeColor = ANALYSIS_TYPE_COLOR[a.analysis_type] ?? "bg-muted text-muted-foreground border-border";
  const srcHref = sourceHref(a);
  const summary = a.summary || (a.markdown || "").slice(0, 180);
  return (
    <Link
      href={`/ai-analyses/${a._id}`}
      className="block rounded-xl border border-border bg-card/50 p-4 space-y-2 hover:border-primary/40 hover:bg-card transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <span className={cn("text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border", typeColor)}>
            {ANALYSIS_TYPE_LABEL[a.analysis_type] ?? a.analysis_type}
          </span>
          {typeof a.confidence === "number" && a.confidence > 0 && (
            <span className="text-[10px] font-semibold text-muted-foreground">
              confidence {Math.round(a.confidence * 100)}%
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground shrink-0 tabular-nums">
          {new Date(a.created_at).toLocaleString()}
        </p>
      </div>

      {summary && (
        <p className="text-sm text-foreground/90 line-clamp-2 leading-relaxed">{summary}</p>
      )}

      <div className="flex flex-wrap items-center gap-3 text-xs pt-1">
        {srcHref ? (
          <span className="flex items-center gap-1 font-semibold text-primary">
            {sourceLabel(a)} <ExternalLink className="h-3 w-3" />
          </span>
        ) : (
          <span className="text-muted-foreground">{sourceLabel(a)}</span>
        )}
        {a.server_id && (
          <span className="flex items-center gap-1 text-muted-foreground">
            <Server className="h-3 w-3" />
            {a.server_hostname || a.server_id.slice(-8)}
          </span>
        )}
        <span className="text-muted-foreground/70 font-mono text-[10px]">
          run_id: {a.run_id?.slice(0, 12) || "—"}
        </span>
      </div>
    </Link>
  );
}

// Numbered pagination — shows up to 7 page tokens at a time with ellipsis collapsing.
function NumberedPagination({
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

  // Build the visible page-token list — keeps width predictable on big result sets
  const tokens: (number | "…")[] = [];
  const pushRange = (a: number, b: number) => {
    for (let i = a; i <= b; i++) tokens.push(i);
  };
  if (totalPages <= 7) {
    pushRange(1, totalPages);
  } else if (page <= 4) {
    pushRange(1, 5);
    tokens.push("…", totalPages);
  } else if (page >= totalPages - 3) {
    tokens.push(1, "…");
    pushRange(totalPages - 4, totalPages);
  } else {
    tokens.push(1, "…");
    pushRange(page - 1, page + 1);
    tokens.push("…", totalPages);
  }

  return (
    <div className="flex items-center justify-between pt-2">
      <p className="text-xs text-muted-foreground tabular-nums">
        {from}–{to} of {total}
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
          className="flex items-center justify-center h-7 w-7 rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        {tokens.map((t, i) =>
          t === "…" ? (
            <span key={`e${i}`} className="text-xs text-muted-foreground px-1.5 select-none">
              …
            </span>
          ) : (
            <button
              key={t}
              onClick={() => onPage(t)}
              aria-current={t === page ? "page" : undefined}
              className={cn(
                "h-7 min-w-7 px-2 text-xs font-semibold rounded-lg border transition-colors tabular-nums",
                t === page
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {t}
            </button>
          ),
        )}
        <button
          onClick={() => onPage(page + 1)}
          disabled={page >= totalPages}
          aria-label="Next page"
          className="flex items-center justify-center h-7 w-7 rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export default function AiAnalysesPage() {
  const [typeFilter, setTypeFilter] = useState<AiAnalysisType | "all">("all");
  const [sourceTypeFilter, setSourceTypeFilter] = useState<"all" | "incident" | "anomaly" | "server" | "command">("all");
  const [serverId, setServerId] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange>({});
  const [page, setPage] = useState(1);

  const { data: serversData } = useServers();
  const servers = serversData?.results ?? [];

  const { data, isLoading } = useAiAnalysesList({
    analysis_type: typeFilter,
    source_type: sourceTypeFilter,
    server_id: serverId !== "all" ? serverId : undefined,
    from_date: dateRange.from ?? undefined,
    to_date: dateRange.to ?? undefined,
    page,
    page_size: 20,
  });

  const handleType = (val: AiAnalysisType | "all") => { setTypeFilter(val); setPage(1); };
  const handleSourceType = (val: typeof sourceTypeFilter) => { setSourceTypeFilter(val); setPage(1); };
  const handleServer = (val: string) => { setServerId(val); setPage(1); };
  const handleDate = (v: DateRange) => { setDateRange(v); setPage(1); };

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-6 pb-16">
        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <BrainCircuit className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold">AI Analyses</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Every analysis the AI agent has produced — triage reports for incidents and anomalies, command-impact reviews,
            and server overviews. Click any row to see the full report.
          </p>
        </div>

        {/* Filters */}
        <div className="space-y-2">
          {/* Analysis type */}
          <div className="flex flex-wrap gap-1 p-1 rounded-lg bg-muted/50 border border-border w-fit">
            {ANALYSIS_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => handleType(t)}
                className={cn(
                  "px-3 py-1.5 text-xs font-semibold rounded-md transition-colors",
                  typeFilter === t ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t === "all" ? "All types" : ANALYSIS_TYPE_LABEL[t]}
              </button>
            ))}
          </div>

          {/* Source type + server */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1 p-1 rounded-lg bg-muted/50 border border-border">
              {(["all", "incident", "anomaly", "server", "command"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => handleSourceType(t)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-semibold rounded-md transition-colors capitalize",
                    sourceTypeFilter === t ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t === "all" ? "All sources" : t === "incident" ? "Incidents" : t === "anomaly" ? "Anomalies" : t === "server" ? "Servers" : "Commands"}
                </button>
              ))}
            </div>

            {servers.length > 0 && (
              <Select value={serverId} onValueChange={(v) => handleServer(v ?? "all")}>
                <SelectTrigger className="h-8 w-45 text-xs font-semibold">
                  <Server className="h-3 w-3 mr-1 text-muted-foreground" />
                  <span className="truncate">
                    {serverId === "all"
                      ? "All servers"
                      : servers.find((s) => s._id === serverId)?.hostname ?? "Unknown server"}
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

            <DateRangeFilter value={dateRange} onChange={handleDate} />
          </div>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}
          </div>
        ) : !data?.results?.length ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <BrainCircuit className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No analyses match these filters.</p>
            <p className="text-xs text-muted-foreground/70 mt-1 max-w-xs">
              Analyses are produced when you run the AI agent on an incident, anomaly, or after a command executes.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.results.map((a) => <AnalysisRow key={a._id} a={a} />)}
            <NumberedPagination
              page={data.page}
              total={data.total}
              pageSize={data.page_size}
              onPage={setPage}
            />
          </div>
        )}
      </div>
    </AppShell>
  );
}
