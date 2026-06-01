/**
 * Shared UI constants.
 *
 * Values here were previously copy-pasted across multiple pages/components.
 * Centralizing them keeps colour/label maps consistent and gives one place to
 * tune them. Pure data only — anything needing JSX (e.g. icon maps) lives in a
 * `.tsx` module alongside its component.
 *
 * Colour/label maps that already lived in `utils.ts`
 * (`severityColor`, `statusColor`, `serverStatusColor`, `actionLevelLabel`)
 * stay there; this file holds the ones that were duplicated.
 */
import type { AiAnalysisType, NotificationCategory, NotificationSeverity } from "./types";

// ── Risk-level pill classes ──
// Was duplicated as RISK_STYLES / RISK_PILL in incident & anomaly detail pages,
// the AI Actions page, the command-detail modal and the manual-command card.
export const RISK_STYLES: Record<string, string> = {
  low: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  high: "bg-red-500/10 text-red-400 border-red-500/20",
};

// ── AI analysis type → label / badge classes ──
// Was duplicated verbatim in /ai-analyses and /ai-analyses/[id].
export const ANALYSIS_TYPE_LABEL: Record<AiAnalysisType, string> = {
  incident_triage: "Incident Triage",
  anomaly_triage: "Anomaly Triage",
  server_overview: "Server Overview",
  script_execution_review: "Script Review",
  command_impact: "Command Impact",
  app_overview: "Platform Overview",
};

export const ANALYSIS_TYPE_COLOR: Record<AiAnalysisType, string> = {
  incident_triage: "bg-red-500/10 text-red-400 border-red-500/20",
  anomaly_triage: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  server_overview: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  script_execution_review: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  command_impact: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  app_overview: "bg-blue-500/10 text-blue-400 border-blue-500/20",
};

// ── In-app notifications (Phase 29) ──
// Single global WS topic for v1 (per-recipient split lands with auth).
export const WS_NOTIFICATIONS_TOPIC = "notifications";

// Category → human label (used by the /notifications page filter).
export const NOTIFICATION_CATEGORY_LABEL: Record<NotificationCategory, string> = {
  ai: "AI",
  incident: "Incidents",
  automation: "Automation",
  anomaly: "Anomalies",
  server: "Servers",
};

// Severity → icon/dot color classes (the bell row accent + unread dot).
export const NOTIFICATION_SEVERITY_COLOR: Record<NotificationSeverity, string> = {
  info: "text-blue-400",
  success: "text-emerald-400",
  warning: "text-amber-400",
  error: "text-red-400",
};
