"use client";

import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "@/lib/api/dashboard";

export function useDashboardSummary() {
  return useQuery({
    queryKey: ["dashboard", "summary"],
    queryFn: dashboardApi.getSummary,
    refetchInterval: 30_000,
  });
}

export function useRecentIncidents(limit = 10) {
  return useQuery({
    queryKey: ["dashboard", "recent-incidents", limit],
    queryFn: () => dashboardApi.getRecentIncidents(limit),
    refetchInterval: 15_000,
  });
}

export function useServerHealth() {
  return useQuery({
    queryKey: ["dashboard", "server-health"],
    queryFn: dashboardApi.getServerHealth,
    refetchInterval: 30_000,
  });
}
