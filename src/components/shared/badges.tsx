"use client";

import { cn } from "@/lib/utils";
import type { SeverityLevel, IncidentStatus, ServerStatus } from "@/lib/types";

// Severity colors
export const severityConfig: Record<
  SeverityLevel,
  { label: string; color: string; bg: string; border: string }
> = {
  critical: {
    label: "CRITICAL",
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
  },
  high: {
    label: "HIGH",
    color: "text-orange-400",
    bg: "bg-orange-500/10",
    border: "border-orange-500/30",
  },
  medium: {
    label: "MEDIUM",
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/30",
  },
  low: {
    label: "LOW",
    color: "text-slate-400",
    bg: "bg-slate-500/10",
    border: "border-slate-500/30",
  },
};

export function SeverityBadge({ severity }: { severity: SeverityLevel }) {
  const config = severityConfig[severity];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold border",
        config.color,
        config.bg,
        config.border
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          severity === "critical" && "bg-red-400",
          severity === "high" && "bg-orange-400",
          severity === "medium" && "bg-yellow-400",
          severity === "low" && "bg-slate-400"
        )}
      />
      {config.label}
    </span>
  );
}

// Status colors
const statusConfig: Record<
  IncidentStatus,
  { label: string; color: string; bg: string; icon: string }
> = {
  open: { label: "OPEN", color: "text-red-400", bg: "bg-red-500/10", icon: "🔴" },
  verifying: {
    label: "VERIFYING",
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
    icon: "🔄",
  },
  investigating: {
    label: "INVESTIGATING",
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
    icon: "🔍",
  },
  resolved: {
    label: "RESOLVED",
    color: "text-green-400",
    bg: "bg-green-500/10",
    icon: "✅",
  },
  false_positive: {
    label: "FALSE POSITIVE",
    color: "text-slate-400",
    bg: "bg-slate-500/10",
    icon: "⚪",
  },
};

export function StatusBadge({ status }: { status: IncidentStatus }) {
  const config = statusConfig[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold",
        config.color,
        config.bg
      )}
    >
      <span className="text-[10px]">{config.icon}</span>
      {config.label}
    </span>
  );
}

// Server status
export function ServerStatusBadge({ status }: { status: ServerStatus | string }) {
  const cfg = {
    online:    { dot: "bg-green-400 animate-pulse",  text: "text-green-400",  bg: "bg-green-500/10",  label: "ONLINE"     },
    reachable: { dot: "bg-yellow-400 animate-pulse", text: "text-yellow-400", bg: "bg-yellow-500/10", label: "REACHABLE"  },
    offline:   { dot: "bg-red-500",                  text: "text-red-400",    bg: "bg-red-500/10",    label: "OFFLINE"    },
    unknown:   { dot: "bg-zinc-500",                 text: "text-zinc-400",   bg: "bg-zinc-500/10",   label: "UNKNOWN"    },
  }[status] ?? { dot: "bg-zinc-500", text: "text-zinc-400", bg: "bg-zinc-500/10", label: String(status).toUpperCase() };

  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold", cfg.text, cfg.bg)}>
      <span className={cn("h-2 w-2 rounded-full", cfg.dot)} />
      {cfg.label}
    </span>
  );
}

// Health status badge (HEALTHY, HIGH ALERT, MAINTENANCE, QUARANTINE)
export function HealthBadge({
  label,
  variant,
}: {
  label: string;
  variant: "healthy" | "alert" | "maintenance" | "quarantine";
}) {
  const variants = {
    healthy: "text-green-400 bg-green-500/10 border-green-500/30",
    alert: "text-orange-400 bg-orange-500/10 border-orange-500/30",
    maintenance: "text-slate-400 bg-slate-500/10 border-slate-500/30",
    quarantine: "text-red-400 bg-red-500/10 border-red-500/30",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-bold border",
        variants[variant]
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          variant === "healthy" && "bg-green-400",
          variant === "alert" && "bg-orange-400",
          variant === "maintenance" && "bg-slate-400",
          variant === "quarantine" && "bg-red-400"
        )}
      />
      {label}
    </span>
  );
}

// Format relative time
export function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
