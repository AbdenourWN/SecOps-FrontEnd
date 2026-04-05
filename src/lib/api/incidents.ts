import { apiClient } from "@/lib/api";
import type {
  IncidentResponse,
  IncidentStatusUpdate,
  IncidentStats,
  SeverityLevel,
  IncidentStatus,
} from "@/lib/types";

type IncidentFilters = {
  server_id?: string;
  severity?: SeverityLevel;
  status?: IncidentStatus;
  skip?: number;
  limit?: number;
};

export const incidentsApi = {
  list: (filters?: IncidentFilters) =>
    apiClient.get<IncidentResponse[]>("/api/incidents", { params: filters }),

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
    apiClient.post<{ status: string; incident_id: string; ai_analysis: string }>(
      "/api/analysis/" + incidentId + "/analyze"
    ),
};
