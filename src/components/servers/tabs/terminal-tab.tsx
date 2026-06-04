"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Lock,
  Terminal,
  RefreshCw,
  AlertTriangle,
  ShieldAlert,
  Square,
  Clock,
  Trash2,
  WifiOff,
} from "lucide-react";
import {
  TerminalWsClient,
  type TerminalConnectionStatus,
  type ChunkEvent,
  type DoneEvent,
  type ErrorEvent,
} from "@/lib/terminal-ws";
import { cn } from "@/lib/utils";
import { apiClient, ApiError } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { diagnoseAuthFailure } from "@/lib/server-auth-diagnostics";
import type { ServerResponse } from "@/lib/types";

type EntryKind =
  | "ok"
  | "error"
  | "blocked"
  | "rate_limited"
  | "cancelled"
  | "timeout"
  | "aborted";

type TerminalEntry = {
  command: string;
  output: string;
  kind: EntryKind;
};

interface TerminalTabProps {
  server: ServerResponse;
}

export function TerminalTab({ server }: TerminalTabProps) {
  // Role gate: command execution is operator/admin only. Viewers are read-only;
  // the backend WS also rejects them (close 4403), this is the matching UI guard.
  const { isOperator } = useAuth();

  // --- Auth gate: step-up re-auth against the signed-in account's password ---
  const [authed, setAuthed] = useState(false);
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // --- Terminal state ---
  const [command, setCommand] = useState("");
  const [history, setHistory] = useState<TerminalEntry[]>([]);

  // --- Streaming state ---
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingCommand, setStreamingCommand] = useState<string | null>(null);
  // Raw chunk buffer — flushed to React state via RAF for smooth rendering
  const chunkBufferRef = useRef<string>("");
  const [streamingOutput, setStreamingOutput] = useState("");
  const rafRef = useRef<number | null>(null);

  // --- WS connection status ---
  const [connStatus, setConnStatus] =
    useState<TerminalConnectionStatus>("idle");
  const wsRef = useRef<TerminalWsClient | null>(null);

  // --- Confirm dialog ---
  const [pendingConfirm, setPendingConfirm] = useState<{
    command: string;
    reason: string;
  } | null>(null);
  const [confirmHostname, setConfirmHostname] = useState("");

  // --- Rate-limit countdown ---
  const [cooldown, setCooldown] = useState(0);

  // --- Command history ---
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const historyIndexRef = useRef(-1);
  const savedCommandRef = useRef("");

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isWindows = server.os_type === "windows";
  const shellLabel = isWindows ? "PowerShell" : "Bash";
  const promptPrefix = isWindows
    ? `PS C:\\Users\\admin>`
    : `admin@${server.hostname}:~$`;
  const titleBarText = isWindows
    ? `Administrator: Windows PowerShell — ${server.hostname}`
    : `admin@${server.hostname}: ~`;
  const commandExamples = isWindows
    ? "Get-Service, Get-Process, Get-EventLog"
    : "df -h, uptime, ps aux";
  const promptColor = isWindows ? "text-sky-300" : "text-green-400";

  // --- Scroll to bottom on output changes ---
  useEffect(() => {
    if (authed && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history, streamingOutput, isStreaming, authed]);

  // --- Cooldown timer ---
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((n) => Math.max(0, n - 1)), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // --- RAF chunk flush ---
  const flushChunks = useCallback(() => {
    rafRef.current = null;
    const data = chunkBufferRef.current;
    if (data) {
      setStreamingOutput((prev) => prev + data);
      chunkBufferRef.current = "";
    }
  }, []);

  const queueChunk = useCallback(
    (data: string) => {
      chunkBufferRef.current += data;
      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(flushChunks);
      }
    },
    [flushChunks]
  );

  // --- Connect WS when authed, disconnect on unmount/logout ---
  useEffect(() => {
    if (!authed) return;

    const client = new TerminalWsClient(server._id, {
      onStatusChange: setConnStatus,
      onStarted: (e) => {
        setIsStreaming(true);
        setStreamingCommand(e.command);
        chunkBufferRef.current = "";
        setStreamingOutput("");
      },
      onChunk: (e: ChunkEvent) => {
        queueChunk(e.data);
      },
      onDone: (e: DoneEvent) => {
        // Cancel any pending RAF and flush remaining buffer
        if (rafRef.current !== null) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
        const finalOutput = chunkBufferRef.current;
        chunkBufferRef.current = "";

        const fullOutput = streamingOutputRef.current + finalOutput;

        // Phase 20.6 — surface a privilege hint when the failure looks like a
        // permission problem, so the operator re-credentials/elevates instead of
        // treating it as a generic error.
        const permHint = e.permission_error
          ? "\n\n⚠ Privilege error — the stored credential lacks permission for this command. Re-credential this server with privileged access, or run via an elevated account."
          : "";

        setHistory((h) => [
          ...h,
          {
            command: streamingCommandRef.current ?? "",
            output:
              (fullOutput || (e.status === "success" ? "(no output)" : `[${e.status}]`)) +
              permHint,
            kind:
              e.status === "success"
                ? "ok"
                : e.status === "timeout"
                ? "timeout"
                : e.status === "aborted"
                ? "aborted"
                : "error",
          },
        ]);
        setIsStreaming(false);
        setStreamingCommand(null);
        setStreamingOutput("");
      },
      onError: (e: ErrorEvent) => {
        if (rafRef.current !== null) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
        chunkBufferRef.current = "";
        setIsStreaming(false);
        setStreamingCommand(null);
        setStreamingOutput("");

        if (e.code === "requires_confirmation") {
          // pendingConfirm was set before run; this confirms the server agrees
          // (server sends error so client can show the dialog again if needed)
          if (!pendingConfirmRef.current) {
            setPendingConfirm({
              command: lastCommandRef.current,
              reason: e.message,
            });
          }
          return;
        }
        if (e.code === "blocked") {
          setHistory((h) => [
            ...h,
            {
              command: lastCommandRef.current,
              output: `Blocked: ${e.message}`,
              kind: "blocked",
            },
          ]);
          return;
        }
        if (e.code === "rate_limited") {
          setCooldown(e.retry_after_s ?? 30);
          setHistory((h) => [
            ...h,
            {
              command: lastCommandRef.current,
              output: `Rate limited — try again in ${e.retry_after_s ?? "?"}s.`,
              kind: "rate_limited",
            },
          ]);
          return;
        }
        setHistory((h) => [
          ...h,
          {
            command: lastCommandRef.current,
            output: e.message || `Error: ${e.code}`,
            kind: "error",
          },
        ]);
      },
    });

    wsRef.current = client;
    client.connect();

    return () => {
      client.disconnect();
      wsRef.current = null;
      setConnStatus("idle");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed, server._id]);

  // Refs to capture current values inside WS callbacks (avoid stale closures)
  const streamingOutputRef = useRef("");
  const streamingCommandRef = useRef<string | null>(null);
  const pendingConfirmRef = useRef(pendingConfirm);
  const lastCommandRef = useRef("");

  useEffect(() => {
    streamingOutputRef.current = streamingOutput;
  }, [streamingOutput]);

  useEffect(() => {
    streamingCommandRef.current = streamingCommand;
  }, [streamingCommand]);

  useEffect(() => {
    pendingConfirmRef.current = pendingConfirm;
  }, [pendingConfirm]);

  // --- Auth gate: step-up re-auth against the current user's password ---
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authPassword) return;
    setAuthLoading(true);
    setAuthError(null);
    try {
      await apiClient.post("/api/auth/verify-password", { password: authPassword });
      setAuthed(true);
      setAuthPassword("");
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.detail : (err as Error).message;
      setAuthError(msg || "Authentication failed");
    } finally {
      setAuthLoading(false);
    }
  };

  const disconnect = () => {
    wsRef.current?.disconnect();
    wsRef.current = null;
    setAuthed(false);
    setHistory([]);
    setCommand("");
    setAuthPassword("");
    setAuthError(null);
    setPendingConfirm(null);
    setConfirmHostname("");
    setCooldown(0);
    setIsStreaming(false);
    setStreamingCommand(null);
    setStreamingOutput("");
  };

  // --- Run command via WS ---
  const runCommand = (cmd: string, confirmed: boolean) => {
    if (!wsRef.current || connStatus !== "authed") return;
    lastCommandRef.current = cmd;
    wsRef.current.run(cmd, confirmed);
  };

  const handleExecute = () => {
    const cmd = command.trim();
    setCommand("");
    historyIndexRef.current = -1;
    savedCommandRef.current = "";

    // While a command is streaming, redirect input to its stdin
    if (isStreaming) {
      wsRef.current?.sendInput(cmd + "\n");
      return;
    }

    if (!cmd) return;
    const lower = cmd.toLowerCase();
    if (lower === "clear" || lower === "cls") {
      setHistory([]);
      return;
    }
    if (cooldown > 0) return;

    // Save to history (skip duplicate of most recent)
    setCommandHistory((prev) => {
      if (prev[0] === cmd) return prev;
      return [cmd, ...prev].slice(0, 200);
    });

    runCommand(cmd, false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isStreaming) return;
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (commandHistory.length === 0) return;
      if (historyIndexRef.current === -1) savedCommandRef.current = command;
      const next = Math.min(historyIndexRef.current + 1, commandHistory.length - 1);
      historyIndexRef.current = next;
      setCommand(commandHistory[next]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndexRef.current === -1) return;
      const next = historyIndexRef.current - 1;
      historyIndexRef.current = next;
      setCommand(next === -1 ? savedCommandRef.current : commandHistory[next]);
    }
  };

  const confirmAndRun = () => {
    if (!pendingConfirm) return;
    if (confirmHostname.trim() !== server.hostname) return;
    const cmd = pendingConfirm.command;
    setPendingConfirm(null);
    setConfirmHostname("");
    runCommand(cmd, true);
  };

  const cancelConfirm = () => {
    if (!pendingConfirm) return;
    setHistory((h) => [
      ...h,
      {
        command: pendingConfirm.command,
        output: "Command not executed (cancelled).",
        kind: "cancelled",
      },
    ]);
    setPendingConfirm(null);
    setConfirmHostname("");
  };

  const handleAbort = () => {
    wsRef.current?.abort();
  };

  // --- Connection status dot ---
  const statusDot = {
    idle: "bg-zinc-500",
    connecting: "bg-amber-400 animate-pulse",
    authed: "bg-green-400 animate-pulse",
    disconnected: "bg-red-500",
    error: "bg-red-500",
  }[connStatus];

  const statusLabel = {
    idle: "idle",
    connecting: "connecting",
    authed: "connected",
    disconnected: "disconnected",
    error: "error",
  }[connStatus];

  // --- Role gate (viewers cannot run commands) ---
  if (!isOperator) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 max-w-lg mx-auto shadow-xl">
        <div className="flex flex-col items-center text-center">
          <div className="h-14 w-14 rounded-full flex items-center justify-center mb-4 ring-1 bg-red-500/10 ring-red-500/20">
            <ShieldAlert className="h-6 w-6 text-red-400" />
          </div>
          <h3 className="text-lg font-bold">Terminal access restricted</h3>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            Running commands requires an{" "}
            <span className="font-semibold text-foreground">operator</span> or{" "}
            <span className="font-semibold text-foreground">admin</span> role.
            Your account has read-only access to{" "}
            <span className="font-mono font-semibold text-foreground">
              {server.hostname}
            </span>
            . Contact an administrator if you need shell access.
          </p>
        </div>
      </div>
    );
  }

  // --- Offline / auth-broken gate ---
  if (server.status !== "online") {
    const isReachable = server.status === "reachable";
    const diag = isReachable ? diagnoseAuthFailure(server.auth_failure_reason, server.os_type) : null;
    return (
      <div className="rounded-2xl border border-border bg-card p-8 max-w-lg mx-auto shadow-xl">
        <div className="flex flex-col items-center text-center">
          <div className={`h-14 w-14 rounded-full flex items-center justify-center mb-4 ring-1 ${isReachable ? "bg-yellow-500/10 ring-yellow-500/20" : "bg-red-500/10 ring-red-500/20"}`}>
            <WifiOff className={`h-6 w-6 ${isReachable ? "text-yellow-400" : "text-red-400"}`} />
          </div>
          {isReachable && diag ? (
            <>
              <h3 className="text-lg font-bold">{diag.title}</h3>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                <span className="font-mono font-semibold text-foreground">{server.hostname}</span>{" "}
                is reachable on the network but the credential check failed.
              </p>
              <p className="text-sm text-muted-foreground mt-3 leading-relaxed text-left">
                {diag.explanation}
              </p>
              {diag.rawError && (
                <div className="mt-3 w-full text-left">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Error returned by {server.os_type === "windows" ? "WinRM" : "SSH"}
                  </p>
                  <pre className="text-[11px] font-mono text-yellow-300 bg-yellow-500/5 border border-yellow-500/20 rounded px-2 py-1.5 whitespace-pre-wrap break-words">
                    {diag.rawError}
                  </pre>
                </div>
              )}
            </>
          ) : (
            <>
              <h3 className="text-lg font-bold">Server Unreachable</h3>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                <span className="font-mono font-semibold text-foreground">{server.hostname}</span>{" "}
                is currently{" "}
                <span className={server.status === "unknown" ? "text-amber-400" : "text-red-400"}>
                  {server.status}
                </span>
                . The terminal is unavailable until the server comes back online.
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  // --- Auth screen ---
  if (!authed) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 max-w-md mx-auto shadow-xl">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-4 ring-1 ring-primary/20">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-lg font-bold">Privileged Shell Access</h3>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            Re-authenticate with your account password to open an interactive{" "}
            <span className="font-mono font-semibold text-foreground">
              {shellLabel}
            </span>{" "}
            session on{" "}
            <span className="font-mono font-semibold text-foreground">
              {server.hostname}
            </span>
            .
          </p>
        </div>
        <form onSubmit={handleAuth} className="space-y-3">
          <div>
            <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-2 block">
              Account Password
            </label>
            <input
              type="password"
              autoFocus
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full h-10 rounded-lg border border-border bg-muted/50 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
            />
          </div>
          {authError && (
            <p className="text-xs text-red-400 flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" />
              {authError}
            </p>
          )}
          <button
            type="submit"
            disabled={authLoading || !authPassword}
            className="w-full h-10 rounded-lg bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {authLoading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <Terminal className="h-4 w-4" />
                Open Terminal
              </>
            )}
          </button>
          <p className="text-[10px] text-muted-foreground text-center pt-2">
            All executed commands are logged and attributed to your session.
          </p>
        </form>
      </div>
    );
  }

  return (
    <>
      <div
        className={cn(
          "relative rounded-xl border shadow-2xl overflow-hidden flex flex-col h-[calc(100vh-280px)] min-h-120",
          isWindows
            ? "border-sky-900/50 bg-[#012456]"
            : "border-zinc-800 bg-zinc-950",
        )}
      >
        {/* Title bar */}
        <div
          className={cn(
            "flex items-center justify-between px-4 py-2 border-b shrink-0",
            isWindows
              ? "bg-[#012456] border-sky-900/50"
              : "bg-zinc-900 border-zinc-800",
          )}
        >
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <span className="h-3 w-3 rounded-full bg-red-500" />
              <span className="h-3 w-3 rounded-full bg-yellow-500" />
              <span className="h-3 w-3 rounded-full bg-green-500" />
            </div>
            <span
              className={cn(
                "text-xs font-mono",
                isWindows ? "text-sky-200" : "text-zinc-400",
              )}
            >
              {titleBarText}
            </span>
            {/* WS connection status dot */}
            <span className="flex items-center gap-1 text-[10px] font-mono ml-2">
              <span
                className={cn("h-1.5 w-1.5 rounded-full", statusDot)}
              />
              <span
                className={cn(
                  connStatus === "authed"
                    ? "text-green-400"
                    : connStatus === "connecting"
                    ? "text-amber-400"
                    : "text-red-400",
                )}
              >
                {statusLabel}
              </span>
            </span>
          </div>
          <div className="flex items-center gap-1">
            {isStreaming && (
              <button
                onClick={handleAbort}
                className={cn(
                  "flex items-center gap-1 text-[11px] font-mono px-2 py-1 rounded transition-colors",
                  isWindows
                    ? "text-red-300 hover:text-red-200 hover:bg-sky-900/60"
                    : "text-red-400 hover:text-red-300 hover:bg-zinc-800",
                )}
              >
                <Square className="h-2.5 w-2.5 fill-current" />
                cancel
              </button>
            )}
            <button
              onClick={() => setHistory([])}
              disabled={isStreaming}
              className={cn(
                "text-[11px] font-mono px-2 py-1 rounded transition-colors disabled:opacity-40",
                isWindows
                  ? "text-sky-300 hover:text-white hover:bg-sky-900/60"
                  : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800",
              )}
            >
              {isWindows ? "cls" : "clear"}
            </button>
            <button
              onClick={() => setShowHistory((v) => !v)}
              title="Command history (↑↓ arrows)"
              className={cn(
                "flex items-center gap-1 text-[11px] font-mono px-2 py-1 rounded transition-colors",
                showHistory
                  ? isWindows
                    ? "text-sky-100 bg-sky-900/60"
                    : "text-zinc-100 bg-zinc-800"
                  : isWindows
                    ? "text-sky-300 hover:text-white hover:bg-sky-900/60"
                    : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800",
              )}
            >
              <Clock className="h-3 w-3" />
              {commandHistory.length > 0 && (
                <span className="text-[9px] tabular-nums">{commandHistory.length}</span>
              )}
            </button>
            <button
              onClick={disconnect}
              className={cn(
                "text-[11px] font-mono px-2 py-1 rounded transition-colors",
                isWindows
                  ? "text-sky-300 hover:text-red-300 hover:bg-sky-900/60"
                  : "text-zinc-400 hover:text-red-400 hover:bg-zinc-800",
              )}
            >
              disconnect
            </button>
          </div>
        </div>

        {/* Output area */}
        <div
          ref={scrollRef}
          onClick={() => inputRef.current?.focus()}
          className={cn(
            "flex-1 overflow-y-auto p-4 font-mono text-[13px] leading-relaxed cursor-text",
            isWindows
              ? "bg-[#012456] text-sky-100"
              : "bg-zinc-950 text-zinc-100",
          )}
        >
          {isWindows ? (
            <>
              <div className="text-sky-100">Windows PowerShell</div>
              <div className="text-sky-300/80 mb-1">
                Copyright (C) Microsoft Corporation. All rights reserved.
              </div>
              <div className="text-sky-300/60 text-[11px] mb-1">
                Session opened {new Date().toLocaleString()} on{" "}
                {server.ip_address}. Try: {commandExamples}. Type{" "}
                <span className="text-sky-100">cls</span> to clear.
              </div>
            </>
          ) : (
            <>
              <div className="text-green-400">
                Connected to {server.ip_address} ({server.hostname}) as admin.
              </div>
              <div className="text-zinc-500 text-[11px] mb-1">
                Session opened {new Date().toLocaleString()} — commands run via
                SecOps relay. Try: {commandExamples}. Type{" "}
                <span className="text-zinc-300">clear</span> to reset the screen.
              </div>
            </>
          )}

          {/* Limitations notice */}
          <div
            className={cn(
              "text-[10px] rounded px-2 py-1.5 mb-3 border leading-relaxed",
              isWindows
                ? "bg-sky-900/30 border-sky-800/50 text-sky-300/70"
                : "bg-zinc-800/60 border-zinc-700/50 text-zinc-500",
            )}
          >
            <span className="font-semibold">
              {isWindows ? "⚠ Non-interactive relay" : "⚠ Non-interactive relay"}
            </span>{" "}
            — This is not a full {isWindows ? "PowerShell" : "Bash"} session.
            Commands run via {isWindows ? "WinRM" : "SSH"} with a 60 s timeout.{" "}
            {isWindows
              ? "Interactive prompts (Read-Host, confirmations), coloured output and commands that require a real console (e.g. winget, diskpart) will not work. Chain commands with semicolons or pipelines."
              : "Interactive prompts (sudo, passwd, apt confirm), terminal apps (top, vim, htop) and Ctrl+C signals will not work. Chain commands with && or pipes. Stdin passthrough is available while a command streams."}
          </div>

          {/* Completed history entries */}
          {history.map((entry, i) => (
            <div key={i} className="mb-3">
              <div className="flex items-start gap-2">
                <span className={cn("shrink-0", promptColor)}>
                  {promptPrefix}
                </span>
                <span
                  className={cn(
                    "break-all",
                    entry.kind === "cancelled"
                      ? "text-zinc-500 italic"
                      : isWindows
                        ? "text-sky-100"
                        : "text-zinc-100",
                  )}
                >
                  {entry.command}
                </span>
              </div>
              {entry.output && (
                <pre
                  className={cn(
                    "mt-1 whitespace-pre-wrap break-all",
                    entry.kind === "error" && "text-red-400",
                    entry.kind === "blocked" && "text-red-400",
                    entry.kind === "timeout" && "text-red-400",
                    entry.kind === "aborted" && "text-amber-300",
                    entry.kind === "rate_limited" && "text-amber-300",
                    entry.kind === "cancelled" && "text-zinc-500 italic",
                    entry.kind === "ok" &&
                      (isWindows ? "text-sky-50" : "text-zinc-300"),
                  )}
                >
                  {entry.output}
                </pre>
              )}
            </div>
          ))}

          {/* Live streaming entry */}
          {isStreaming && streamingCommand !== null && (
            <div className="mb-3">
              <div className="flex items-start gap-2">
                <span className={cn("shrink-0", promptColor)}>
                  {promptPrefix}
                </span>
                <span className={isWindows ? "text-sky-100" : "text-zinc-100"}>
                  {streamingCommand}
                </span>
              </div>
              {streamingOutput && (
                <pre
                  className={cn(
                    "mt-1 whitespace-pre-wrap break-all",
                    isWindows ? "text-sky-50" : "text-zinc-300",
                  )}
                >
                  {streamingOutput}
                </pre>
              )}
              <div
                className={cn(
                  "flex items-center gap-2 mt-1",
                  isWindows ? "text-sky-300/70" : "text-zinc-500",
                )}
              >
                <RefreshCw className="h-3 w-3 animate-spin" />
                <span className="text-[12px]">streaming...</span>
              </div>
            </div>
          )}

          {/* Rate limit banner */}
          {cooldown > 0 && (
            <div className="flex items-center gap-2 mb-2 text-amber-300 text-[12px]">
              <AlertTriangle className="h-3 w-3" />
              rate limited — {cooldown}s
            </div>
          )}

          {/* Input prompt — active even while streaming (stdin passthrough) */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleExecute();
            }}
            className="flex items-start gap-2"
          >
            <span
              className={cn(
                "shrink-0 font-mono text-[13px]",
                isStreaming
                  ? "text-amber-400/80"
                  : promptColor,
              )}
            >
              {isStreaming ? "stdin>" : promptPrefix}
            </span>
            <input
              ref={inputRef}
              autoFocus
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={cooldown > 0}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              className={cn(
                "flex-1 bg-transparent outline-none disabled:opacity-50 font-mono",
                isWindows
                  ? "text-sky-100 caret-sky-300"
                  : "text-zinc-100 caret-green-400",
              )}
            />
          </form>
        </div>

        {/* Command history panel */}
        {showHistory && (
          <div
            className={cn(
              "absolute top-9 right-0 z-20 w-72 flex flex-col rounded-bl-xl border-l border-b shadow-2xl",
              isWindows
                ? "bg-[#001433]/97 border-sky-900/60"
                : "bg-zinc-900/97 border-zinc-700/60",
            )}
            style={{ maxHeight: "60%" }}
          >
            <div
              className={cn(
                "flex items-center justify-between px-3 py-2 border-b text-[10px] font-mono font-bold uppercase tracking-wider shrink-0",
                isWindows ? "border-sky-900/50 text-sky-400" : "border-zinc-800 text-zinc-400",
              )}
            >
              <span>History ({commandHistory.length})</span>
              <button
                onClick={() => {
                  setCommandHistory([]);
                  historyIndexRef.current = -1;
                  savedCommandRef.current = "";
                }}
                className="flex items-center gap-1 text-red-400 hover:text-red-300 transition-colors"
                title="Clear history"
              >
                <Trash2 className="h-3 w-3" />
                clear
              </button>
            </div>
            {commandHistory.length === 0 ? (
              <div className={cn("px-3 py-4 text-[11px] font-mono text-center", isWindows ? "text-sky-600" : "text-zinc-600")}>
                No commands yet
              </div>
            ) : (
              <div className="overflow-y-auto flex-1 py-1">
                {commandHistory.map((cmd, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setCommand(cmd);
                      historyIndexRef.current = i;
                      setShowHistory(false);
                      inputRef.current?.focus();
                    }}
                    className={cn(
                      "w-full text-left px-3 py-1.5 text-[12px] font-mono truncate transition-colors",
                      isWindows
                        ? "text-sky-200 hover:bg-sky-900/40"
                        : "text-zinc-300 hover:bg-zinc-800",
                    )}
                    title={cmd}
                  >
                    {cmd}
                  </button>
                ))}
              </div>
            )}
            <div
              className={cn(
                "px-3 py-1.5 border-t text-[9px] font-mono shrink-0",
                isWindows ? "border-sky-900/50 text-sky-700" : "border-zinc-800 text-zinc-600",
              )}
            >
              ↑↓ arrows to navigate · Enter to run
            </div>
          </div>
        )}
      </div>

      {/* Confirm dangerous command dialog */}
      {pendingConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
            <div className="flex items-center gap-2 mb-2">
              <ShieldAlert className="h-5 w-5 text-amber-400" />
              <h2 className="text-lg font-bold">Confirm dangerous command</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              {pendingConfirm.reason}
            </p>
            <pre className="text-xs font-mono bg-muted/50 border border-border rounded-md p-2 mb-4 whitespace-pre-wrap break-all">
              {pendingConfirm.command}
            </pre>
            <p className="text-xs text-muted-foreground mb-2">
              Type the hostname{" "}
              <span className="font-mono font-semibold text-foreground">
                {server.hostname}
              </span>{" "}
              to confirm.
            </p>
            <input
              type="text"
              autoFocus
              value={confirmHostname}
              onChange={(e) => setConfirmHostname(e.target.value)}
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  confirmHostname.trim() === server.hostname
                ) {
                  confirmAndRun();
                }
              }}
              placeholder={server.hostname}
              className="w-full h-9 rounded-lg border border-border bg-muted/50 px-3 text-sm text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/50 mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={cancelConfirm}
                className="flex-1 h-9 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmAndRun}
                disabled={confirmHostname.trim() !== server.hostname}
                className="flex-1 h-9 rounded-lg bg-amber-500 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50 transition-colors"
              >
                Run anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
