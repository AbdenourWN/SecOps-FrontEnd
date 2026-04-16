"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { useLogSearch } from "@/lib/hooks/use-logs";
import { useServers } from "@/lib/hooks/use-servers";
import { Search, Terminal, List, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LogLevel } from "@/lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PAGE_SIZE = 50;

const logLevelColor: Record<string, string> = {
  critical: "text-white bg-red-600 border border-red-500",
  error:    "text-white bg-orange-600 border border-orange-500",
  warning:  "text-black bg-yellow-400 border border-yellow-300",
  info:     "text-white bg-green-600 border border-green-500",
  debug:    "text-zinc-200 bg-zinc-700 border border-zinc-600",
};

function formatTimestamp(ts: string) {
  const d = new Date(ts);
  const date = d.toLocaleDateString([], { year: "2-digit", month: "2-digit", day: "2-digit" });
  const time = d.toLocaleTimeString([], { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
  return { date, time };
}

export default function LogsPage() {
  // Input state (controlled form fields)
  const [query, setQuery] = useState("");
  const [serverId, setServerId] = useState("");
  const [level, setLevel] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Committed search state — only updated when Execute is clicked
  const [committedFilters, setCommittedFilters] = useState<{
    q?: string;
    server_id?: string;
    level?: LogLevel;
    from_date?: string;
    to_date?: string;
  }>({});
  const [hasSearched, setHasSearched] = useState(true);
  const [page, setPage] = useState(1);

  const searchParams = {
    ...committedFilters,
    skip: (page - 1) * PAGE_SIZE,
    limit: PAGE_SIZE,
  };

  const { data, isLoading } = useLogSearch(searchParams, hasSearched);
  const { data: serversData } = useServers({ page_size: 100 });
  const servers = serversData?.results ?? [];

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 1;

  const handleSearch = () => {
    setCommittedFilters({
      q: query || undefined,
      server_id: serverId && serverId !== "all" ? serverId : undefined,
      level: level && level !== "all" ? (level as LogLevel) : undefined,
      from_date: fromDate ? `${fromDate}T00:00:00.000Z` : undefined,
      to_date: toDate ? `${toDate}T23:59:59.999Z` : undefined,
    });
    setPage(1);
    setHasSearched(true);
  };

  return (
    <AppShell>
      <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-6 flex flex-col h-[calc(100vh-64px)]">

        {/* Header & Search Bar */}
        <div className="flex-none">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-500 text-xs font-bold mb-4 border border-blue-500/20">
            <List className="h-3.5 w-3.5" />
            TELEMETRY
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight bg-linear-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
            Log Explorer
          </h1>
          <p className="text-muted-foreground mt-2 max-w-xl leading-relaxed mb-6">
            Query across millions of decentralized log lines gathered instantly from connected edge nodes.
          </p>

          <div className="bg-card/50 backdrop-blur-md border border-border rounded-2xl p-4 md:p-6 shadow-xl relative overflow-visible">
            <div className="absolute top-0 right-10 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 pointer-events-none" />

            {/* Row 1: Search + Node + Severity */}
            <div className="flex flex-col md:flex-row items-end gap-4 relative z-10">
              <div className="flex-1 w-full relative group">
                <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-2 block">Search Query</label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="e.g. `invalid password for root`"
                    className="w-full pl-12 pr-4 py-3 rounded-xl bg-background border border-border focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-sm font-mono text-sm"
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  />
                </div>
              </div>

              <div className="w-full md:w-48 shrink-0">
                <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-2 block">Target Node</label>
                <Select value={serverId || "all"} onValueChange={(v) => v && setServerId(v === "all" ? "" : v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Infrastructure</SelectItem>
                    {servers.map((s) => (
                      <SelectItem key={s._id} value={s._id}>{s.hostname}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-full md:w-36 shrink-0">
                <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-2 block">Severity</label>
                <Select value={level || "all"} onValueChange={(v) => v && setLevel(v === "all" ? "" : v)}>
                  <SelectTrigger className="w-full capitalize">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any Level</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 2: Date range + Execute */}
            <div className="flex flex-col md:flex-row items-end gap-4 mt-4 relative z-10">
              <div className="flex items-center gap-2 text-muted-foreground shrink-0 pb-2.5">
                <CalendarDays className="h-4 w-4" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Date Range</span>
              </div>
              <div className="flex-1 flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-2 block">From</label>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-background border border-border focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-sm text-sm"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-2 block">To</label>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-background border border-border focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-sm text-sm"
                  />
                </div>
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                <button
                  onClick={() => {
                    setQuery("");
                    setServerId("");
                    setLevel("");
                    setFromDate("");
                    setToDate("");
                    setCommittedFilters({});
                    setPage(1);
                  }}
                  className="flex-1 md:flex-none px-4 py-3 rounded-xl border border-border text-muted-foreground font-bold hover:text-foreground hover:border-foreground/30 hover:bg-muted/50 transition-all text-sm"
                >
                  Clear
                </button>
                <button
                  onClick={handleSearch}
                  className="flex-1 md:flex-none px-8 py-3 rounded-xl bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  Execute
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Results Area */}
        <div className="flex-1 bg-card rounded-2xl border border-border overflow-hidden flex flex-col min-h-175 mb-20">
          {/* Results Header */}
          <div className="px-6 py-3 border-b border-border bg-muted/20 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Streaming Output</span>
            </div>
            {data && (
              <div className="text-xs text-muted-foreground font-medium">
                Matched <span className="text-foreground font-bold">{data.total.toLocaleString()}</span> lines (showing {data.showing})
              </div>
            )}
          </div>

          {/* Log rows */}
          <div className="flex-1 overflow-y-auto p-4 space-y-0.5 font-mono text-[13px]">
            {isLoading ? (
              [...Array(15)].map((_, i) => (
                <div key={i} className="flex gap-4 p-2">
                  <div className="h-4 w-40 bg-muted rounded animate-pulse" />
                  <div className="h-4 w-14 bg-muted rounded animate-pulse" />
                  <div className="h-4 w-full bg-muted rounded animate-pulse opacity-50" />
                </div>
              ))
            ) : !data?.results || data.results.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-20">
                <Terminal className="h-10 w-10 mb-4 opacity-20" />
                <p>No log records match your current query.</p>
              </div>
            ) : (
              data.results.map((log: any, index: number) => {
                const { date, time } = formatTimestamp(log.timestamp);
                const globalIndex = (page - 1) * PAGE_SIZE + index + 1;
                return (
                  <div
                    key={index}
                    className="flex flex-col sm:flex-row gap-2 sm:gap-4 p-2 hover:bg-muted/50 rounded-md transition-colors cursor-text group items-start"
                  >
                    {/* Line number + date + time */}
                    <div className="shrink-0 w-55 flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground/40 group-hover:text-muted-foreground/70 w-7 shrink-0 tabular-nums">
                        {String(globalIndex).padStart(4, "0")}
                      </span>
                      <span className="tabular-nums text-[12px]">
                        <span className="text-sky-400 font-semibold">{date}</span>
                        <span className="text-muted-foreground/40 mx-1">·</span>
                        <span className="text-foreground/80 font-mono">{time}</span>
                      </span>
                    </div>

                    {/* Severity badge */}
                    <div className="shrink-0 w-22.5">
                      <span className={cn(
                        "px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider",
                        logLevelColor[(log.level as string).toLowerCase()] ?? "text-muted-foreground bg-muted border border-border"
                      )}>
                        {(log.level as string).toLowerCase()}
                      </span>
                    </div>

                    {/* Server hostname */}
                    <div className="shrink-0 w-30 truncate text-primary/70">
                      {servers.find((s) => s._id === log.server_id)?.hostname ?? log.server_id}
                    </div>

                    {/* Message */}
                    <div className="flex-1 break-all text-foreground/90 whitespace-pre-wrap">
                      {log.message}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination — docked to bottom of the card */}
          {hasSearched && totalPages > 1 && (
            <div className="shrink-0 border-t border-border px-6 py-3 flex items-center justify-between bg-muted/10">
              <p className="text-xs text-muted-foreground font-mono">
                Page <span className="text-foreground font-semibold">{page}</span> of{" "}
                <span className="text-foreground font-semibold">{totalPages}</span>
                {" · "}
                <span className="text-foreground font-semibold">{data?.total.toLocaleString() ?? 0}</span> total
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-border bg-card hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >«</button>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-border bg-card hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >Prev</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                  .reduce<(number | "…")[]>((acc, p, idx, arr) => {
                    if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("…");
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((item, idx) =>
                    item === "…" ? (
                      <span key={`e-${idx}`} className="px-2 text-xs text-muted-foreground">…</span>
                    ) : (
                      <button
                        key={item}
                        onClick={() => setPage(item as number)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors",
                          page === item
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border bg-card hover:bg-muted"
                        )}
                      >{item}</button>
                    )
                  )}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-border bg-card hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >Next</button>
                <button
                  onClick={() => setPage(totalPages)}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-border bg-card hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >»</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
