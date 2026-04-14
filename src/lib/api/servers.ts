import { apiClient } from "@/lib/api";
import type { ServerResponse, ServerCreate, ServerUpdate, ServerDelete, ServerFilters, ServerListResponse } from "@/lib/types";

export const serversApi = {
  list: (filters: ServerFilters = {}) => {
    const params = new URLSearchParams();
    if (filters.status) params.set("status", filters.status);
    if (filters.os_type) params.set("os_type", filters.os_type);
    if (filters.search) params.set("search", filters.search);
    if (filters.page) params.set("page", String(filters.page));
    if (filters.page_size) params.set("page_size", String(filters.page_size));
    const qs = params.toString();
    return apiClient.get<ServerListResponse>(`/api/servers${qs ? `?${qs}` : ""}`);
  },

  getById: (id: string) =>
    apiClient.get<ServerResponse>("/api/servers/" + id),

  create: (data: ServerCreate) =>
    apiClient.post<{ status: string; server_id: string }>("/api/servers", data),

  update: (id: string, data: ServerUpdate) =>
    apiClient.put<{ status: string; message: string }>("/api/servers/" + id, data),

  delete: (id: string, data: ServerDelete) =>
    apiClient.delete<{ status: string; message: string }>("/api/servers/" + id, data),

  // execute does NOT require a password — the stored credential is used
  execute: (id: string, command: string) =>
    apiClient.post<{ status: string; output: string }>(
      "/api/servers/" + id + "/execute",
      { command }
    ),
};
