import { apiClient, ApiError } from "@/lib/api";
import type { ServerResponse, ServerCreate, ServerUpdate, ServerDelete, ServerFilters, ServerListResponse } from "@/lib/types";

export class BlockedError extends Error {
  constructor(public reason: string) {
    super(reason);
    this.name = "BlockedError";
  }
}

export class ConfirmationRequiredError extends Error {
  constructor(public reason: string) {
    super(reason);
    this.name = "ConfirmationRequiredError";
  }
}

export class RateLimitedError extends Error {
  constructor(public retryAfterSeconds: number) {
    super(`Rate limited — retry in ${retryAfterSeconds}s`);
    this.name = "RateLimitedError";
  }
}

export type ExecuteResult = {
  status: "success" | "error" | "failed" | "timeout";
  output?: string;
  error?: string;
  timeout_s?: number;
};

export type ExecuteOptions = {
  confirmed?: boolean;
  timeout_s?: number;
};

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
  execute: async (
    id: string,
    command: string,
    options: ExecuteOptions = {},
  ): Promise<ExecuteResult> => {
    try {
      return await apiClient.post<ExecuteResult>(
        "/api/servers/" + id + "/execute",
        {
          command,
          confirmed: options.confirmed ?? false,
          timeout_s: options.timeout_s,
        },
      );
    } catch (err) {
      if (err instanceof ApiError) {
        const body = err.body as
          | { blocked_reason?: string; retry_after_seconds?: number; requires_confirmation?: boolean }
          | undefined;
        if (err.status === 412 && body?.requires_confirmation) {
          throw new ConfirmationRequiredError(body.blocked_reason || "Confirmation required.");
        }
        if (err.status === 403) {
          throw new BlockedError(body?.blocked_reason || err.detail || "Command blocked.");
        }
        if (err.status === 429) {
          throw new RateLimitedError(body?.retry_after_seconds ?? 60);
        }
      }
      throw err;
    }
  },
};
