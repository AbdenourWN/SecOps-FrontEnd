"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { scriptsApi } from "@/lib/api/scripts";
import type { ScriptCreate, ScriptFilters, RemediationHistoryFilters } from "@/lib/types";
import { useWsInvalidator } from "@/lib/hooks/use-ws-invalidator";

export function useScripts(filters?: ScriptFilters) {
  useWsInvalidator("scripts", [["scripts"]]);
  // Phase 28.5 — per-server scripts topic for live updates on the
  // /servers/[id]/scripts tab.
  useWsInvalidator(
    filters?.owner_id ? `servers.${filters.owner_id}.scripts` : "scripts",
    [["scripts"]],
  );
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

// Phase 28.5 — pre-scope a script to a server. Used by the per-server Scripts tab.
export function useCreateServerScript(serverId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ScriptCreate) =>
      scriptsApi.createForServer(serverId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["scripts"] });
      qc.invalidateQueries({ queryKey: ["servers", serverId] });
    },
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

// Phase 28.5 — single-run fetch for the remediation detail page. Invalidates
// on the global automation.history topic so verdict updates land instantly.
export function useRemediationRun(automationLogId: string) {
  useWsInvalidator("automation.history", [["automation-run", automationLogId]]);
  return useQuery({
    queryKey: ["automation-run", automationLogId],
    queryFn: () => scriptsApi.getRun(automationLogId),
    enabled: !!automationLogId,
    refetchInterval: 300_000,
    placeholderData: (prev) => prev,
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

// Phase 28.4 — kick off an AI review for a single remediation run.
// Invalidates the history list + stats so the new in_progress verdict shows
// immediately; the WS `automation_review_ready` event will refresh again once
// the review completes ~10–20s later.
export function useAnalyzeRemediationRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (automationLogId: string) =>
      scriptsApi.analyzeRun(automationLogId),
    onSuccess: (_data, automationLogId) => {
      // Refetch the single-run query so the persisted
      // `ai_review_verdict="in_progress"` arrives before WS tokens do.
      // Without this, the detail page keeps its stale verdict and
      // `reviewInProgress` is false at token-arrival time, so the stream
      // hook drops every token via its `isRunningRef` gate.
      qc.invalidateQueries({ queryKey: ["automation-run", automationLogId] });
      qc.invalidateQueries({ queryKey: ["automation-history"] });
      qc.invalidateQueries({ queryKey: ["incidents"] });
    },
  });
}
