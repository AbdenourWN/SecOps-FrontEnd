"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { serversApi } from "@/lib/api/servers";
import { aiAnalysisApi } from "@/lib/api/ai-analysis";
import type { AiAnalysis, ServerCreate, ServerUpdate, ServerDelete, ServerFilters, WarmupResetRequest } from "@/lib/types";
import { useWsInvalidator } from "@/lib/hooks/use-ws-invalidator";

export function useServers(filters: ServerFilters = {}) {
  useWsInvalidator("servers", [["servers"]]);
  useWsInvalidator("servers.status", [["servers"]]);
  return useQuery({
    queryKey: ["servers", filters],
    queryFn: () => serversApi.list(filters),
    refetchInterval: 300_000,
    placeholderData: (prev) => prev,
  });
}

export function useServer(id: string) {
  return useQuery({
    queryKey: ["servers", id],
    queryFn: () => serversApi.getById(id),
    enabled: !!id,
    // Poll faster while an AI server-overview analysis is in progress so the
    // "Analyzing…" spinner clears within seconds of completion. Otherwise the
    // 5-minute fleet-wide poll on useServers governs freshness.
    refetchInterval: (q) => (q.state.data?.ai_analysis_in_progress ? 3_000 : false),
  });
}

export function useCreateServer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ServerCreate) => serversApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["servers"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useUpdateServer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ServerUpdate }) =>
      serversApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["servers"] }),
  });
}

export function useDeleteServer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ServerDelete }) =>
      serversApi.delete(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["servers"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useResetWarmup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body?: WarmupResetRequest }) =>
      serversApi.resetWarmup(id, body),
    onSuccess: (_d, { id }) => {
      qc.invalidateQueries({ queryKey: ["servers"] });
      qc.invalidateQueries({ queryKey: ["servers", id] });
      qc.invalidateQueries({ queryKey: ["anomalies"] });
    },
  });
}

export function useResetBaseline() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => serversApi.resetBaseline(id),
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: ["servers"] });
      qc.invalidateQueries({ queryKey: ["servers", id] });
    },
  });
}

export function useRecalculateStats() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => serversApi.recalculateStats(id),
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: ["servers", id] });
      qc.invalidateQueries({ queryKey: ["servers"] });
    },
  });
}

export function useExecuteCommand() {
  return useMutation({
    mutationFn: ({
      id,
      command,
      confirmed,
      timeout_s,
    }: {
      id: string;
      command: string;
      confirmed?: boolean;
      timeout_s?: number;
    }) => serversApi.execute(id, command, { confirmed, timeout_s }),
  });
}

// ── AI Server Overview (Phase 28.2) ──────────────────────────────────────────

/**
 * Trigger a server-overview AI analysis run.
 * Sets `ai_analysis_in_progress` server-side, streams tokens via WS, persists
 * to `ai_analysis` collection, then resolves with the result.
 */
export function useServerAiOverview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, hours }: { id: string; hours: number }) =>
      serversApi.runOverview(id, hours),
    onMutate: async ({ id }) => {
      // Optimistically flip the in-progress flag so the spinner shows
      // immediately, even before the next server refetch.
      qc.setQueryData(["servers", id], (prev: unknown) => {
        if (!prev || typeof prev !== "object") return prev;
        return { ...prev, ai_analysis_in_progress: true };
      });
    },
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ["servers", id] });
      qc.invalidateQueries({ queryKey: ["ai-server-overview", id] });
      qc.invalidateQueries({ queryKey: ["ai-analyses-list"] });
    },
    onSettled: (_data, _err, { id }) => {
      // Always refetch on settle so the optimistic flag doesn't get stuck on
      // failure paths.
      qc.invalidateQueries({ queryKey: ["servers", id] });
    },
  });
}

/**
 * Latest cached server-overview analysis for this server, fetched from the
 * existing ai_analysis listing endpoint with analysis_type filter. Returns
 * `null` when no overview exists yet.
 */
export function useServerLatestOverview(serverId: string) {
  return useQuery({
    queryKey: ["ai-server-overview", serverId],
    queryFn: async (): Promise<AiAnalysis | null> => {
      const rows = await aiAnalysisApi.listForServer(serverId, "server_overview");
      return rows && rows.length > 0 ? rows[0] : null;
    },
    enabled: !!serverId,
    staleTime: 30_000,
  });
}
