import { apiClient } from "@/lib/api";
import type {
  DashboardSummary,
  RecentIncident,
  ServerResponse,
  AppOverview,
} from "@/lib/types";

export const dashboardApi = {
  getSummary: () =>
    apiClient.get<DashboardSummary>("/api/dashboard/summary"),

  getRecentIncidents: (limit = 10) =>
    apiClient.get<RecentIncident[]>("/api/dashboard/recent-incidents", {
      params: { limit },
    }),

  getServerHealth: () =>
    apiClient.get<ServerResponse[]>("/api/dashboard/server-health"),

  // Phase 28.7 — app-wide AI overview. GET returns the last persisted result
  // (or null); POST kicks off a fresh on-demand generation (streams over WS).
  getAiOverview: () =>
    apiClient.get<AppOverview | null>("/api/dashboard/ai-overview"),

  generateAiOverview: () =>
    apiClient.post<{ status: string }>("/api/dashboard/ai-overview"),
};
