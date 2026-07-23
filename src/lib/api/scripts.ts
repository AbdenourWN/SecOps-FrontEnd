import { apiClient } from "@/lib/api";
import type {
  ScriptResponse,
  ScriptCreate,
  ScriptFilters,
  ScriptListResponse,
  ScriptBulkToggle,
  ScriptBulkToggleResult,
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
  if (filters.from_date) params.set("from_date", filters.from_date);
  if (filters.to_date) params.set("to_date", filters.to_date);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export const scriptsApi = {
  list: (filters?: ScriptFilters) => {
    const params = new URLSearchParams();
    if (filters?.language) params.set("language", filters.language);
    if (filters?.target_os) params.set("target_os", filters.target_os);
    if (filters?.search) params.set("search", filters.search);
    // Phase 28.5 — scope filter
    if (filters?.owner_type) params.set("owner_type", filters.owner_type);
    if (filters?.owner_id) params.set("owner_id", filters.owner_id);
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

  // Phase 28.5 — create a script pre-scoped to a server (path is authoritative)
  createForServer: (serverId: string, data: ScriptCreate) =>
    apiClient.post<{ status: string; id: string }>(
      `/api/automation/servers/${serverId}/scripts`,
      data,
    ),

  update: (id: string, data: Partial<ScriptCreate>) =>
    apiClient.put<{ status: string }>("/api/automation/scripts/" + id, data),

  delete: (id: string) =>
    apiClient.delete<{ status: string }>("/api/automation/scripts/" + id),

  toggle: (id: string) =>
    apiClient.patch<{ status: string; enabled: boolean }>(
      `/api/automation/scripts/${id}/toggle`,
      {}
    ),

  // Bulk enable/disable every script matching the given scope filters
  bulkToggle: (payload: ScriptBulkToggle) =>
    apiClient.post<ScriptBulkToggleResult>(
      "/api/automation/scripts/bulk-toggle",
      payload
    ),

  history: (filters: RemediationHistoryFilters = {}) =>
    apiClient.get<RemediationRun[]>(
      `/api/automation/history${buildHistoryQuery(filters)}`
    ),

  // Phase 28.5 — single-run fetch for the new remediation detail page
  getRun: (automationLogId: string) =>
    apiClient.get<RemediationRun>(`/api/automation/history/${automationLogId}`),

  historyStats: (
    filters: Omit<RemediationHistoryFilters, "limit" | "skip"> = {}
  ) =>
    apiClient.get<RemediationHistoryStats>(
      `/api/automation/history/stats${buildHistoryQuery(filters)}`
    ),

  // Phase 28.4 — on-demand AI review for a remediation run. Used when the
  // per-server `script_review_enabled` toggle was off at execution time (or
  // the auto-review failed). Mirrors the "Run Analysis" UX on incidents.
  analyzeRun: (automationLogId: string) =>
    apiClient.post<{ status: string; automation_log_id: string }>(
      `/api/automation/history/${automationLogId}/analyze`,
      {}
    ),
};
