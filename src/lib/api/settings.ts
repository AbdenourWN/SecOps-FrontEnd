import { apiClient } from "@/lib/api";

export interface SystemSettings {
  max_concurrent_servers: number;
  env_default: number;
}

export const systemSettingsApi = {
  get: () => apiClient.get<SystemSettings>("/api/settings/system"),

  update: (data: { max_concurrent_servers: number }) =>
    apiClient.patch<SystemSettings>("/api/settings/system", data),
};
