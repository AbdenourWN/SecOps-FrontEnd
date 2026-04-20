"use client";

import { useQuery } from "@tanstack/react-query";
import { metricsApi } from "@/lib/api/metrics";
import { useWsInvalidator } from "@/lib/hooks/use-ws-invalidator";

export function useServerMetrics(serverId: string, limit = 50) {
  useWsInvalidator("servers.metrics", [["metrics", serverId, limit]]);
  return useQuery({
    queryKey: ["metrics", serverId, limit],
    queryFn: () => metricsApi.getByServer(serverId, limit),
    enabled: !!serverId,
    refetchInterval: 300_000,
  });
}
