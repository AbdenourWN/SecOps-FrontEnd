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
          // Stable per-notification id: a coalesced dedup bump (count>1) re-emits
          // with the same notification id, so sonner updates the card in place
          // (and resets its timer) instead of stacking duplicates — and re-pops
          // it if the previous card was already dismissed/expired.
          id: `notif-${n.id}`,
        },
      );
    });
    return unsub;
  }, [router]);

  return null;
}
