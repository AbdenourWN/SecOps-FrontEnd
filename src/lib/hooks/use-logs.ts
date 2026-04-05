"use client";

import { useQuery } from "@tanstack/react-query";
import { logsApi } from "@/lib/api/logs";
import type { LogLevel } from "@/lib/types";

type LogSearchParams = {
  q?: string;
  server_id?: string;
  level?: LogLevel;
  from_date?: string;
  to_date?: string;
  skip?: number;
  limit?: number;
};

export function useLogSearch(params: LogSearchParams, enabled = false) {
  return useQuery({
    queryKey: ["logs", "search", params],
    queryFn: () => logsApi.search(params),
    enabled,
  });
}

export function useServerLogs(serverId: string, limit = 100) {
  return useQuery({
    queryKey: ["logs", serverId, limit],
    queryFn: () => logsApi.getByServer(serverId, limit),
    enabled: !!serverId,
    refetchInterval: 30_000,
  });
}
