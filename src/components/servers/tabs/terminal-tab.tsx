"use client";

import { useEffect, useRef, useState } from "react";
import {
  Lock,
  Terminal,
  RefreshCw,
  AlertTriangle,
  ShieldAlert,
} from "lucide-react";
import { useExecuteCommand } from "@/lib/hooks/use-servers";
import {
  BlockedError,
  ConfirmationRequiredError,
  RateLimitedError,
} from "@/lib/api/servers";
import { cn } from "@/lib/utils";
import type { ServerResponse } from "@/lib/types";

type TerminalEntry = {
  command: string;
  output: string;
  kind: "ok" | "error" | "blocked" | "rate_limited" | "cancelled" | "timeout";
};

interface TerminalTabProps {
  server: ServerResponse;
}

export function TerminalTab({ server }: TerminalTabProps) {
  const executeCommand = useExecuteCommand();

  const [authed, setAuthed] = useState(false);
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  const [command, setCommand] = useState("");
  const [history, setHistory] = useState<TerminalEntry[]>([]);

  // Confirm dialog for dangerous-but-legitimate commands.
  const [pendingConfirm, setPendingConfirm] = useState<{
    command: string;
    reason: string;
  } | null>(null);
  const [confirmHostname, setConfirmHostname] = useState("");

  // Rate-limit countdown (seconds remaining). 0 = not limited.
  const [cooldown, setCooldown] = useState(0);

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

  useEffect(() => {
    if (authed && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history, executeCommand.isPending, authed]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((n) => Math.max(0, n - 1)), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authPassword) return;
    setAuthLoading(true);
    setAuthError(null);
    try {
      // TODO: wire real auth verification once backend auth lands, e.g.:
      // await api.post("/auth/verify-password", { password: authPassword });
      await new Promise((r) => setTimeout(r, 350));
      setAuthed(true);
      setAuthPassword("");
    } catch (err) {
      setAuthError((err as Error).message || "Authentication failed");
    } finally {
      setAuthLoading(false);
    }
  };

  const disconnect = () => {
    setAuthed(false);
    setHistory([]);
    setCommand("");
    setAuthPassword("");
    setAuthError(null);
    setPendingConfirm(null);
    setConfirmHostname("");
    setCooldown(0);
  };

  const runCommand = async (cmd: string, confirmed: boolean) => {
    try {
      const result = await executeCommand.mutateAsync({
        id: server._id,
        command: cmd,
        confirmed,
      });
      if (result.status === "timeout") {
        setHistory((h) => [
          ...h,
          {
            command: cmd,
            output:
              (result.output ? result.output + "\n" : "") +
              `[timed out after ${result.timeout_s ?? "?"}s]`,
            kind: "timeout",
          },
        ]);
        return;
      }
      setHistory((h) => [
        ...h,
        {
          command: cmd,
          output:
            result.output ||
            (result.status === "success"
              ? "(no output)"
              : result.error || "(no output)"),
          kind: result.status === "success" ? "ok" : "error",
        },
      ]);
    } catch (err) {
      if (err instanceof ConfirmationRequiredError) {
        setPendingConfirm({ command: cmd, reason: err.reason });
        return;
      }
      if (err instanceof BlockedError) {
        setHistory((h) => [
          ...h,
          { command: cmd, output: `Blocked: ${err.reason}`, kind: "blocked" },
        ]);
        return;
      }
      if (err instanceof RateLimitedError) {
        setCooldown(err.retryAfterSeconds);
        setHistory((h) => [
          ...h,
          {
            command: cmd,
            output: `Rate limited — try again in ${err.retryAfterSeconds}s.`,
            kind: "rate_limited",
          },
        ]);
        return;
      }
      setHistory((h) => [
        ...h,
        { command: cmd, output: (err as Error).message, kind: "error" },
      ]);
    }
  };

  const handleExecute = async () => {
    const cmd = command.trim();
    if (!cmd) return;
    setCommand("");
    const lower = cmd.toLowerCase();
    if (lower === "clear" || lower === "cls") {
      setHistory([]);
      return;
    }
    if (cooldown > 0) return;
    await runCommand(cmd, false);
  };

  const confirmAndRun = async () => {
    if (!pendingConfirm) return;
    if (confirmHostname.trim() !== server.hostname) return;
    const cmd = pendingConfirm.command;
    setPendingConfirm(null);
    setConfirmHostname("");
    await runCommand(cmd, true);
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

  if (!authed) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 max-w-md mx-auto shadow-xl">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-4 ring-1 ring-primary/20">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-lg font-bold">Privileged Shell Access</h3>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            Re-authenticate with your admin password to open an interactive{" "}
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
              Admin Password
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
          "rounded-xl border shadow-2xl overflow-hidden flex flex-col h-[calc(100vh-280px)] min-h-120",
          isWindows
            ? "border-sky-900/50 bg-[#012456]"
            : "border-zinc-800 bg-zinc-950",
        )}
      >
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
            <span className="flex items-center gap-1 text-[10px] font-mono text-green-400 ml-2">
              <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
              connected
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setHistory([])}
              className={cn(
                "text-[11px] font-mono px-2 py-1 rounded transition-colors",
                isWindows
                  ? "text-sky-300 hover:text-white hover:bg-sky-900/60"
                  : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800",
              )}
            >
              {isWindows ? "cls" : "clear"}
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
              <div className="text-sky-300/60 text-[11px] mb-4">
                Session opened {new Date().toLocaleString()} on{" "}
                {server.ip_address}. Non-interactive — chain with{" "}
                <span className="text-sky-100">;</span> or pipelines. Try:{" "}
                {commandExamples}. Type{" "}
                <span className="text-sky-100">cls</span> to clear.
              </div>
            </>
          ) : (
            <>
              <div className="text-green-400">
                Connected to {server.ip_address} ({server.hostname}) as admin.
              </div>
              <div className="text-zinc-500 text-[11px] mb-4">
                Session opened {new Date().toLocaleString()} — commands run via
                SecOps relay. Non-interactive — chain with{" "}
                <span className="text-zinc-300">cd X &amp;&amp; ...</span>. Try:{" "}
                {commandExamples}. Type{" "}
                <span className="text-zinc-300">clear</span> to reset the screen.
              </div>
            </>
          )}
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
          {executeCommand.isPending && (
            <div
              className={cn(
                "flex items-center gap-2 mb-2",
                isWindows ? "text-sky-300/70" : "text-zinc-500",
              )}
            >
              <RefreshCw className="h-3 w-3 animate-spin" />
              <span className="text-[12px]">executing...</span>
            </div>
          )}
          {cooldown > 0 && (
            <div className="flex items-center gap-2 mb-2 text-amber-300 text-[12px]">
              <AlertTriangle className="h-3 w-3" />
              rate limited — {cooldown}s
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleExecute();
            }}
            className="flex items-start gap-2"
          >
            <span className={cn("shrink-0", promptColor)}>{promptPrefix}</span>
            <input
              ref={inputRef}
              autoFocus
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              disabled={executeCommand.isPending || cooldown > 0}
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
      </div>

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
