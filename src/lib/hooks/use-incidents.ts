"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { incidentsApi } from "@/lib/api/incidents";
import type { IncidentStatus, SeverityLevel } from "@/lib/types";

type IncidentFilters = {
  server_id?: string;
  severity?: SeverityLevel;
  status?: IncidentStatus;
  skip?: number;
  limit?: number;
};

export function useIncidents(filters?: IncidentFilters) {
  return useQuery({
    queryKey: ["incidents", filters],
    queryFn: () => incidentsApi.list(filters),
    refetchInterval: 15_000,
  });
}

export function useIncident(id: string) {
  return useQuery({
    queryKey: ["incidents", id],
    queryFn: () => incidentsApi.getById(id),
    enabled: !!id,
  });
}

export function useIncidentStats() {
  return useQuery({
    queryKey: ["incidents", "stats"],
    queryFn: incidentsApi.getStats,
    refetchInterval: 15_000,
  });
}

export function useUpdateIncidentStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: IncidentStatus }) =>
      incidentsApi.updateStatus(id, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["incidents"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useAiAnalysis() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (incidentId: string) =>
      incidentsApi.triggerAiAnalysis(incidentId),
    onSuccess: (data, incidentId) => {
      // Directly update the cached incident with the returned analysis
      // so the UI shows it immediately without waiting for a refetch
      qc.setQueryData(
        ["incidents", incidentId],
        (old: import("@/lib/types").IncidentResponse | undefined) =>
          old ? { ...old, ai_analysis: data.ai_analysis } : old
      );
      qc.invalidateQueries({ queryKey: ["incidents"] });
    },
  });
}
