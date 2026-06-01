"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { wsClient } from "@/lib/ws";
import { WS_NOTIFICATIONS_TOPIC } from "@/lib/constants";
import { NotificationToastCard } from "@/components/notifications/notification-toast-card";
import type { AppNotification } from "@/lib/types";

/**
 * Live pop-up bridge for in-app notifications (Phase 29).
 *
 * Mounted once in the app shell. Subscribes to the global `notifications` WS
 * topic and pops a fully-clickable card for each new notification — clicking
 * anywhere on it navigates to the target page and dismisses the toast. The bell
 * badge/list refresh is handled separately by the feed hooks' `useWsInvalidator`.
 */
export function NotificationListener() {
  const router = useRouter();

  useEffect(() => {
    const unsub = wsClient.subscribe(WS_NOTIFICATIONS_TOPIC, (payload, event) => {
      if (event !== "notification.created") return;
      const n = payload as AppNotification;
      if (!n || !n.title) return;
      // A coalesced dedup bump re-emits with count>1 — the bell still updates,
      // but we don't pop a duplicate card for the same logical notification.
      if (typeof n.count === "number" && n.count > 1) return;

      const link = n.link ?? null;
      toast.custom(
        (id) => (
          <NotificationToastCard
            notification={n}
            onClick={() => {
              toast.dismiss(id);
              if (link) router.push(link);
            }}
          />
        ),
        {
          // Route to the dedicated top-right toaster (see app/layout.tsx).
          toasterId: "notifications",
          duration: n.severity === "error" ? 8000 : 5000,
        },
      );
    });
    return unsub;
  }, [router]);

  return null;
}
