import { apiClient } from "@/lib/api";
import type {
  AnomalyFilters,
  AnomalyListResponse,
  AnomalyStats,
  LogObservation,
} from "@/lib/types";

export const anomaliesApi = {
  list: (filters?: AnomalyFilters) => {
    const params = new URLSearchParams();
    if (filters?.server_id) params.set("server_id", filters.server_id);
    if (filters?.status && filters.status !== "all") params.set("status", filters.status);
    if (filters?.severity && filters.severity !== "all") params.set("severity", filters.severity);
    if (filters?.type && filters.type !== "all") params.set("type", filters.type);
    if (filters?.page) params.set("page", String(filters.page));
    if (filters?.page_size) params.set("page_size", String(filters.page_size));
    const qs = params.toString();
    return apiClient.get<AnomalyListResponse>(`/api/anomalies${qs ? `?${qs}` : ""}`);
  },

  getById: (id: string) =>
    apiClient.get<LogObservation>(`/api/anomalies/${id}`),

  getStats: () => apiClient.get<AnomalyStats>("/api/anomalies/stats"),

  dismiss: (id: string) =>
    apiClient.patch<{ status: string; observation_id: string }>(
      `/api/anomalies/${id}/dismiss`,
      {}
    ),

  promote: (id: string) =>
    apiClient.post<{ status: string; observation_id: string; incident_id: string }>(
      `/api/anomalies/${id}/promote`
    ),

  triggerAiAnalysis: (id: string) =>
    apiClient.post<{
      status: string;
      observation_id: string;
      ai_analysis: string;
      manual_commands: { command: string; purpose: string; note: string }[];
      suggested_command_ids: string[];
      analysis_id: string;
    }>(`/api/anomalies/${id}/analyze`),

  autoPromote: (id: string) =>
    apiClient.post<{ status: string; observation_id: string }>(
      `/api/anomalies/${id}/auto-promote`
    ),
};
