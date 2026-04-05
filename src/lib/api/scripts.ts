import { apiClient } from "@/lib/api";
import type { ScriptResponse, ScriptCreate } from "@/lib/types";

export const scriptsApi = {
  list: () =>
    apiClient.get<ScriptResponse[]>("/api/automation/scripts"),

  getById: (id: string) =>
    apiClient.get<ScriptResponse>("/api/automation/scripts/" + id),

  create: (data: ScriptCreate) =>
    apiClient.post<{ status: string; id: string }>("/api/automation", data),

  update: (id: string, data: Partial<ScriptCreate>) =>
    apiClient.put<{ status: string }>("/api/automation/scripts/" + id, data),

  delete: (id: string) =>
    apiClient.delete<{ status: string }>("/api/automation/scripts/" + id),
};
