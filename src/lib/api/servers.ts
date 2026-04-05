import { apiClient } from "@/lib/api";
import type { ServerResponse, ServerCreate, ServerUpdate, ServerDelete } from "@/lib/types";

export const serversApi = {
  list: () =>
    apiClient.get<ServerResponse[]>("/api/servers"),

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
