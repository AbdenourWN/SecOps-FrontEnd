"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { rulesApi } from "@/lib/api/rules";
import type { DetectionRuleCreate, RuleFilters } from "@/lib/types";
import { useWsInvalidator } from "@/lib/hooks/use-ws-invalidator";

export function useRules(filters?: RuleFilters) {
  useWsInvalidator("rules", [["rules"]]);
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
