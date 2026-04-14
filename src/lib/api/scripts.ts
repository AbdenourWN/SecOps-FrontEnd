import { apiClient } from "@/lib/api";
import type {
  ScriptResponse,
  ScriptCreate,
  ScriptFilters,
  ScriptListResponse,
  RemediationRun,
  RemediationHistoryFilters,
  RemediationHistoryStats,
} from "@/lib/types";

function buildHistoryQuery(filters: RemediationHistoryFilters = {}): string {
  const params = new URLSearchParams();
  if (filters.limit !== undefined) params.set("limit", String(filters.limit));
  if (filters.skip !== undefined) params.set("skip", String(filters.skip));
  if (filters.status) params.set("status", filters.status);
  if (filters.server_id) params.set("server_id", filters.server_id);
  if (filters.script_id) params.set("script_id", filters.script_id);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export const scriptsApi = {
  list: (filters?: ScriptFilters) => {
    const params = new URLSearchParams();
    if (filters?.language) params.set("language", filters.language);
    if (filters?.target_os) params.set("target_os", filters.target_os);
    if (filters?.search) params.set("search", filters.search);
    if (filters?.page) params.set("page", String(filters.page));
    if (filters?.page_size) params.set("page_size", String(filters.page_size));
    const qs = params.toString();
    return apiClient.get<ScriptListResponse>(
      `/api/automation/scripts${qs ? `?${qs}` : ""}`
    );
  },

  getById: (id: string) =>
    apiClient.get<ScriptResponse>("/api/automation/scripts/" + id),

  create: (data: ScriptCreate) =>
    apiClient.post<{ status: string; id: string }>("/api/automation", data),

  update: (id: string, data: Partial<ScriptCreate>) =>
    apiClient.put<{ status: string }>("/api/automation/scripts/" + id, data),

  delete: (id: string) =>
    apiClient.delete<{ status: string }>("/api/automation/scripts/" + id),

  history: (filters: RemediationHistoryFilters = {}) =>
    apiClient.get<RemediationRun[]>(
      `/api/automation/history${buildHistoryQuery(filters)}`
    ),

  historyStats: (
    filters: Omit<RemediationHistoryFilters, "limit" | "skip"> = {}
  ) =>
    apiClient.get<RemediationHistoryStats>(
      `/api/automation/history/stats${buildHistoryQuery(filters)}`
    ),
};
