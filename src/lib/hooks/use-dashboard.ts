"use client";

import { useQuery } from "@tanstack/react-query";
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
