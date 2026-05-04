// ============================================================
// SecOps Backend-Aligned Types
// All field names match the actual FastAPI/Pydantic schemas
// ============================================================

// ── Shared ──────────────────────────────────────────────────
export type SeverityLevel = "critical" | "high" | "medium" | "low";
export type IncidentStatus = "open" | "verifying" | "investigating" | "resolved" | "false_positive";
// ActionLevel is numeric: 1 = Auto-Remediate, 2 = Remediate+Alert, 3 = Alert Only
export type ActionLevel = 1 | 2 | 3;
export type ScriptLanguage = "bash" | "python" | "powershell";
export type RuleOSType = "linux" | "windows" | "common";
export type LogLevel = "info" | "warning" | "error" | "critical" | "unknown";

// ── Servers ─────────────────────────────────────────────────
// Backend accepts exactly "password" or "ssh_key" (see CredentialType in
// SecOps-Backend/app/modules/servers/schemas.py). Anything else 422s.
export type CredentialType = "password" | "ssh_key";

export interface ServerFilters {
  status?: "online" | "offline" | "unknown";
  os_type?: "linux" | "windows";
  search?: string;
  page?: number;
  page_size?: number;
}

export interface ServerListResponse {
  total: number;
  page: number;
  page_size: number;
  results: ServerResponse[];
}

export interface CredentialCreate {
  username: string;
  type: CredentialType;
  secret: string;
  passphrase?: string;
}

export type ServerStatus = "online" | "offline" | "unknown";

export interface BusinessHours {
  start: string;        // "HH:MM"
  end: string;          // "HH:MM"
  days: number[];       // ISO weekday: 1=Mon..7=Sun
  tz: string;           // IANA tz; "UTC" recommended
}

export interface DetectionConfig {
  verification_window_minutes?: number;   // 1–120, default 10
  max_remediation_attempts?: number;      // 1–10, default 3
  incident_lookback_minutes?: number;     // 5–1440, default 30
  recurrence_streak_threshold?: number;   // 2–20, default 3
  recurrence_lookback_hours?: number;     // 0.25–24, default 2
  volume_spike_multiplier?: number;       // 2–100, default 10
}

export interface ServerCreate {
  hostname: string;
  ip_address: string;
  os_type: "linux" | "windows";
  port?: number;
  credential: CredentialCreate;
  business_hours?: BusinessHours;
  detection_config?: DetectionConfig;
  /** 0 = skip warm-up; up to 525_600 = 1 year. Default 60 (1h). */
  warmup_minutes?: number;
}

export interface WarmupResetRequest {
  warmup_minutes: number;
  clear_known_patterns?: boolean;
}

export interface ServerUpdate {
  hostname?: string;
  ip_address?: string;
  os_type?: "linux" | "windows";
  port?: number;
  business_hours?: BusinessHours;
  detection_config?: DetectionConfig;
  credential?: Partial<CredentialCreate>;
  current_secret: string;     // REQUIRED — security challenge
}

export interface ServerDelete {
  current_secret: string;
}

export interface LastMetrics {
  cpu_usage: number;
  ram_usage: number;
  disk_usage: number;
  collected_at: string | null;
}

export interface ServerResponse {
  _id: string;
  hostname: string;
  ip_address: string;
  os_type: "linux" | "windows";
  port: number | null;
  status: ServerStatus;
  credential_id: string;
  last_health_check: string | null;
  created_at: string;
  // Denormalised counters (maintained by incident write paths)
  open_incidents_count: number;
  // Cached last metric snapshot (updated every 60s by telemetry tick)
  last_metrics: LastMetrics | null;
  // Tier 2 anomaly state (read-only)
  business_hours?: BusinessHours | null;
  detection_config?: DetectionConfig | null;
  pattern_warmup_until?: string | null;
  log_rate_baseline?: number | null;
  log_rate_updated_at?: string | null;
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
export interface IncidentFilters {
  server_id?: string;
  severity?: SeverityLevel;
  status?: IncidentStatus;
  search?: string;
  page?: number;
  page_size?: number;
}

export interface IncidentListResponse {
  total: number;
  page: number;
  page_size: number;
  results: IncidentResponse[];
}

export interface IncidentResponse {
  _id: string;
  server_id: string;
  rule_id: string;
  log_id: string;
  severity: SeverityLevel;
  status: IncidentStatus;
  detected_at: string;
  resolved_at: string | null;
  auto_resolved_at?: string | null;
  description: string;
  context: Record<string, string>;
  ai_analysis: string | null;
  automation_skipped_reason?: "script_disabled" | "script_missing" | "recurrence_detected" | null;
  automation_failure_reason?: "remediation_exhausted" | "permission_denied" | "execution_failed" | "unsafe_placeholder" | null;
  remediation_attempts?: number;
  last_remediation_at?: string | null;
  verification_until?: string | null;
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

// ── Anomalies (Tier 2 heuristic observations) ───────────────
export type AnomalyType = "log" | "volume";
export type AnomalySeverity = "low" | "medium" | "high";
export type LogObservationStatus =
  | "pending_review"
  | "dismissed"
  | "promoted_to_incident";

export interface LogObservation {
  _id: string;
  server_id: string;
  server_hostname?: string;
  type: AnomalyType;
  log_id?: string | null;
  log_message?: string | null;
  log_timestamp?: string | null;
  reasons: string[];
  score: number;
  severity: AnomalySeverity;
  status: LogObservationStatus;
  promoted_incident_id?: string | null;
  ai_analysis?: string | null;
  ai_analyzed_at?: string | null;
  detected_at: string;
  reviewed_at?: string | null;
}

export interface AnomalyFilters {
  server_id?: string;
  status?: LogObservationStatus | "all";
  severity?: AnomalySeverity | "all";
  type?: AnomalyType | "all";
  page?: number;
  page_size?: number;
}

export interface AnomalyListResponse {
  total: number;
  page: number;
  page_size: number;
  results: LogObservation[];
}

export interface AnomalyStats {
  total: number;
  pending: number;
  dismissed: number;
  promoted: number;
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

export type LogParserType = "raw" | "nginx" | "apache" | "json";

export interface LogSource {
  _id: string;
  server_id: string;
  name: string;
  file_path: string;
  parser_type: LogParserType;
  is_active: boolean;
  last_offset: number;
  error_count: number;
  created_at?: string;
}

export interface LogSourceCreate {
  server_id: string;
  name: string;
  file_path: string;
  parser_type?: LogParserType;
}

export interface LogSourceUpdate {
  name?: string;
  file_path?: string;
  parser_type?: LogParserType;
  is_active?: boolean;
}

export interface LogSearchResponse {
  total: number;
  showing: number;
  skip: number;
  limit: number;
  results: LogEntry[];
}

// ── Detection Rules ──────────────────────────────────────────
export interface RuleFilters {
  severity?: SeverityLevel;
  os_type?: RuleOSType;
  enabled?: boolean;
  search?: string;
  page?: number;
  page_size?: number;
}

export interface RuleListResponse {
  total: number;
  page: number;
  page_size: number;
  results: DetectionRule[];
}

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
  target_os?: string;
  category?: "diagnostic" | "containment" | "recovery";
  enabled: boolean;
  content: string;
  created_at: string;
}

export interface ScriptCreate {
  name: string;
  description?: string;
  language: ScriptLanguage;
  target_os?: string;
  category?: string;
  enabled?: boolean;
  content: string;
}

export interface ScriptFilters {
  language?: ScriptLanguage;
  target_os?: string;
  search?: string;
  page?: number;
  page_size?: number;
}

export interface ScriptListResponse {
  total: number;
  page: number;
  page_size: number;
  results: ScriptResponse[];
}

// ── Automation / Remediation history ─────────────────────────
export interface RemediationRun {
  _id: string;
  incident_id: string;
  script_id: string;
  script_name: string;
  server_id: string;
  server_hostname: string;
  executed_at: string;
  status: "success" | "failed";
  output: string | null;
  error: string | null;
}

export interface RemediationHistoryFilters {
  limit?: number;
  skip?: number;
  status?: "success" | "failed";
  server_id?: string;
  script_id?: string;
}

export interface RemediationHistoryStats {
  total: number;
  success: number;
  failed: number;
  last_24h: number;
  success_rate: number;
}

// ── Notifications ─────────────────────────────────────────────
export interface NotificationConfig {
  _id?: string;
  channel: "email";
  enabled: boolean;
  recipients: string[];
  min_severity: SeverityLevel;
  smtp_host?: string;
  smtp_port?: number;
  smtp_user?: string;
  smtp_password?: string;
}
