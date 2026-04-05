import { apiClient } from "@/lib/api";
import type { MetricResponse } from "@/lib/types";

export const metricsApi = {
  getByServer: (serverId: string, limit = 50) =>
    apiClient.get<MetricResponse[]>("/api/metrics/" + serverId, {
      params: { limit },
    }),

  collect: (serverId: string) =>
    apiClient.post<{ status: string }>("/api/metrics/collect/" + serverId),
};
