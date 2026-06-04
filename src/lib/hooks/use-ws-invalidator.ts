"use client";

import { useEffect } from "react";
import { QueryKey, useQueryClient } from "@tanstack/react-query";
import { wsClient } from "../ws";

/**
 * Subscribe a React Query key (or list of keys) to a WS topic.
 * Any event on that topic triggers `invalidateQueries` on every key.
 */
export function useWsInvalidator(
  topic: string,
  queryKeys: QueryKey[]
): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!topic) return; // e.g. per-user topic before the current user is known
    const unsubscribe = wsClient.subscribe(topic, () => {
      for (const key of queryKeys) {
        queryClient.invalidateQueries({ queryKey: key });
      }
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic, queryClient, JSON.stringify(queryKeys)]);
}
