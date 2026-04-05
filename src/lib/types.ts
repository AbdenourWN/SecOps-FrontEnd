// ============================================================
// SecOps Backend-Aligned Types
// All field names match the actual FastAPI/Pydantic schemas
// ============================================================

// ── Shared ──────────────────────────────────────────────────
export type SeverityLevel = "critical" | "high" | "medium" | "low";
export type IncidentStatus = "open" | "investigating" | "resolved" | "false_positive";
// ActionLevel is numeric: 1 = Auto-Remediate, 2 = Remediate+Alert, 3 = Alert Only
export type ActionLevel = 1 | 2 | 3;
export type ScriptLanguage = "bash" | "python" | "powershell";
export type RuleOSType = "linux" | "windows" | "common";
export type LogLevel = "info" | "warning" | "error" | "critical" | "debug";

// ── Servers ─────────────────────────────────────────────────
export interface CredentialCreate {
  username: string;
  type: "ssh_password" | "ssh_key" | "winrm";
  secret: string;
}

export type ServerStatus = "online" | "offline" | "unknown";

export interface ServerCreate {
  hostname: string;
  ip_address: string;
  os_type: "linux" | "windows";
  credential: CredentialCreate;
}

export type ServerUpdate = Partial<ServerCreate>;

export interface ServerDelete {
  current_secret: string;
}

export interface ServerResponse {
  _id: string;
  hostname: string;
  ip_address: string;
  os_type: "linux" | "windows";
  status: ServerStatus;
  credential_id: string;
  last_health_check: string | null;
  open_incidents: number;
  created_at: string;
}

// ── Metrics ─────────────────────────────────────────────────
export interface MetricResponse {
  _id: string;
  server_id: string;
  cpu_usage: number;
  ram_usage: number;
  disk_usage: number;
  timestamp: string;
}

// ── Incidents ───────────────────────────────────────────────
export interface IncidentResponse {
  _id: string;
  server_id: string;
  rule_id: string;
  log_id: string;
  severity: SeverityLevel;
  status: IncidentStatus;
  detected_at: string;
  resolved_at: string | null;
  description: string;
  context: Record<string, string>;
  ai_analysis: string | null;
}

export interface RecentIncident {
  _id: string;
  server_id: string;
  server_hostname: string;
  rule_id: string;
  severity: SeverityLevel;
  status: IncidentStatus;
  detected_at: string;
  description: string;
  context?: Record<string, string>;
}

export interface IncidentStatusUpdate {
  status: IncidentStatus;
}

export interface IncidentStats {
  total: number;
  by_status: Record<string, number>;
  by_severity: Record<string, number>;
}

// ── Dashboard ────────────────────────────────────────────────
export interface DashboardSummary {
  servers: {
    total: number;
    online: number;
    offline: number;
  };
  incidents: {
    total: number;
    by_status: Record<string, number>;
    by_severity: Record<string, number>;
  };
  logs: { total: number };
  rules: { total: number };
  scripts: { total: number };
}

// ── Logs ─────────────────────────────────────────────────────
export interface LogEntry {
  _id: string;
  server_id: string;
  service: string;
  level: LogLevel;
  message: string;
  timestamp: string;
}

export interface LogSourceCreate {
  server_id: string;
  file_path: string;
  service_name: string;
}

export interface LogSearchResponse {
  total: number;
  showing: number;
  skip: number;
  limit: number;
  results: LogEntry[];
}

// ── Detection Rules ──────────────────────────────────────────
export interface DetectionRule {
  _id: string;
  name: string;
  pattern: string;
  severity: SeverityLevel;
  action_level: ActionLevel;
  description?: string;
  enabled: boolean;
  os_type: RuleOSType;
  tags: string[];
  remediation_script_id?: string;
  created_at: string;
}

export interface DetectionRuleCreate {
  name: string;
  pattern: string;
  severity: SeverityLevel;
  action_level: ActionLevel;
  description?: string;
  enabled: boolean;
  os_type: RuleOSType;
  tags: string[];
}

// ── Scripts ──────────────────────────────────────────────────
export interface ScriptResponse {
  _id: string;
  name: string;
  description?: string;
  language: ScriptLanguage;
  content: string;
  created_at: string;
}

export interface ScriptCreate {
  name: string;
  description?: string;
  language: ScriptLanguage;
  content: string;
}

// ── Notifications ─────────────────────────────────────────────
export interface NotificationConfig {
  _id: string;
  type: "email";
  enabled: boolean;
  config: Record<string, string>;
}
