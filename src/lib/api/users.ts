import { apiClient } from "@/lib/api";

export type ManagedUserRole = "admin" | "operator" | "viewer";

export interface ManagedUser {
  id: string;
  username: string;
  email?: string | null;
  role: ManagedUserRole;
  server_ids: string[];
  is_active: boolean;
  is_protected: boolean;
  last_login_at?: string | null;
  created_at?: string | null;
}

export interface UserCreatePayload {
  username: string;
  password: string;
  email?: string | null;
  role: ManagedUserRole;
  server_ids: string[];
}

export interface UserUpdatePayload {
  email?: string | null;
  role?: ManagedUserRole;
  server_ids?: string[];
  is_active?: boolean;
}

export const usersApi = {
  list: () => apiClient.get<ManagedUser[]>("/api/users"),
  create: (data: UserCreatePayload) => apiClient.post<ManagedUser>("/api/users", data),
  update: (id: string, data: UserUpdatePayload) =>
    apiClient.patch<ManagedUser>(`/api/users/${id}`, data),
  resetPassword: (id: string, new_password: string) =>
    apiClient.post<{ status: string }>(`/api/users/${id}/reset-password`, { new_password }),
  remove: (id: string) => apiClient.delete<{ status: string }>(`/api/users/${id}`),
};
