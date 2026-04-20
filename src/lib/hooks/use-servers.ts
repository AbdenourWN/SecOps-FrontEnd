"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { serversApi } from "@/lib/api/servers";
import type { ServerCreate, ServerUpdate, ServerDelete, ServerFilters } from "@/lib/types";
import { useWsInvalidator } from "@/lib/hooks/use-ws-invalidator";

export function useServers(filters: ServerFilters = {}) {
  useWsInvalidator("servers", [["servers"]]);
  useWsInvalidator("servers.status", [["servers"]]);
  return useQuery({
    queryKey: ["servers", filters],
    queryFn: () => serversApi.list(filters),
    refetchInterval: 300_000,
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
    mutationFn: ({
      id,
      command,
      confirmed,
      timeout_s,
    }: {
      id: string;
      command: string;
      confirmed?: boolean;
      timeout_s?: number;
    }) => serversApi.execute(id, command, { confirmed, timeout_s }),
  });
}
