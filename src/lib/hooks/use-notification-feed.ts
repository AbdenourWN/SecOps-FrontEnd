"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationFeedApi } from "@/lib/api/notification-feed";
import { useWsInvalidator } from "@/lib/hooks/use-ws-invalidator";
import { userNotificationsTopic } from "@/lib/constants";
import { useAuth } from "@/providers/auth-provider";

const FEED_KEY = ["notification-feed"];
const COUNT_KEY = ["notification-feed", "unread-count"];

/**
 * Notification list for the bell dropdown + the /notifications page.
 * Live-refreshed off the principal's per-user `notifications.user.<id>` WS topic;
 * HTTP refetch is a 5-min safety net (the WS push is the primary signal).
 */
export function useNotificationFeed(filters?: {
  page?: number;
  page_size?: number;
  unread_only?: boolean;
  category?: string;
  from_date?: string;
  to_date?: string;
}) {
  const { user } = useAuth();
  useWsInvalidator(user ? userNotificationsTopic(user.id) : "", [FEED_KEY, COUNT_KEY]);
  return useQuery({
    queryKey: [...FEED_KEY, filters ?? {}],
    queryFn: () => notificationFeedApi.list(filters),
    refetchInterval: 300_000,
    placeholderData: (prev) => prev,
  });
}

export function useUnreadCount() {
  const { user } = useAuth();
  useWsInvalidator(user ? userNotificationsTopic(user.id) : "", [COUNT_KEY]);
  return useQuery({
    queryKey: COUNT_KEY,
    queryFn: () => notificationFeedApi.unreadCount(),
    refetchInterval: 300_000,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationFeedApi.markRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: FEED_KEY });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => notificationFeedApi.markAllRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: FEED_KEY });
    },
  });
}

export function useDismissNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationFeedApi.dismiss(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: FEED_KEY });
    },
  });
}
