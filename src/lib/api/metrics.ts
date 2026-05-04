import { apiClient } from "@/lib/api";
import type { MetricResponse } from "@/lib/types";

export interface MetricQueryParams {
  limit?: number;
  fromDate?: string;
  toDate?: string;
}

export const metricsApi = {
  getByServer: (serverId: string, params: MetricQueryParams = {}) => {
    const { limit = 50, fromDate, toDate } = params;
    const query: Record<string, string | number> = { limit };
    if (fromDate) query.from_date = fromDate;
    if (toDate) query.to_date = toDate;
    return apiClient.get<MetricResponse[]>("/api/metrics/" + serverId, { params: query });
  },

  collect: (serverId: string) =>
    apiClient.post<{ status: string }>("/api/metrics/collect/" + serverId),
};
