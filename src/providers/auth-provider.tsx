"use client";

import { createContext, useContext, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { apiClient } from "@/lib/api";

export type UserRole = "admin" | "operator" | "viewer";

export interface AuthUser {
  id: string;
  username: string;
  email?: string | null;
  role: UserRole;
  server_ids: string[];
  is_protected: boolean;
  is_active: boolean;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAdmin: boolean;
  isOperator: boolean; // operator OR admin (can perform operational actions)
  canAccessServer: (serverId: string) => boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refetch: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const AUTH_ME_KEY = ["auth", "me"] as const;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();

  const { data: user, isLoading, refetch } = useQuery<AuthUser | null>({
    queryKey: AUTH_ME_KEY,
    queryFn: async () => {
      try {
        return await apiClient.get<AuthUser>("/api/auth/me");
      } catch {
        return null; // 401 → unauthenticated (api.ts already attempted a refresh)
      }
    },
    retry: false,
    staleTime: 60_000,
  });

  const login = useCallback(
    async (username: string, password: string) => {
      await apiClient.post("/api/auth/login", { username, password });
      await queryClient.invalidateQueries({ queryKey: AUTH_ME_KEY });
    },
    [queryClient],
  );

  const logout = useCallback(async () => {
    try {
      await apiClient.post("/api/auth/logout");
    } catch {
      /* ignore — clearing client state regardless */
    }
    queryClient.clear();
    if (typeof window !== "undefined") window.location.href = "/login";
  }, [queryClient]);

  const u = user ?? null;
  const value: AuthContextValue = {
    user: u,
    isLoading,
    isAdmin: u?.role === "admin",
    isOperator: u?.role === "admin" || u?.role === "operator",
    canAccessServer: (serverId: string) =>
      u?.role === "admin" || (u?.server_ids ?? []).includes(serverId),
    login,
    logout,
    refetch,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}

function FullScreenSpinner() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

/**
 * Gates the app on authentication. `/login` always renders; every other route
 * waits for `/me` and redirects to `/login` when unauthenticated. This is the
 * authoritative client gate (the `proxy.ts` cookie check is an optimistic
 * fast-path; the backend 401s are the real enforcement).
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  if (isLoginPage) return <>{children}</>;
  if (isLoading) return <FullScreenSpinner />;
  if (!user) {
    if (typeof window !== "undefined") router.replace("/login");
    return <FullScreenSpinner />;
  }
  return <>{children}</>;
}
