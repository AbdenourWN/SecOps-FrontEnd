"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { aiActionsApi } from "@/lib/api/ai-actions";
import { aiAnalysisApi } from "@/lib/api/ai-analysis";
import { useWsInvalidator } from "@/lib/hooks/use-ws-invalidator";

// ── Mutation-action inbox hooks ───────────────────────────────────────────────

export function useAiActions(status?: string, page = 1) {
  useWsInvalidator("ai_actions", [["ai-actions"]]);
  return useQuery({
    queryKey: ["ai-actions", status, page],
    queryFn: () => aiActionsApi.list(status, page),
    refetchInterval: 30_000,
    placeholderData: (prev) => prev,
  });
}

export function useAiPendingCount() {
  useWsInvalidator("ai_actions", [["ai-actions", "count"]]);
  return useQuery({
    queryKey: ["ai-actions", "count"],
    queryFn: aiActionsApi.pendingCount,
    refetchInterval: 30_000,
  });
}

export function useApproveAiAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => aiActionsApi.approve(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-actions"] });
      qc.invalidateQueries({ queryKey: ["anomalies"] });
      qc.invalidateQueries({ queryKey: ["incidents"] });
    },
  });
}

export function useRejectAiAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => aiActionsApi.reject(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-actions"] });
    },
  });
}

// ── AI Command hooks ──────────────────────────────────────────────────────────

export function useAiCommands(filters?: { status?: string; server_id?: string; source_id?: string; source_type?: string; page?: number }) {
  useWsInvalidator("ai_actions", [["ai-commands"]]);
  return useQuery({
    queryKey: ["ai-commands", filters],
    queryFn: () => aiActionsApi.commands.list(filters),
    refetchInterval: 10_000,
    placeholderData: (prev) => prev,
  });
}

export function useAiCommandsForSource(sourceType: string, sourceId: string, serverId?: string, page = 1) {
  const PAGE_SIZE = 10;
  // Global ai_actions topic — invalidates the /ai-actions page list
  useWsInvalidator("ai_actions", [["ai-commands", sourceType, sourceId, page]]);
  // Per-server ai topic — real-time command progress for this specific server
  useWsInvalidator(
    serverId ? `servers.${serverId}.ai` : "ai_actions",
    [["ai-commands", sourceType, sourceId, page]],
  );
  return useQuery({
    queryKey: ["ai-commands", sourceType, sourceId, page],
    queryFn: () => aiActionsApi.commands.list({ source_id: sourceId, page, page_size: PAGE_SIZE }),
    placeholderData: (prev) => prev,
    enabled: !!sourceId,
  });
}

export function useAiCommand(id: string) {
  useWsInvalidator("ai_actions", [["ai-command", id]]);
  return useQuery({
    queryKey: ["ai-command", id],
    queryFn: () => aiActionsApi.commands.getById(id),
    refetchInterval: 5_000,
    enabled: !!id,
  });
}

export function useAiCommandPendingCount() {
  return useQuery({
    queryKey: ["ai-commands", "count"],
    queryFn: aiActionsApi.commands.pendingCount,
    refetchInterval: 15_000,
  });
}

export function useApproveCommands() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ command_ids, decided_by }: { command_ids: string[]; decided_by?: string }) =>
      aiActionsApi.commands.approve(command_ids, decided_by),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-commands"] });
    },
  });
}

export function useRejectCommands() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ command_ids, decided_by }: { command_ids: string[]; decided_by?: string }) =>
      aiActionsApi.commands.reject(command_ids, decided_by),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-commands"] });
    },
  });
}

export function useRetryCommand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => aiActionsApi.commands.retry(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-commands"] });
    },
  });
}

// ── AI Analysis hooks ─────────────────────────────────────────────────────────

export function useAiAnalysis(analysisId?: string | null) {
  return useQuery({
    queryKey: ["ai-analysis", analysisId],
    queryFn: () => aiAnalysisApi.getById(analysisId!),
    enabled: !!analysisId,
    staleTime: 5 * 60_000,   // analyses don't change once written
  });
}

export function useAiAnalysisHistory(sourceType: string, sourceId: string, analysisType?: string) {
  return useQuery({
    queryKey: ["ai-analysis-history", sourceType, sourceId, analysisType],
    queryFn: () => aiAnalysisApi.listForSource(sourceType, sourceId, analysisType),
    enabled: !!sourceId,
    staleTime: 30_000,
  });
}
