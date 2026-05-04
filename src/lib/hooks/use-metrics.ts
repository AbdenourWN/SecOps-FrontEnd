"use client";

import { useQuery } from "@tanstack/react-query";
import { metricsApi, type MetricQueryParams } from "@/lib/api/metrics";
import { useWsInvalidator } from "@/lib/hooks/use-ws-invalidator";

export function useServerMetrics(serverId: string, limit = 50) {
  useWsInvalidator(`servers.${serverId}.metrics`, [["metrics", serverId]]);
  return useQuery({
    queryKey: ["metrics", serverId, limit],
    queryFn: () => metricsApi.getByServer(serverId, { limit }),
    enabled: !!serverId,
    refetchInterval: 300_000,
  });
}

export function useServerMetricsHistory(serverId: string, params: MetricQueryParams = {}) {
  const { limit = 1000, fromDate, toDate } = params;
  useWsInvalidator(`servers.${serverId}.metrics`, [["metrics", serverId, "history"]]);
  return useQuery({
    queryKey: ["metrics", serverId, "history", limit, fromDate, toDate],
    queryFn: () => metricsApi.getByServer(serverId, { limit, fromDate, toDate }),
    enabled: !!serverId,
    refetchInterval: 60_000,
    placeholderData: (prev) => prev,
  });
}
