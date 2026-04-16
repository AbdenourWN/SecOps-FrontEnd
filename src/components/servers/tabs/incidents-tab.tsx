"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, FileText } from "lucide-react";
import { SeverityBadge, StatusBadge } from "@/components/shared/badges";
import { useIncidents } from "@/lib/hooks/use-incidents";
import { timeAgo, cn } from "@/lib/utils";
import type { IncidentStatus, SeverityLevel } from "@/lib/types";

const PAGE_SIZE = 10;

interface IncidentsTabProps {
  serverId: string;
}

export function IncidentsTab({ serverId }: IncidentsTabProps) {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState<SeverityLevel | "all">("all");
  const [status, setStatus] = useState<IncidentStatus | "all">("all");
  const [page, setPage] = useState(1);

  const setSeverityAndReset = (v: SeverityLevel | "all") => {
    setSeverity(v);
    setPage(1);
  };
  const setStatusAndReset = (v: IncidentStatus | "all") => {
    setStatus(v);
    setPage(1);
  };
  const executeSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  const { data, isLoading } = useIncidents({
    server_id: serverId,
    severity: severity === "all" ? undefined : severity,
    status: status === "all" ? undefined : status,
    search: search || undefined,
    page,
    page_size: PAGE_SIZE,
  });
  const incidents = data?.results ?? [];
  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && executeSearch()}
              placeholder="Search incidents..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-card border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all text-sm outline-none"
            />
          </div>
          <button
            onClick={executeSearch}
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-all"
          >
            Search
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-xl border border-border">
          {(["all", "critical", "high", "medium", "low"] as const).map(
            (sev) => (
              <button
                key={sev}
                onClick={() => setSeverityAndReset(sev)}
                className={cn(
                  "px-3 py-1 text-xs font-semibold rounded-lg capitalize transition-all",
                  severity === sev
                    ? "bg-card shadow-sm text-foreground border border-border"
                    : "text-muted-foreground hover:text-foreground border border-transparent",
                )}
              >
                {sev}
              </button>
            ),
          )}
        </div>
        <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-xl border border-border ml-auto">
          {(["all", "open", "investigating", "resolved"] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusAndReset(st)}
              className={cn(
                "px-3 py-1 text-xs font-semibold rounded-lg capitalize transition-all",
                status === st
                  ? "bg-card shadow-sm text-foreground border border-border"
                  : "text-muted-foreground hover:text-foreground border border-transparent",
              )}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wider">
              <th className="text-left px-5 py-3">Severity</th>
              <th className="text-left px-5 py-3">Description</th>
              <th className="text-left px-5 py-3">Status</th>
              <th className="text-left px-5 py-3">Detected</th>
              <th className="text-left px-5 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i}>
                  <td colSpan={5} className="px-5 py-3">
                    <div className="h-6 bg-muted/60 rounded animate-pulse" />
                  </td>
                </tr>
              ))
            ) : incidents.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-5 py-8 text-center text-sm text-muted-foreground"
                >
                  No incidents match the current filters.
                </td>
              </tr>
            ) : (
              incidents.map((inc) => (
                <tr key={inc._id} className="hover:bg-muted/20">
                  <td className="px-5 py-3">
                    <SeverityBadge severity={inc.severity} />
                  </td>
                  <td className="px-5 py-3 text-sm max-w-xs truncate">
                    {inc.description}
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={inc.status} />
                  </td>
                  <td className="px-5 py-3 text-xs text-muted-foreground">
                    {timeAgo(inc.detected_at)}
                  </td>
                  <td className="px-5 py-3">
                    <Link
                      href={`/incidents/${inc._id}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-muted hover:bg-primary hover:text-primary-foreground text-[11px] font-semibold transition-colors cursor-pointer"
                    >
                      <FileText className="h-3 w-3" />
                      Details
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            Page{" "}
            <span className="font-semibold text-foreground">{page}</span> of{" "}
            <span className="font-semibold text-foreground">{totalPages}</span>
            {" · "}
            <span className="font-semibold text-foreground">
              {data?.total ?? 0}
            </span>{" "}
            total
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(1)}
              disabled={page === 1}
              className="px-3 py-2 rounded-lg text-xs font-semibold border border-border bg-card hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              «
            </button>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-2 rounded-lg text-xs font-semibold border border-border bg-card hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
                if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("…");
                acc.push(p);
                return acc;
              }, [])
              .map((item, idx) =>
                item === "…" ? (
                  <span
                    key={`inc-e-${idx}`}
                    className="px-2 text-xs text-muted-foreground"
                  >
                    …
                  </span>
                ) : (
                  <button
                    key={item}
                    onClick={() => setPage(item as number)}
                    className={cn(
                      "px-4 py-2 rounded-lg text-xs font-semibold border transition-colors",
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
              className="px-3 py-2 rounded-lg text-xs font-semibold border border-border bg-card hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
            <button
              onClick={() => setPage(totalPages)}
              disabled={page === totalPages}
              className="px-3 py-2 rounded-lg text-xs font-semibold border border-border bg-card hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              »
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
