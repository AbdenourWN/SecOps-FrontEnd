"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { anomaliesApi } from "@/lib/api/anomalies";
import type { AnomalyFilters } from "@/lib/types";
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
