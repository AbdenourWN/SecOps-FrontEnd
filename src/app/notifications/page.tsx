"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, Info } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { NotificationIcon } from "@/components/shared/notification-icon";
import { NumberedPagination } from "@/components/shared/numbered-pagination";
import { DateRangeFilter, type DateRange } from "@/components/shared/date-range-filter";
import { cn, timeAgo } from "@/lib/utils";
import { NOTIFICATION_CATEGORY_LABEL } from "@/lib/constants";
import {
  useNotificationFeed,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useUnreadCount,
} from "@/lib/hooks/use-notification-feed";
import type { AppNotification, NotificationCategory } from "@/lib/types";

const CATEGORIES: (NotificationCategory | "all")[] = [
  "all",
  "ai",
  "incident",
  "automation",
  "anomaly",
  "server",
];

const PAGE_SIZE = 20;

export default function NotificationsPage() {
  const router = useRouter();
  const [category, setCategory] = useState<NotificationCategory | "all">("all");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>({});
  const [page, setPage] = useState(1);

  const { data, isLoading } = useNotificationFeed({
    page,
    page_size: PAGE_SIZE,
    category: category === "all" ? undefined : category,
    unread_only: unreadOnly || undefined,
    from_date: dateRange.from ?? undefined,
    to_date: dateRange.to ?? undefined,
  });
  const { data: countData } = useUnreadCount();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const unread = countData?.count ?? 0;
  const rows = data?.results ?? [];

  const handleRow = (n: AppNotification) => {
    if (!n.read) markRead.mutate(n.id);
    if (n.link) router.push(n.link);
  };

  // Any filter change resets to page 1.
  const setCategoryReset = (c: NotificationCategory | "all") => { setCategory(c); setPage(1); };
  const toggleUnread = () => { setUnreadOnly((v) => !v); setPage(1); };
  const setDateReset = (v: DateRange) => { setDateRange(v); setPage(1); };

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-6 pb-16">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              <h1 className="text-xl font-bold">Notifications</h1>

              {/* Hover/focus info popover: what does and doesn't notify. */}
              <div className="group relative inline-flex">
                <button
                  type="button"
                  aria-label="What triggers a notification?"
                  className="flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Info className="h-4 w-4" />
                </button>
                <div className="invisible absolute left-0 top-full z-50 mt-2 w-72 -translate-x-1/4 rounded-xl border border-border bg-popover p-3 text-xs leading-relaxed shadow-lg opacity-0 transition-opacity group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                  <p className="mb-1 font-semibold text-emerald-400">Triggers a notification</p>
                  <p className="mb-2 text-muted-foreground">
                    Incidents (created &amp; auto-resolved), every remediation run, AI analyses &amp;
                    command results, new anomalies, server-health changes, and AI suggestions
                    awaiting approval.
                  </p>
                  <p className="mb-1 font-semibold text-red-400">Doesn&apos;t notify</p>
                  <p className="text-muted-foreground">
                    Editing servers, rules, scripts or log sources, and routine log/metric
                    collection.
                  </p>
                </div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Everything that happened across the platform — incidents, remediations, AI analyses,
              anomalies and server health. Click any item to jump to it.
            </p>
          </div>
          <button
            onClick={() => markAllRead.mutate()}
            disabled={unread === 0 || markAllRead.isPending}
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40 transition-colors"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Mark all read
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1 p-1 rounded-lg bg-muted/50 border border-border w-fit">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCategoryReset(c)}
                className={cn(
                  "px-3 py-1.5 text-xs font-semibold rounded-md transition-colors",
                  category === c ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {c === "all" ? "All" : NOTIFICATION_CATEGORY_LABEL[c]}
              </button>
            ))}
          </div>
          <button
            onClick={toggleUnread}
            className={cn(
              "px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors",
              unreadOnly
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            Unread only
          </button>
          <DateRangeFilter value={dateRange} onChange={setDateReset} />
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)}
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Bell className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No notifications match these filters.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {rows.map((n) => (
              <button
                key={n.id}
                onClick={() => handleRow(n)}
                className={cn(
                  "flex w-full items-start gap-3 rounded-xl border border-border bg-card/50 p-4 text-left transition-colors hover:border-primary/40 hover:bg-card",
                  !n.read && "bg-primary/[0.04]",
                )}
              >
                <NotificationIcon category={n.category} severity={n.severity} className="mt-0.5 h-5 w-5" />
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold">{n.title}</p>
                    <span className="shrink-0 rounded border border-border bg-muted/50 px-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      {NOTIFICATION_CATEGORY_LABEL[n.category] ?? n.category}
                    </span>
                    {n.count > 1 && (
                      <span className="shrink-0 rounded-full bg-muted px-1.5 text-[10px] font-semibold text-muted-foreground">
                        ×{n.count}
                      </span>
                    )}
                  </div>
                  {n.body && <p className="text-sm text-muted-foreground line-clamp-2">{n.body}</p>}
                  {n.created_at && (
                    <p className="text-[11px] text-muted-foreground/70 tabular-nums">{timeAgo(n.created_at)}</p>
                  )}
                </div>
                {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}
              </button>
            ))}

            {data && (
              <NumberedPagination
                page={data.page}
                total={data.total}
                pageSize={data.page_size}
                onPage={setPage}
              />
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
