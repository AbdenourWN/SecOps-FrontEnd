"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Numbered pagination — shows up to 7 page tokens at a time with ellipsis
 * collapsing. Shared by the AI Analyses and Notifications list pages.
 */
export function NumberedPagination({
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
