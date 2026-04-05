"use client";

import { createContext, useContext } from "react";

// Minimal mock auth context — will be replaced with JWT in P4.
// Keeps all auth-consumer components compilable without needing real auth logic yet.
interface AuthContextValue {
  user: { username: string; role: string };
}

const AuthContext = createContext<AuthContextValue>({
  user: { username: "admin", role: "admin" },
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <AuthContext.Provider value={{ user: { username: "admin", role: "admin" } }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
