import { apiClient } from "@/lib/api";
import type { DetectionRule, DetectionRuleCreate, RuleFilters, RuleListResponse } from "@/lib/types";

export const rulesApi = {
  list: (filters?: RuleFilters) => {
    const params = new URLSearchParams();
    if (filters?.severity) params.set("severity", filters.severity);
    if (filters?.os_type) params.set("os_type", filters.os_type);
    if (filters?.enabled !== undefined) params.set("enabled", String(filters.enabled));
    if (filters?.search) params.set("search", filters.search);
    // Phase 28.5 — scope filter
    if (filters?.owner_type) params.set("owner_type", filters.owner_type);
    if (filters?.owner_id) params.set("owner_id", filters.owner_id);
    if (filters?.page) params.set("page", String(filters.page));
    if (filters?.page_size) params.set("page_size", String(filters.page_size));
    const qs = params.toString();
    return apiClient.get<RuleListResponse>(`/api/analysis/rules${qs ? `?${qs}` : ""}`);
  },

  getById: (id: string) =>
    apiClient.get<DetectionRule>("/api/analysis/rules/" + id),

  create: (data: DetectionRuleCreate) =>
    apiClient.post<{ status: string; id: string }>("/api/analysis/rules", data),

  // Phase 28.5 — create a rule pre-scoped to a server (path is authoritative)
  createForServer: (serverId: string, data: DetectionRuleCreate) =>
    apiClient.post<{ status: string; id: string }>(
      `/api/analysis/servers/${serverId}/rules`,
      data,
    ),

  update: (id: string, data: Partial<DetectionRuleCreate>) =>
    apiClient.put<{ status: string }>("/api/analysis/rules/" + id, data),

  delete: (id: string) =>
    apiClient.delete<{ status: string }>("/api/analysis/rules/" + id),
};
