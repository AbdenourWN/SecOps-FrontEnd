import { apiClient } from "@/lib/api";
import type {
  AiActionsListResponse,
  AiPendingAction,
  AiCommand,
  AiCommandListResponse,
} from "@/lib/types";

export const aiActionsApi = {
  // ── Mutation inbox (dismiss/promote/mark-false-positive) ─────────────────
  list: (status?: string, page = 1, pageSize = 25) => {
    const params = new URLSearchParams();
    if (status && status !== "all") params.set("status", status);
    params.set("page", String(page));
    params.set("page_size", String(pageSize));
    return apiClient.get<AiActionsListResponse>(`/api/ai-actions/?${params.toString()}`);
  },

  pendingCount: () =>
    apiClient.get<{ pending: number }>("/api/ai-actions/count"),

  approve: (id: string) =>
    apiClient.post<{ status: string; action_id: string; outcome: Record<string, unknown> }>(
      `/api/ai-actions/${id}/approve`
    ),

  reject: (id: string) =>
    apiClient.post<{ status: string; action_id: string }>(
      `/api/ai-actions/${id}/reject`
    ),

  // ── Command approval / execution ─────────────────────────────────────────
  commands: {
    list: (filters?: { status?: string; server_id?: string; source_id?: string; source_type?: string; page?: number; page_size?: number }) => {
      const p = new URLSearchParams();
      if (filters?.status) p.set("status", filters.status);
      if (filters?.server_id) p.set("server_id", filters.server_id);
      if (filters?.source_id) p.set("source_id", filters.source_id);
      if (filters?.source_type) p.set("source_type", filters.source_type);
      if (filters?.page) p.set("page", String(filters.page));
      if (filters?.page_size) p.set("page_size", String(filters.page_size));
      return apiClient.get<AiCommandListResponse>(`/api/ai-actions/commands?${p}`);
    },
    getById: (id: string) =>
      apiClient.get<AiCommand>(`/api/ai-actions/commands/${id}`),
    retry: (id: string, decided_by = "operator") =>
      apiClient.post<{ status: string; new_command_id: string; batch_id: string }>(
        `/api/ai-actions/commands/${id}/retry?decided_by=${decided_by}`
      ),
    pendingCount: () =>
      apiClient.get<{ pending: number }>("/api/ai-actions/commands/count"),
    approve: (command_ids: string[], decided_by = "operator") =>
      apiClient.post<{ status: string; batch_id: string; command_count: number }>(
        "/api/ai-actions/commands/approve",
        { command_ids, decided_by }
      ),
    reject: (command_ids: string[], decided_by = "operator") =>
      apiClient.post<{ status: string; count: number }>(
        "/api/ai-actions/commands/reject",
        { command_ids, decided_by }
      ),
  },
};
