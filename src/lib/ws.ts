"use client";

import { getAuthToken } from "./api";

export type WsState = "connecting" | "open" | "closed" | "reconnecting";
export type WsHandler = (payload: unknown, event: string) => void;

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8500";

function deriveWsUrl(): string {
  if (typeof window === "undefined") return "";
  return `${API_BASE_URL.replace(/^http/, "ws")}/api/ws`;
}

const PING_INTERVAL_MS = 20_000;
const MAX_BACKOFF_MS = 30_000;

class WsClient {
  private ws: WebSocket | null = null;
  private state: WsState = "closed";
  private handlers = new Map<string, Set<WsHandler>>();
  private stateListeners = new Set<(s: WsState) => void>();
  private reconnectAttempt = 0;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private explicitlyClosed = false;
  private url: string;

  constructor(url: string) {
    this.url = url;
  }

  connect(): void {
    if (!this.url) return; // SSR guard
    if (this.state === "open" || this.state === "connecting") return;
    this.explicitlyClosed = false;
    this.setState(
      this.reconnectAttempt === 0 ? "connecting" : "reconnecting"
    );

    try {
      this.ws = new WebSocket(this.url);
    } catch {
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = this.onOpen;
    this.ws.onmessage = this.onMessage;
    this.ws.onclose = this.onClose;
    this.ws.onerror = () => {
      /* close handler triggers reconnect */
    };
  }

  close(): void {
    this.explicitlyClosed = true;
    this.setState("closed");
    this.clearTimers();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  subscribe(topic: string, handler: WsHandler): () => void {
    let set = this.handlers.get(topic);
    const firstHandler = !set;
    if (!set) {
      set = new Set();
      this.handlers.set(topic, set);
    }
    set.add(handler);
    if (firstHandler) {
      this.sendJson({ type: "subscribe", topic });
    }
    return () => this.unsubscribe(topic, handler);
  }

  private unsubscribe(topic: string, handler: WsHandler): void {
    const set = this.handlers.get(topic);
    if (!set) return;
    set.delete(handler);
    if (set.size === 0) {
      this.handlers.delete(topic);
      this.sendJson({ type: "unsubscribe", topic });
    }
  }

  getState(): WsState {
    return this.state;
  }

  onStateChange(listener: (s: WsState) => void): () => void {
    this.stateListeners.add(listener);
    return () => {
      this.stateListeners.delete(listener);
    };
  }

  private onOpen = (): void => {
    this.setState("open");
    this.reconnectAttempt = 0;
    const token = getAuthToken();
    this.sendJson({ type: "auth", token });
    for (const topic of this.handlers.keys()) {
      this.sendJson({ type: "subscribe", topic });
    }
    this.pingTimer = setInterval(
      () => this.sendJson({ type: "ping" }),
      PING_INTERVAL_MS
    );
  };

  private onMessage = (e: MessageEvent): void => {
    let msg: {
      type?: string;
      topic?: string;
      event?: string;
      payload?: unknown;
    };
    try {
      msg = JSON.parse(e.data);
    } catch {
      return;
    }
    if (msg.type === "event" && typeof msg.topic === "string") {
      const set = this.handlers.get(msg.topic);
      if (set) {
        set.forEach((h) => h(msg.payload, msg.event ?? ""));
      }
    }
  };

  private onClose = (): void => {
    this.clearTimers();
    this.ws = null;
    if (this.explicitlyClosed) return;
    this.scheduleReconnect();
  };

  private scheduleReconnect(): void {
    this.setState("reconnecting");
    const delay = Math.min(
      MAX_BACKOFF_MS,
      1000 * Math.pow(2, this.reconnectAttempt)
    );
    this.reconnectAttempt += 1;
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }

  private clearTimers(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private sendJson(obj: unknown): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(obj));
    }
  }

  private setState(s: WsState): void {
    if (this.state === s) return;
    this.state = s;
    this.stateListeners.forEach((l) => l(s));
  }
}

export const wsClient = new WsClient(deriveWsUrl());
