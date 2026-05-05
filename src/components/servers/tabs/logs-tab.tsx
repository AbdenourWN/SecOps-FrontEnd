"use client";

import { useState } from "react";
import { Search, Terminal, CalendarDays } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLogSearch } from "@/lib/hooks/use-logs";
import { cn, localDateToUtcIso } from "@/lib/utils";
import type { LogLevel } from "@/lib/types";

const PAGE_SIZE = 25;

const logLevelColor: Record<string, string> = {
  critical: "text-white bg-red-600 border border-red-500",
  error: "text-white bg-orange-600 border border-orange-500",
  warning: "text-black bg-yellow-400 border border-yellow-300",
  info: "text-white bg-green-600 border border-green-500",
  debug: "text-zinc-200 bg-zinc-700 border border-zinc-600",
};

function formatTimestamp(ts: string) {
  const d = new Date(ts);
  return {
    date: d.toLocaleDateString([], {
      year: "2-digit",
      month: "2-digit",
      day: "2-digit",
    }),
    time: d.toLocaleTimeString([], {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
  };
}

interface LogsTabProps {
  serverId: string;
  hostname: string;
}

export function LogsTab({ serverId, hostname }: LogsTabProps) {
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [committedFilters, setCommittedFilters] = useState<{
    q?: string;
    level?: LogLevel;
    from_date?: string;
    to_date?: string;
  }>({});
  const [page, setPage] = useState(1);

  const { data, isLoading } = useLogSearch(
    {
      server_id: serverId,
      ...committedFilters,
      skip: (page - 1) * PAGE_SIZE,
      limit: PAGE_SIZE,
    },
    true,
  );
  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  const handleSearch = () => {
    setCommittedFilters({
      q: query || undefined,
      level: level && level !== "all" ? (level as LogLevel) : undefined,
      from_date: fromDate ? localDateToUtcIso(fromDate) : undefined,
      to_date: toDate ? localDateToUtcIso(toDate, true) : undefined,
    });
    setPage(1);
  };

  const clearFilters = () => {
    setQuery("");
    setLevel("");
    setFromDate("");
    setToDate("");
    setCommittedFilters({});
    setPage(1);
  };

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="rounded-xl border border-border bg-card/50 p-4 space-y-4">
        <div className="flex flex-col md:flex-row items-end gap-3">
          <div className="flex-1 w-full">
            <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1.5 block">
              Search Query
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. `invalid password for root`"
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-background border border-border focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all font-mono text-sm"
              />
            </div>
          </div>
          <div className="w-full md:w-36 shrink-0">
            <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1.5 block">
              Severity
            </label>
            <Select
              value={level || "all"}
              onValueChange={(v) => v && setLevel(v === "all" ? "" : v)}
            >
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
        <div className="flex flex-col md:flex-row items-end gap-3">
          <div className="flex items-center gap-2 text-muted-foreground shrink-0 pb-2">
            <CalendarDays className="h-4 w-4" />
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Date Range
            </span>
          </div>
          <div className="flex-1 flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1.5 block">
                From
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none text-sm"
              />
            </div>
            <div className="flex-1">
              <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1.5 block">
                To
              </label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <button
              onClick={clearFilters}
              className="flex-1 md:flex-none px-4 py-2 rounded-lg border border-border text-muted-foreground font-semibold hover:text-foreground hover:bg-muted/50 transition-colors text-sm"
            >
              Clear
            </button>
            <button
              onClick={handleSearch}
              disabled={!query.trim() && !level && !fromDate && !toDate}
              className="flex-1 md:flex-none px-6 py-2 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
            >
              Execute
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="rounded-xl border border-border bg-card overflow-hidden flex flex-col">
        <div className="bg-muted/30 px-4 py-2 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-mono text-muted-foreground">
              {hostname}:/var/log
            </span>
          </div>
          {data && (
            <div className="text-xs text-muted-foreground font-medium">
              Matched{" "}
              <span className="text-foreground font-bold">
                {data.total.toLocaleString()}
              </span>{" "}
              lines (showing {data.showing})
            </div>
          )}
        </div>
        <div className="max-h-150 min-h-75 overflow-y-auto p-3 font-mono text-[13px] space-y-0.5">
          {isLoading ? (
            [...Array(8)].map((_, i) => (
              <div key={i} className="flex gap-3 p-2">
                <div className="h-4 w-40 bg-muted rounded animate-pulse" />
                <div className="h-4 w-14 bg-muted rounded animate-pulse" />
                <div className="h-4 flex-1 bg-muted rounded animate-pulse opacity-50" />
              </div>
            ))
          ) : !data?.results || data.results.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-16">
              <Terminal className="h-10 w-10 mb-3 opacity-20" />
              <p className="text-sm">
                No log records match your current query.
              </p>
            </div>
          ) : (
            data.results.map((log, index) => {
              const { date, time } = formatTimestamp(log.timestamp);
              const globalIndex = (page - 1) * PAGE_SIZE + index + 1;
              return (
                <div
                  key={index}
                  className="flex flex-col sm:flex-row gap-2 sm:gap-4 p-2 hover:bg-muted/50 rounded-md transition-colors cursor-text group items-start"
                >
                  <div className="shrink-0 w-52 flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground/40 group-hover:text-muted-foreground/70 w-7 shrink-0 tabular-nums">
                      {String(globalIndex).padStart(4, "0")}
                    </span>
                    <span className="tabular-nums text-[12px]">
                      <span className="text-sky-400 font-semibold">{date}</span>
                      <span className="text-muted-foreground/40 mx-1">·</span>
                      <span className="text-foreground/80 font-mono">
                        {time}
                      </span>
                    </span>
                  </div>
                  <div className="shrink-0 w-22.5">
                    <span
                      className={cn(
                        "px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider",
                        logLevelColor[log.level.toLowerCase()] ??
                          "text-muted-foreground bg-muted border border-border",
                      )}
                    >
                      {log.level.toLowerCase()}
                    </span>
                  </div>
                  <div className="flex-1 break-all text-foreground/90 whitespace-pre-wrap">
                    {log.message}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {totalPages > 1 && (
          <div className="shrink-0 border-t border-border px-4 py-3 flex items-center justify-between bg-muted/10">
            <p className="text-xs text-muted-foreground font-mono">
              Page{" "}
              <span className="text-foreground font-semibold">{page}</span> of{" "}
              <span className="text-foreground font-semibold">
                {totalPages}
              </span>
              {" · "}
              <span className="text-foreground font-semibold">
                {data?.total.toLocaleString() ?? 0}
              </span>{" "}
              total
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(1)}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-border bg-card hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                «
              </button>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-border bg-card hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Prev
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(
                  (p) =>
                    p === 1 ||
                    p === totalPages ||
                    Math.abs(p - page) <= 1,
                )
                .reduce<(number | "…")[]>((acc, p, idx, arr) => {
                  if (idx > 0 && p - (arr[idx - 1] as number) > 1)
                    acc.push("…");
                  acc.push(p);
                  return acc;
                }, [])
                .map((item, idx) =>
                  item === "…" ? (
                    <span
                      key={`e-${idx}`}
                      className="px-2 text-xs text-muted-foreground"
                    >
                      …
                    </span>
                  ) : (
                    <button
                      key={item}
                      onClick={() => setPage(item as number)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors",
                        page === item
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border bg-card hover:bg-muted",
                      )}
                    >
                      {item}
                    </button>
                  ),
                )}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-border bg-card hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
              <button
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-border bg-card hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                »
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
