"use client";

import { useEffect, useRef, useState } from "react";
import { wsClient } from "@/lib/ws";

/**
 * Two-layer stream persistence:
 *
 *  Layer 1 — module-level Map (_store)
 *    Lives in JS memory for the lifetime of the browser tab.
 *    Survives React unmount/remount (SPA navigation).
 *
 *  Layer 2 — localStorage
 *    Survives browser close + reopen and hard refresh.
 *    Key: ai_stream_<sourceType>_<sourceId>
 *    TTL: 15 min — auto-expired on stale reads.
 *
 * State transitions driven by:
 *   - run_id on incoming tokens (detects "new analysis run started")
 *   - ai_analysis_complete WS event (clears stores)
 *   - justResumedRef (we mounted with non-empty content — first token = gap)
 *
 * isRunning is NOT used to wipe state — it can flip true on page reload when an
 * already-running analysis is detected from the DB, and we want to keep the
 * resumed localStorage content visible until the first new token arrives.
 */

const STREAM_TTL_MS = 15 * 60 * 1_000;
const _store = new Map<string, string>();

function lsKey(t: string, id: string) { return `ai_stream_${t}_${id}`; }

function lsRead(sourceType: string, sourceId: string): string {
  if (typeof window === "undefined") return "";
  try {
    const raw = localStorage.getItem(lsKey(sourceType, sourceId));
    if (!raw) return "";
    const { text, savedAt } = JSON.parse(raw) as { text: string; savedAt: number };
    if (Date.now() - savedAt > STREAM_TTL_MS) {
      localStorage.removeItem(lsKey(sourceType, sourceId));
      return "";
    }
    return text ?? "";
  } catch { return ""; }
}

function lsWrite(sourceType: string, sourceId: string, text: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(lsKey(sourceType, sourceId), JSON.stringify({ text, savedAt: Date.now() }));
  } catch { /* quota — in-memory store still works */ }
}

function lsClear(sourceType: string, sourceId: string) {
  if (typeof window === "undefined") return;
  try { localStorage.removeItem(lsKey(sourceType, sourceId)); } catch { /* ignore */ }
}

export type AiStreamResult = {
  streamedMarkdown: string;
  /** True after a mid-stream reconnect where tokens were missed. */
  gapDetected: boolean;
};

export function useAiAnalysisStream(
  sourceType: string,
  sourceId: string,
  serverId: string | undefined,
  isRunning: boolean,
): AiStreamResult {
  const key = `${sourceType}:${sourceId}`;

  // Initial state: read from in-memory store first, then fall back to localStorage.
  // For SSR safety, use an effect to set the state if window wasn't available
  // at init (the initializer runs on both server and client; server returns "").
  const [streamedMarkdown, setStreamedMarkdown] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return _store.get(key) ?? lsRead(sourceType, sourceId);
  });

  const [gapDetected, setGapDetected] = useState(false);

  const isRunningRef = useRef(isRunning);
  useEffect(() => { isRunningRef.current = isRunning; }, [isRunning]);

  /**
   * Set on mount when the hook seeded state from a persisted store while
   * isRunning is/becomes true. The next inbound token triggers gap detection
   * (clears stale content and starts fresh from that token).
   */
  const justResumedRef = useRef(false);

  /**
   * Last token's run_id. Used to detect a brand-new run starting (different
   * run_id from what we have stored), so we can wipe stale state when the user
   * re-triggers analysis without needing the mutation pending state.
   */
  const lastRunIdRef = useRef<string | null>(null);

  // Mount-only: hydrate state and decide if we resumed from storage.
  useEffect(() => {
    const stored = _store.get(key) || lsRead(sourceType, sourceId);
    if (stored) {
      setStreamedMarkdown(stored);
      justResumedRef.current = true; // first incoming token will gap-detect
    } else {
      justResumedRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (!serverId || !sourceId) return;
    const topic = `servers.${serverId}.ai`;

    const handler = (payload: unknown, event: string) => {
      if (!isRunningRef.current) return;
      const p = payload as Record<string, string>;
      if (p.source_id !== sourceId || p.source_type !== sourceType) return;

      if (event === "ai_analysis_token" && p.token) {
        const incomingRun = p.run_id ?? "";

        // ── New analysis run detected ────────────────────────────────────
        // Token arrived with a different run_id → previous analysis is over
        // and a fresh one started. Wipe stale state from previous run.
        if (lastRunIdRef.current && incomingRun && lastRunIdRef.current !== incomingRun) {
          _store.set(key, "");
          lsClear(sourceType, sourceId);
          setStreamedMarkdown("");
          setGapDetected(false);
          justResumedRef.current = false;
        }
        lastRunIdRef.current = incomingRun;

        // ── Reconnect gap (we have stored content from before a disconnect) ──
        if (justResumedRef.current) {
          justResumedRef.current = false;
          setGapDetected(true);
          _store.set(key, p.token);
          lsWrite(sourceType, sourceId, p.token);
          setStreamedMarkdown(p.token);
          return;
        }

        // ── Normal append ───────────────────────────────────────────────
        const next = (_store.get(key) ?? "") + p.token;
        _store.set(key, next);
        lsWrite(sourceType, sourceId, next);
        setStreamedMarkdown(next);
      }

      if (event === "ai_analysis_complete") {
        // Analysis is saved to the DB now; the persisted stream is no longer
        // needed and would only confuse a re-analyze.
        _store.delete(key);
        lsClear(sourceType, sourceId);
        lastRunIdRef.current = null;
        justResumedRef.current = false;
      }
    };

    return wsClient.subscribe(topic, handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverId, sourceId, sourceType, key]);

  return { streamedMarkdown, gapDetected };
}
