"use client";

import { useQuery } from "@tanstack/react-query";
import { metricsApi } from "@/lib/api/metrics";

export function useServerMetrics(serverId: string, limit = 50) {
  return useQuery({
    queryKey: ["metrics", serverId, limit],
    queryFn: () => metricsApi.getByServer(serverId, limit),
    enabled: !!serverId,
    refetchInterval: 60_000,
  });
}
