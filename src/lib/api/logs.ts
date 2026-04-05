import { apiClient } from "@/lib/api";
import type { LogEntry, LogSearchResponse, LogSourceCreate, LogLevel } from "@/lib/types";

type LogSearchParams = {
  q?: string;
  server_id?: string;
  level?: LogLevel;
  from_date?: string;
  to_date?: string;
  skip?: number;
  limit?: number;
};

export const logsApi = {
  // Returns a wrapped response with {total, showing, skip, limit, results}
  search: (params: LogSearchParams) =>
    apiClient.get<LogSearchResponse>("/api/logs/search", { params }),

  // Returns raw log array
  getByServer: (serverId: string, limit = 100) =>
    apiClient.get<LogEntry[]>("/api/logs/" + serverId, {
      params: { limit },
    }),

  collect: (serverId: string) =>
    apiClient.post<{ status: string }>("/api/logs/collect/" + serverId),

  addSource: (data: LogSourceCreate) =>
    apiClient.post<{ status: string; id: string }>("/api/logs/sources", data),
};
