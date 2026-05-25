import { apiClient } from "@/lib/api";
import type {
  AiActionsListResponse,
  AiPendingAction,
  AiCommand,
  AiCommandListResponse,
} from "@/lib/types";

export const aiActionsApi = {
  // ── Mutation inbox (dismiss/promote/mark-false-positive) ─────────────────
  list: (filters?: {
    status?: string;
    server_id?: string;
    source_type?: string;
    source_id?: string;
    from_date?: string;
    to_date?: string;
    page?: number;
    page_size?: number;
  }) => {
    const params = new URLSearchParams();
    if (filters?.status && filters.status !== "all") params.set("status", filters.status);
    if (filters?.server_id) params.set("server_id", filters.server_id);
    if (filters?.source_type && filters.source_type !== "all") params.set("source_type", filters.source_type);
    if (filters?.source_id) params.set("source_id", filters.source_id);
    if (filters?.from_date) params.set("from_date", filters.from_date);
    if (filters?.to_date) params.set("to_date", filters.to_date);
    params.set("page", String(filters?.page ?? 1));
    params.set("page_size", String(filters?.page_size ?? 25));
    return apiClient.get<AiActionsListResponse>(`/api/ai-actions/?${params.toString()}`);
  },

  pendingCount: (filters?: { source_type?: string; source_id?: string }) => {
    const params = new URLSearchParams();
    if (filters?.source_type && filters.source_type !== "all") params.set("source_type", filters.source_type);
    if (filters?.source_id) params.set("source_id", filters.source_id);
    const qs = params.toString();
    return apiClient.get<{ pending: number }>(`/api/ai-actions/count${qs ? `?${qs}` : ""}`);
  },

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
    list: (filters?: { status?: string; server_id?: string; source_id?: string; source_type?: string; from_date?: string; to_date?: string; page?: number; page_size?: number }) => {
      const p = new URLSearchParams();
      if (filters?.status) p.set("status", filters.status);
      if (filters?.server_id) p.set("server_id", filters.server_id);
      if (filters?.source_id) p.set("source_id", filters.source_id);
      if (filters?.source_type) p.set("source_type", filters.source_type);
      if (filters?.from_date) p.set("from_date", filters.from_date);
      if (filters?.to_date) p.set("to_date", filters.to_date);
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
