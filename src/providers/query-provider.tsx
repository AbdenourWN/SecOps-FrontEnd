"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { wsClient } from "@/lib/ws";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
          },
        },
      })
  );

  useEffect(() => {
    wsClient.connect();
    return () => wsClient.close();
  }, []);

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
