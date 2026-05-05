import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceToNow, format } from "date-fns";
import type { SeverityLevel, IncidentStatus, ServerStatus, LogLevel, ActionLevel } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ── Date helpers ──

/**
 * Convert a date picker value ("YYYY-MM-DD") to a UTC ISO string,
 * treating the date as midnight (or end-of-day) in the *user's local timezone*.
 *
 * JS parses "YYYY-MM-DDTHH:MM:SS.mmm" (no Z, no offset) as local time,
 * then toISOString() converts to UTC — so a UTC+1 user picking "2026-05-04"
 * gets "2026-05-03T23:00:00.000Z" (correct) instead of "2026-05-04T00:00:00.000Z" (wrong).
 */
export function localDateToUtcIso(dateStr: string, endOfDay = false): string {
  const time = endOfDay ? "23:59:59.999" : "00:00:00.000";
  return new Date(`${dateStr}T${time}`).toISOString();
}

export function timeAgo(date: string | null | undefined): string {
  if (!date) return "Never";
  try {
    let utcDateString = date.replace(" ", "T");
    
    if (!utcDateString.endsWith("Z") && !utcDateString.includes("+")) {
      utcDateString += "Z";
    }

    return formatDistanceToNow(new Date(utcDateString), { addSuffix: true });
  } catch {
    return "Unknown";
  }
}

export function formatDate(date: string): string {
  try {
    let normalized = date.replace(" ", "T");
    if (!normalized.endsWith("Z") && !normalized.includes("+")) {
      normalized += "Z";
    }
    return format(new Date(normalized), "MMM d, yyyy HH:mm:ss");
  } catch {
    return date;
  }
}

// ── Color maps ──

export const severityColor: Record<SeverityLevel, string> = {
  critical: "bg-red-500/15 text-red-400 border-red-500/30",
  high: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  medium: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  low: "bg-blue-500/15 text-blue-400 border-blue-500/30",
};

export const statusColor: Record<IncidentStatus, string> = {
  open: "bg-red-500/15 text-red-400 border-red-500/30",
  verifying: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  investigating: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  resolved: "bg-green-500/15 text-green-400 border-green-500/30",
  false_positive: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
};

export const serverStatusColor: Record<ServerStatus, string> = {
  online: "bg-green-500",
  reachable: "bg-yellow-500",
  offline: "bg-red-500",
  unknown: "bg-zinc-500",
};

export const logLevelColor: Record<LogLevel, string> = {
  critical: "text-red-400",
  error: "text-red-400",
  warning: "text-yellow-400",
  info: "text-zinc-400",
  unknown: "text-zinc-500",
};

export const actionLevelLabel: Record<ActionLevel, string> = {
  1: "Auto Remediate",
  2: "Remediate + Alert",
  3: "Alert Only",
};
