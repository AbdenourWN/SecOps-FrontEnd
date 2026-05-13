import { apiClient } from "@/lib/api";
import type {
  IncidentResponse,
  IncidentListResponse,
  IncidentFilters,
  IncidentStatusUpdate,
  IncidentStats,
} from "@/lib/types";

export const incidentsApi = {
  list: (filters?: IncidentFilters) => {
    const params = new URLSearchParams();
    if (filters?.server_id) params.set("server_id", filters.server_id);
    if (filters?.severity) params.set("severity", filters.severity);
    if (filters?.status) params.set("status", filters.status);
    if (filters?.search) params.set("search", filters.search);
    if (filters?.page) params.set("page", String(filters.page));
    if (filters?.page_size) params.set("page_size", String(filters.page_size));
    const qs = params.toString();
    return apiClient.get<IncidentListResponse>(`/api/incidents${qs ? `?${qs}` : ""}`);
  },

  getById: (id: string) =>
    apiClient.get<IncidentResponse>("/api/incidents/" + id),

  updateStatus: (id: string, data: IncidentStatusUpdate) =>
    apiClient.patch<{ status: string; incident: IncidentResponse }>(
      "/api/incidents/" + id + "/status",
      data
    ),

  getStats: () =>
    apiClient.get<IncidentStats>("/api/incidents/stats"),

  triggerAiAnalysis: (incidentId: string) =>
    apiClient.post<{
      status: string;
      incident_id: string;
      analysis_id: string;
      ai_analysis: string;
      suggested_command_ids: string[];
      manual_commands: { command: string; purpose: string; note: string }[];
      confidence: number;
      analyzed_at: string;
    }>("/api/analysis/" + incidentId + "/analyze"),
};
