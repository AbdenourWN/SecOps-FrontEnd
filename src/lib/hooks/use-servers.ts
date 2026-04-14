"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { serversApi } from "@/lib/api/servers";
import type { ServerCreate, ServerUpdate, ServerDelete, ServerFilters } from "@/lib/types";

export function useServers(filters: ServerFilters = {}) {
  return useQuery({
    queryKey: ["servers", filters],
    queryFn: () => serversApi.list(filters),
    refetchInterval: 30_000,
    placeholderData: (prev) => prev,
  });
}

export function useServer(id: string) {
  return useQuery({
    queryKey: ["servers", id],
    queryFn: () => serversApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateServer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ServerCreate) => serversApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["servers"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useUpdateServer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ServerUpdate }) =>
      serversApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["servers"] }),
  });
}

export function useDeleteServer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ServerDelete }) =>
      serversApi.delete(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["servers"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useExecuteCommand() {
  return useMutation({
    mutationFn: ({ id, command }: { id: string; command: string }) =>
      serversApi.execute(id, command),
  });
}
