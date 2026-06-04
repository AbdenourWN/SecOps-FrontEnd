"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  usersApi,
  type UserCreatePayload,
  type UserUpdatePayload,
} from "@/lib/api/users";

const USERS_KEY = ["users"];

export function useUsers() {
  return useQuery({ queryKey: USERS_KEY, queryFn: usersApi.list });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UserCreatePayload) => usersApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: USERS_KEY }),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UserUpdatePayload }) =>
      usersApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: USERS_KEY }),
  });
}

export function useResetUserPassword() {
  return useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      usersApi.resetPassword(id, password),
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => usersApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: USERS_KEY }),
  });
}
