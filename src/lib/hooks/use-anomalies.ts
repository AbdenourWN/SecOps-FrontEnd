"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { anomaliesApi } from "@/lib/api/anomalies";
import type { AnomalyFilters, LogObservation } from "@/lib/types";
import { useWsInvalidator } from "@/lib/hooks/use-ws-invalidator";

export function useAnomalies(filters?: AnomalyFilters) {
  useWsInvalidator("anomalies", [["anomalies"]]);
  return useQuery({
    queryKey: ["anomalies", filters],
    queryFn: () => anomaliesApi.list(filters),
    refetchInterval: 300_000,
    placeholderData: (prev) => prev,
  });
}

export function useAnomaly(id: string) {
  useWsInvalidator("anomalies", [["anomalies", id]]);
  return useQuery({
    queryKey: ["anomalies", id],
    queryFn: () => anomaliesApi.getById(id),
    enabled: !!id,
    refetchInterval: 300_000,
  });
}

export function useAnomalyStats() {
  useWsInvalidator("anomalies", [["anomalies", "stats"]]);
  return useQuery({
    queryKey: ["anomalies", "stats"],
    queryFn: anomaliesApi.getStats,
    refetchInterval: 300_000,
  });
}

export function useServerAnomalies(serverId: string) {
  useWsInvalidator(`servers.${serverId}.anomalies`, [["anomalies", serverId]]);
  return useQuery({
    queryKey: ["anomalies", serverId],
    queryFn: () => anomaliesApi.list({ server_id: serverId }),
    enabled: !!serverId,
    refetchInterval: 300_000,
    placeholderData: (prev) => prev,
  });
}

export function useServerAnomaliesFiltered(serverId: string, filters: AnomalyFilters) {
  useWsInvalidator(`servers.${serverId}.anomalies`, [["anomalies", serverId]]);
  return useQuery({
    queryKey: ["anomalies", serverId, filters],
    queryFn: () => anomaliesApi.list({ server_id: serverId, ...filters }),
    enabled: !!serverId,
    refetchInterval: 300_000,
    placeholderData: (prev) => prev,
  });
}

export function useAnomalyAiAnalysis() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => anomaliesApi.triggerAiAnalysis(id),
    onSuccess: (data, id) => {
      qc.setQueryData(
        ["anomalies", id],
        (old: LogObservation | undefined) =>
          old
            ? {
                ...old,
                ai_analysis: data.ai_analysis,
                ai_analyzed_at: new Date().toISOString(),
              }
            : old
      );
      qc.invalidateQueries({ queryKey: ["anomalies"] });
    },
  });
}

export function useDismissAnomaly() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => anomaliesApi.dismiss(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["anomalies"] });
    },
  });
}

export function usePromoteAnomaly() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => anomaliesApi.promote(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["anomalies"] });
      qc.invalidateQueries({ queryKey: ["incidents"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
