import { apiClient } from "@/lib/api";
import type { DetectionRule, DetectionRuleCreate } from "@/lib/types";

export const rulesApi = {
  list: () =>
    apiClient.get<DetectionRule[]>("/api/analysis/rules"),

  getById: (id: string) =>
    apiClient.get<DetectionRule>("/api/analysis/rules/" + id),

  create: (data: DetectionRuleCreate) =>
    apiClient.post<{ status: string; id: string }>("/api/analysis/rules", data),

  update: (id: string, data: Partial<DetectionRuleCreate>) =>
    apiClient.put<{ status: string }>("/api/analysis/rules/" + id, data),

  delete: (id: string) =>
    apiClient.delete<{ status: string }>("/api/analysis/rules/" + id),
};
