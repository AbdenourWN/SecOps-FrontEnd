import { apiClient } from "@/lib/api";
import type { NotificationConfig } from "@/lib/types";

export const notificationsApi = {
  getConfigs: () =>
    apiClient.get<NotificationConfig[]>("/api/notifications/config"),

  upsertConfig: (data: NotificationConfig) =>
    apiClient.post<NotificationConfig>("/api/notifications/config", data),

  deleteConfig: (channel: string) =>
    apiClient.delete<{ status: string }>(`/api/notifications/config/${channel}`),

  sendTest: () =>
    apiClient.post<{ status: string }>("/api/notifications/test"),
};
