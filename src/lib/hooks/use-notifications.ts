import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationsApi } from "@/lib/api/notifications";
import type { NotificationConfig } from "@/lib/types";

export function useNotificationConfigs() {
  return useQuery({
    queryKey: ["notifications", "config"],
    queryFn: notificationsApi.getConfigs,
  });
}

export function useSaveNotificationConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: NotificationConfig) => notificationsApi.upsertConfig(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications", "config"] });
    },
  });
}

export function useDeleteNotificationConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (channel: string) => notificationsApi.deleteConfig(channel),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications", "config"] });
    },
  });
}

export function useTestNotification() {
  return useMutation({
    mutationFn: () => notificationsApi.sendTest(),
  });
}
