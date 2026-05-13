"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { incidentsApi } from "@/lib/api/incidents";
import type { IncidentStatus, IncidentFilters } from "@/lib/types";
import { useWsInvalidator } from "@/lib/hooks/use-ws-invalidator";

export function useIncidents(filters?: IncidentFilters) {
  useWsInvalidator("incidents", [["incidents"]]);
  return useQuery({
    queryKey: ["incidents", filters],
    queryFn: () => incidentsApi.list(filters),
    refetchInterval: 300_000,
    placeholderData: (prev) => prev,
  });
}

export function useIncident(id: string) {
  return useQuery({
    queryKey: ["incidents", id],
    queryFn: () => incidentsApi.getById(id),
    enabled: !!id,
    // Poll every 3s while analysis is running so the page reflects
    // completion without requiring a manual refresh.
    refetchInterval: (query) =>
      query.state.data?.ai_analysis_in_progress ? 3_000 : false,
  });
}

export function useIncidentStats() {
  useWsInvalidator("incidents", [["incidents", "stats"]]);
  return useQuery({
    queryKey: ["incidents", "stats"],
    queryFn: incidentsApi.getStats,
    refetchInterval: 300_000,
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

export function useServerIncidents(serverId: string) {
  useWsInvalidator(`servers.${serverId}.incidents`, [["incidents", serverId]]);
  return useQuery({
    queryKey: ["incidents", serverId],
    queryFn: () => incidentsApi.list({ server_id: serverId }),
    enabled: !!serverId,
    refetchInterval: 300_000,
    placeholderData: (prev) => prev,
  });
}

export function useAiAnalysis() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (incidentId: string) =>
      incidentsApi.triggerAiAnalysis(incidentId),
    onMutate: (incidentId) => {
      qc.setQueryData(
        ["incidents", incidentId],
        (old: import("@/lib/types").IncidentResponse | undefined) =>
          old ? { ...old, ai_analysis_in_progress: true } : old
      );
    },
    onSuccess: (data, incidentId) => {
      qc.setQueryData(
        ["incidents", incidentId],
        (old: import("@/lib/types").IncidentResponse | undefined) =>
          old
            ? {
                ...old,
                ai_analysis: data.ai_analysis,
                ai_analysis_latest_id: data.analysis_id,
                ai_manual_commands: data.manual_commands ?? [],
                ai_analysis_in_progress: false,
              }
            : old
      );
      qc.invalidateQueries({ queryKey: ["incidents"] });
      qc.invalidateQueries({ queryKey: ["ai-commands"] });
    },
  });
}
