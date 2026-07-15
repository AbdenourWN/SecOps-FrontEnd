"use client";

import { getAuthToken } from "./api";

// ---------------------------------------------------------------------------
// Typed server-to-client events
// ---------------------------------------------------------------------------

export interface HelloEvent {
  type: "hello";
  server_id: string;
  protocol_version: number;
}

export interface AuthOkEvent {
  type: "auth_ok";
  principal: string;
}

export interface StartedEvent {
  type: "started";
  command_id: string;
  command: string;
  started_at: string;
}

export interface ChunkEvent {
  type: "chunk";
  command_id: string;
  stream: "stdout" | "stderr";
  data: string;
  seq: number;
}

export interface DoneEvent {
  type: "done";
  command_id: string;
  exit_code: number;
  duration_ms: number;
  status: "success" | "failed" | "timeout" | "aborted";
  // Phase 20.6 — set when the output looks like a privilege/permission failure.
  permission_error?: boolean;
}

export interface ErrorEvent {
  type: "error";
  command_id: string | null;
  code:
    | "blocked"
    | "requires_confirmation"
    | "rate_limited"
    | "invalid_command"
    | "timeout"
    | "already_running"
    | "invalid_message"
    | "internal"
    | "auth_failed";
  message: string;
  retry_after_s?: number;
}

export type TerminalServerEvent =
  | HelloEvent
  | AuthOkEvent
  | StartedEvent
  | ChunkEvent
  | DoneEvent
  | ErrorEvent;

// ---------------------------------------------------------------------------
// Connection state
// ---------------------------------------------------------------------------

export type TerminalConnectionStatus =
  | "idle"
  | "connecting"
  | "authed"
  | "disconnected"
  | "error";

// ---------------------------------------------------------------------------
// Callbacks
// ---------------------------------------------------------------------------

export interface TerminalCallbacks {
  onHello?: (e: HelloEvent) => void;
  onAuthOk?: (e: AuthOkEvent) => void;
  onStarted?: (e: StartedEvent) => void;
  onChunk?: (e: ChunkEvent) => void;
  onDone?: (e: DoneEvent) => void;
  onError?: (e: ErrorEvent) => void;
  onStatusChange?: (status: TerminalConnectionStatus) => void;
}

// ---------------------------------------------------------------------------
// TerminalWsClient — per-tab, per-server, NOT a singleton, NO auto-reconnect
// ---------------------------------------------------------------------------

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8900";

function buildTerminalWsUrl(serverId: string): string {
  if (typeof window === "undefined") return "";
  return `${API_BASE_URL.replace(/^http/, "ws")}/api/ws/servers/${serverId}/terminal`;
}

export class TerminalWsClient {
  private readonly serverId: string;
  private readonly callbacks: TerminalCallbacks;
  private ws: WebSocket | null = null;
  private status: TerminalConnectionStatus = "idle";

  constructor(serverId: string, callbacks: TerminalCallbacks) {
    this.serverId = serverId;
    this.callbacks = callbacks;
  }

  // --- Public API ---

  connect(): void {
    if (typeof window === "undefined") return;
    if (this.ws) return;

    const url = buildTerminalWsUrl(this.serverId);
    this.setStatus("connecting");

    try {
      this.ws = new WebSocket(url);
    } catch {
      this.setStatus("error");
      return;
    }

    this.ws.onopen = this.handleOpen;
    this.ws.onmessage = this.handleMessage;
    this.ws.onclose = this.handleClose;
    this.ws.onerror = () => {
      /* close triggers status update */
    };
  }

  run(command: string, confirmed = false, timeoutS = 60): void {
    this.send({ action: "run", command, confirmed, timeout_s: timeoutS });
  }

  /** Send a line of stdin to the currently running command. */
  sendInput(data: string): void {
    this.send({ action: "input", data });
  }

  abort(): void {
    this.send({ action: "abort" });
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setStatus("disconnected");
  }

  getStatus(): TerminalConnectionStatus {
    return this.status;
  }

  // --- Internal ---

  private handleOpen = (): void => {
    // Server sends hello, then we reply with auth.
    // We wait for the hello event handler to be invoked before sending auth
    // so the server_id is confirmed. In practice we send auth right away because
    // the server accepts unconditionally for now.
  };

  private handleMessage = (e: MessageEvent): void => {
    let msg: TerminalServerEvent;
    try {
      msg = JSON.parse(e.data as string) as TerminalServerEvent;
    } catch {
      return;
    }

    switch (msg.type) {
      case "hello":
        this.callbacks.onHello?.(msg);
        // Reply with auth immediately
        this.send({ type: "auth", token: getAuthToken() });
        break;
      case "auth_ok":
        this.setStatus("authed");
        this.callbacks.onAuthOk?.(msg);
        break;
      case "started":
        this.callbacks.onStarted?.(msg);
        break;
      case "chunk":
        this.callbacks.onChunk?.(msg);
        break;
      case "done":
        this.callbacks.onDone?.(msg);
        break;
      case "error":
        this.callbacks.onError?.(msg);
        break;
    }
  };

  private handleClose = (): void => {
    this.ws = null;
    if (this.status !== "disconnected") {
      this.setStatus("disconnected");
    }
  };

  private send(payload: unknown): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }

  private setStatus(s: TerminalConnectionStatus): void {
    if (this.status === s) return;
    this.status = s;
    this.callbacks.onStatusChange?.(s);
  }
}
