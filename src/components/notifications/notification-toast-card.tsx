"use client";

import { NotificationIcon } from "@/components/shared/notification-icon";
import type { AppNotification } from "@/lib/types";

/**
 * The clickable pop-up card rendered via `toast.custom` for each live
 * notification. The whole card is a button — clicking anywhere navigates to the
 * notification's target page (handled by the caller's `onClick`).
 */
export function NotificationToastCard({
  notification,
  onClick,
}: {
  notification: AppNotification;
  onClick: () => void;
}) {
  const n = notification;
  return (
    <button
      onClick={onClick}
      className="flex w-full items-start gap-3 rounded-lg border border-border bg-card p-3 text-left shadow-lg transition-colors hover:bg-muted/50 cursor-pointer"
    >
      <NotificationIcon category={n.category} severity={n.severity} className="mt-0.5" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">{n.title}</p>
          {typeof n.count === "number" && n.count > 1 && (
            <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
              ×{n.count}
            </span>
          )}
        </div>
        {n.body && <p className="mt-0.5 line-clamp-3 text-xs text-muted-foreground">{n.body}</p>}
        {n.link && <p className="mt-1 text-[11px] font-semibold text-primary">View →</p>}
      </div>
    </button>
  );
}
