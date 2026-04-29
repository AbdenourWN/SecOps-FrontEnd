"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { scriptsApi } from "@/lib/api/scripts";
import type { ScriptCreate, ScriptFilters, RemediationHistoryFilters } from "@/lib/types";
import { useWsInvalidator } from "@/lib/hooks/use-ws-invalidator";

export function useScripts(filters?: ScriptFilters) {
  useWsInvalidator("scripts", [["scripts"]]);
  return useQuery({
    queryKey: ["scripts", filters],
    queryFn: () => scriptsApi.list(filters),
    refetchInterval: 300_000,
    placeholderData: (prev) => prev,
  });
}

export function useScript(id: string) {
  return useQuery({
    queryKey: ["scripts", id],
    queryFn: () => scriptsApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateScript() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ScriptCreate) => scriptsApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["scripts"] }),
  });
}

export function useUpdateScript() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ScriptCreate> }) =>
      scriptsApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["scripts"] }),
  });
}

export function useDeleteScript() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => scriptsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["scripts"] }),
  });
}

export function useToggleScript() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => scriptsApi.toggle(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["scripts"] }),
  });
}

export function useRemediationHistory(
  filters: RemediationHistoryFilters = { limit: 10 }
) {
  const topic = filters.server_id
    ? `servers.${filters.server_id}.automation`
    : "automation.history";
  useWsInvalidator(topic, [["automation-history"]]);
  return useQuery({
    queryKey: ["automation-history", filters],
    queryFn: () => scriptsApi.history(filters),
    refetchInterval: 300_000,
  });
}

export function useRemediationHistoryStats(
  filters: Omit<RemediationHistoryFilters, "limit" | "skip"> = {}
) {
  const topic = filters.server_id
    ? `servers.${filters.server_id}.automation`
    : "automation.history";
  useWsInvalidator(topic, [["automation-history-stats"]]);
  return useQuery({
    queryKey: ["automation-history-stats", filters],
    queryFn: () => scriptsApi.historyStats(filters),
    refetchInterval: 300_000,
  });
}
