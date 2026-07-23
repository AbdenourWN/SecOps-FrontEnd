"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { rulesApi } from "@/lib/api/rules";
import type { DetectionRuleCreate, RuleFilters, RuleBulkToggle } from "@/lib/types";
import { useWsInvalidator } from "@/lib/hooks/use-ws-invalidator";

export function useRules(filters?: RuleFilters) {
  useWsInvalidator("rules", [["rules"]]);
  // Phase 28.5 — when scoped to a server, also invalidate on that server's
  // per-server rules topic so the per-server Rules tab refreshes live when
  // an operator (or AI approval) inserts a new server-scoped rule elsewhere.
  useWsInvalidator(
    filters?.owner_id ? `servers.${filters.owner_id}.rules` : "rules",
    [["rules"]],
  );
  return useQuery({
    queryKey: ["rules", filters],
    queryFn: () => rulesApi.list(filters),
    refetchInterval: 300_000,
    placeholderData: (prev) => prev,
  });
}

export function useRule(id: string) {
  return useQuery({
    queryKey: ["rules", id],
    queryFn: () => rulesApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: DetectionRuleCreate) => rulesApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rules"] }),
  });
}

// Phase 28.5 — pre-scope a rule to a server. Used by the per-server Rules tab.
export function useCreateServerRule(serverId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: DetectionRuleCreate) =>
      rulesApi.createForServer(serverId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rules"] });
      // Re-fetch the server doc so the auto-flip to `both` (if any) lands
      // in the UI without a manual reload.
      qc.invalidateQueries({ queryKey: ["servers", serverId] });
    },
  });
}

export function useUpdateRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<DetectionRuleCreate> }) =>
      rulesApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rules"] }),
  });
}

export function useDeleteRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => rulesApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rules"] }),
  });
}

// Bulk enable/disable all rules matching the active scope filters (admin only).
export function useBulkToggleRules() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: RuleBulkToggle) => rulesApi.bulkToggle(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rules"] }),
  });
}
