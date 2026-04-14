import { apiClient } from "@/lib/api";
import type { DetectionRule, DetectionRuleCreate, RuleFilters, RuleListResponse } from "@/lib/types";

export const rulesApi = {
  list: (filters?: RuleFilters) => {
    const params = new URLSearchParams();
    if (filters?.severity) params.set("severity", filters.severity);
    if (filters?.os_type) params.set("os_type", filters.os_type);
    if (filters?.enabled !== undefined) params.set("enabled", String(filters.enabled));
    if (filters?.search) params.set("search", filters.search);
    if (filters?.page) params.set("page", String(filters.page));
    if (filters?.page_size) params.set("page_size", String(filters.page_size));
    const qs = params.toString();
    return apiClient.get<RuleListResponse>(`/api/analysis/rules${qs ? `?${qs}` : ""}`);
  },

  getById: (id: string) =>
    apiClient.get<DetectionRule>("/api/analysis/rules/" + id),

  create: (data: DetectionRuleCreate) =>
    apiClient.post<{ status: string; id: string }>("/api/analysis/rules", data),

  update: (id: string, data: Partial<DetectionRuleCreate>) =>
    apiClient.put<{ status: string }>("/api/analysis/rules/" + id, data),

  delete: (id: string) =>
    apiClient.delete<{ status: string }>("/api/analysis/rules/" + id),
};
