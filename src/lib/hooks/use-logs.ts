"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { logsApi } from "@/lib/api/logs";
import type { LogLevel, LogSourceCreate, LogSourceUpdate } from "@/lib/types";

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
    placeholderData: (prev) => prev,
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

// ── Log sources ──────────────────────────────────────────────────────
export function useLogSources(serverId: string) {
  return useQuery({
    queryKey: ["log-sources", serverId],
    queryFn: () => logsApi.listSources(serverId),
    enabled: !!serverId,
    refetchInterval: 30_000,
  });
}

export function useCreateLogSource(serverId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: LogSourceCreate) => logsApi.createSource(data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["log-sources", serverId] }),
  });
}

export function useUpdateLogSource(serverId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: LogSourceUpdate }) =>
      logsApi.updateSource(id, data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["log-sources", serverId] }),
  });
}

export function useDeleteLogSource(serverId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => logsApi.deleteSource(id),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["log-sources", serverId] }),
  });
}
