import { apiClient } from "@/lib/api";
import type { NotificationListResponse } from "@/lib/types";

/**
 * In-app notification feed client (Phase 29).
 *
 * Distinct from `notificationsApi` (`./notifications.ts`), which is the
 * email/SMTP + LLM config surface. This one drives the header bell + the
 * /notifications page.
 */
export const notificationFeedApi = {
  list: (filters?: {
    page?: number;
    page_size?: number;
    unread_only?: boolean;
    category?: string;
    from_date?: string;
    to_date?: string;
  }) => {
    const params = new URLSearchParams();
    params.set("page", String(filters?.page ?? 1));
    params.set("page_size", String(filters?.page_size ?? 20));
    if (filters?.unread_only) params.set("unread_only", "true");
    if (filters?.category && filters.category !== "all") params.set("category", filters.category);
    if (filters?.from_date) params.set("from_date", filters.from_date);
    if (filters?.to_date) params.set("to_date", filters.to_date);
    return apiClient.get<NotificationListResponse>(`/api/notifications/feed?${params.toString()}`);
  },

  unreadCount: () =>
    apiClient.get<{ count: number }>("/api/notifications/feed/unread-count"),

  markRead: (id: string) =>
    apiClient.post<{ updated: boolean }>(`/api/notifications/feed/${id}/read`),

  markAllRead: () =>
    apiClient.post<{ updated: number }>("/api/notifications/feed/read-all"),

  dismiss: (id: string) =>
    apiClient.delete<{ deleted: boolean }>(`/api/notifications/feed/${id}`),
};
