import { apiClient } from "@/lib/api";
import type { DashboardSummary, RecentIncident, ServerResponse } from "@/lib/types";

export const dashboardApi = {
  getSummary: () =>
    apiClient.get<DashboardSummary>("/api/dashboard/summary"),

  getRecentIncidents: (limit = 10) =>
    apiClient.get<RecentIncident[]>("/api/dashboard/recent-incidents", {
      params: { limit },
    }),

  getServerHealth: () =>
    apiClient.get<ServerResponse[]>("/api/dashboard/server-health"),
};
