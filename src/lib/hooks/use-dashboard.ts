"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { dashboardApi } from "@/lib/api/dashboard";
import { useWsInvalidator } from "@/lib/hooks/use-ws-invalidator";

export function useDashboardSummary() {
  useWsInvalidator("dashboard.summary", [["dashboard", "summary"]]);
  return useQuery({
    queryKey: ["dashboard", "summary"],
    queryFn: dashboardApi.getSummary,
    refetchInterval: 300_000,
  });
}

export function useRecentIncidents(limit = 10) {
  useWsInvalidator("incidents", [["dashboard", "recent-incidents"]]);
  return useQuery({
    queryKey: ["dashboard", "recent-incidents", limit],
    queryFn: () => dashboardApi.getRecentIncidents(limit),
    refetchInterval: 300_000,
  });
}

export function useServerHealth() {
  useWsInvalidator("servers.status", [["dashboard", "server-health"]]);
  return useQuery({
    queryKey: ["dashboard", "server-health"],
    queryFn: dashboardApi.getServerHealth,
    refetchInterval: 300_000,
  });
}

// Phase 28.7 — app-wide AI overview. No refetchInterval (on-demand only) and
// no WS invalidator — the component refetches once its stream completes.
export function useAiOverview() {
  return useQuery({
    queryKey: ["dashboard", "ai-overview"],
    queryFn: dashboardApi.getAiOverview,
  });
}

export function useGenerateAiOverview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: dashboardApi.generateAiOverview,
    onSuccess: () => {
      // The actual result arrives via WS streaming; the component invalidates
      // again on stream-complete to pick up the persisted markdown.
      qc.invalidateQueries({ queryKey: ["dashboard", "ai-overview"] });
    },
  });
}
