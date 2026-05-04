import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { systemSettingsApi } from "@/lib/api/settings";

export function useSystemSettings() {
  return useQuery({
    queryKey: ["settings", "system"],
    queryFn: systemSettingsApi.get,
  });
}

export function useUpdateSystemSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { max_concurrent_servers: number }) =>
      systemSettingsApi.update(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings", "system"] });
    },
  });
}
