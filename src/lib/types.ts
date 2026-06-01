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
  status?: "online" | "reachable" | "offline" | "unknown";
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

export type ServerStatus = "online" | "reachable" | "offline" | "unknown";

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
  anomaly_dedup_window_hours?: number;    // 0.25–24, default 2h
  anomaly_suppression_ttl_hours?: number; // 1–168, default 24h
  anomaly_auto_promote?: boolean;         // default false — promote high-confidence anomalies automatically
  script_review_enabled?: boolean;        // default false — Phase 28.4 AI review after every L1/L2 remediation
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
  windows_event_ids?: number[] | null;
  windows_event_ids_exclude?: number[] | null;
  ai_autonomy_level?: "read_only" | "suggest";
  // Phase 28.5 — per-server rule/script library mode
  rule_library_mode?: LibraryMode;
  script_library_mode?: LibraryMode;
  credential?: Partial<CredentialCreate>;
  current_secret: string;     // REQUIRED — security challenge
}

// Phase 28.5 — 3-tier per-server library selector
export type LibraryMode = "global" | "server" | "both";

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
  auth_failure_reason: string | null;
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
  // Windows Event Log filters
  windows_event_ids?: number[] | null;
  windows_event_ids_exclude?: number[] | null;
  // AI agent autonomy policy
  ai_autonomy_level?: "read_only" | "suggest";
  // Phase 28.5 — per-server rule/script library mode (default global)
  rule_library_mode?: LibraryMode;
  script_library_mode?: LibraryMode;
  // AI server-overview state (Phase 28.2)
  ai_analysis_in_progress?: boolean | null;
  ai_analysis_latest_id?: string | null;
  ai_analysis_count?: number;
}

// Manual command shape — used by incident triage, anomaly triage, and server overview.
// The incident/anomaly outputs use only the first 3 fields; server overview adds the rest.
export interface AiManualCommand {
  command: string;
  purpose: string;
  note?: string;
  expected_output?: string;
  steps?: string[];
  risk_level?: "low" | "medium" | "high";
  os_type?: "linux" | "windows";
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
  from_date?: string;   // ISO UTC datetime
  to_date?: string;     // ISO UTC datetime
  page?: number;
  page_size?: number;
}

export interface IncidentListResponse {
  total: number;
  page: number;
  page_size: number;
  results: IncidentResponse[];
}

// Phase 28.4 — denormalised latest automation run on the incident detail response.
export interface LatestRemediation {
  automation_log_id: string;
  script_id?: string | null;
  script_name?: string | null;
  status?: "success" | "failed" | null;
  executed_at?: string | null;
  output?: string | null;
  error?: string | null;
  ai_review_id?: string | null;
  ai_review_verdict?: ScriptReviewVerdict | null;
  ai_review_summary?: string | null;
}

export interface IncidentResponse {
  _id: string;
  server_id: string;
  server_hostname?: string;
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
  ai_analysis_latest_id?: string | null;
  ai_analysis_count?: number;
  ai_analysis_in_progress?: boolean;
  ai_manual_commands?: AiManualCommand[] | null;
  // Phase 28.4 — populated when an AI suggestion of type
  // `suggest_manual_remediation` was approved by an operator.
  ai_manual_commands_reason?: string | null;
  // Phase 28.5.2 — checklist produced by the post-remediation review's
  // `suggest_manual_remediation` action. Stored in its own field so the
  // original triage commands above stay intact. `_meta.automation_log_id`
  // links back to the remediation run that produced these commands.
  ai_remediation_manual_commands?: AiManualCommand[] | null;
  ai_remediation_manual_commands_meta?: {
    reason?: string | null;
    automation_log_id?: string | null;
    created_at?: string | null;
  } | null;
  automation_skipped_reason?: "script_disabled" | "script_disabled_for_server" | "script_missing" | "recurrence_detected" | null;
  automation_failure_reason?: "remediation_exhausted" | "permission_denied" | "execution_failed" | "unsafe_placeholder" | null;
  remediation_attempts?: number;
  last_remediation_at?: string | null;
  verification_until?: string | null;
  // Phase 28.4 — most recent automation_logs row + its AI review verdict.
  // Populated only on the single-incident GET, not list endpoints.
  latest_remediation?: LatestRemediation | null;
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
  fingerprint?: string;
  log_id?: string | null;
  last_log_id?: string | null;
  log_message?: string | null;
  log_timestamp?: string | null;
  sample_log_ids?: string[];
  reasons: string[];
  score: number;
  severity: AnomalySeverity;
  status: LogObservationStatus;
  promoted_incident_id?: string | null;
  // Aggregation fields
  occurrence_count?: number;
  first_seen_at?: string;
  last_seen_at?: string;
  // AI (legacy inline + new pointers)
  ai_analysis?: string | null;
  ai_analyzed_at?: string | null;
  ai_promotion_recommendation?: "promote_to_incident" | "dismiss" | "monitor" | null;
  ai_manual_commands?: AiManualCommand[] | null;
  ai_analysis_latest_id?: string | null;
  ai_analysis_count?: number;
  ai_analysis_in_progress?: boolean;
  detected_at: string;
  reviewed_at?: string | null;
}

export interface AnomalyFilters {
  server_id?: string;
  status?: LogObservationStatus | "all";
  severity?: AnomalySeverity | "all";
  type?: AnomalyType | "all";
  from_date?: string;
  to_date?: string;
  page?: number;
  page_size?: number;
}

export interface AnomalyListResponse {
  total: number;
  page: number;
  page_size: number;
  results: LogObservation[];
}

// ── AI Actions (pending-action inbox for suggest-level autonomy) ────────────
export type AiActionStatus = "pending" | "approved" | "rejected";
export type AiActionType =
  | "dismiss_anomaly"
  | "promote_anomaly"
  | "mark_incident_false_positive"
  // Phase 28.4 — script-execution-review suggestion actions
  | "disable_script_for_server"
  | "disable_rule_for_server"
  | "suggest_manual_remediation"
  // Phase 28.5 — per-server library actions
  | "create_server_rule"
  | "create_server_script"
  | "swap_remediation_script"
  // Phase 28.5.4 — atomic rule+script pair
  | "create_server_rule_with_script";

export interface AiPendingAction {
  _id: string;
  action_type: AiActionType;
  // Payload shape varies by action_type — some carry nested objects (e.g.
  // `manual_commands` for `suggest_manual_remediation`) so we use `unknown`
  // and let the renderer narrow at the use site.
  payload: Record<string, unknown>;
  run_id: string;
  source_type?: "incident" | "anomaly" | "automation_log" | "server" | "";
  source_id?: string;
  server_id?: string;
  server_hostname?: string;
  status: AiActionStatus;
  created_at: string;
  decided_at: string | null;
  decided_by: string | null;
  outcome?: Record<string, unknown> | null;
}

export interface AiActionsListResponse {
  total: number;
  page: number;
  page_size: number;
  results: AiPendingAction[];
}

// ── AI Command (full lifecycle: suggestion → decision → execution → impact) ──
export type AiCommandStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "executing"
  | "completed"
  | "failed"
  | "blocked";

export type AiCommandRiskLevel = "low" | "medium" | "high";
export type AiCommandOutcome = "resolved" | "partial" | "no_effect" | "made_worse";

export interface CommandSuggestion {
  command: string;
  os_type: "linux" | "windows";
  purpose: string;
  risk_level: AiCommandRiskLevel;
  expected_outcome: string;
  is_read_only: boolean;
}

interface AiSnapshot {
  metrics: { cpu_usage?: number; ram_usage?: number; disk_usage?: number; collected_at?: string };
  log_tail: { timestamp: string; level: string; message: string }[];
  open_incidents_count: number;
  timestamp: string;
}

export interface AiCommand {
  _id: string;
  analysis_id: string;
  run_id: string;
  batch_id: string | null;
  source_type: "incident" | "anomaly";
  source_id: string;
  server_id: string;
  server_hostname?: string;
  command: string;
  os_type: "linux" | "windows";
  purpose: string;
  risk_level: AiCommandRiskLevel;
  expected_outcome: string;
  is_read_only: boolean;
  status: AiCommandStatus;
  decided_at: string | null;
  decided_by: string | null;
  stdout: string | null;
  stderr: string | null;
  exit_code: number | null;
  duration_ms: number | null;
  executed_at: string | null;
  pre_snapshot: AiSnapshot | null;
  post_snapshot: AiSnapshot | null;
  impact_analysis_id: string | null;
  impact_verdict: AiCommandOutcome | null;
  impact_addressed_root_cause?: "yes" | "partial" | "no" | "unknown" | null;
  impact_summary: string | null;
  error: string | null;
  blocked_by_guardrail: string | null;
  retry_of: string | null;
  created_at: string;
}

export interface AiCommandListResponse {
  total: number;
  page: number;
  page_size: number;
  results: AiCommand[];
}

// ── AI Analysis (unified — all types) ────────────────────────────────────────
export type AiAnalysisType =
  | "incident_triage"
  | "anomaly_triage"
  | "server_overview"
  | "script_execution_review"
  | "command_impact"
  | "app_overview";

export interface AiAnalysis {
  _id: string;
  run_id: string;
  analysis_type: AiAnalysisType;
  source_type: string;
  source_id: string;
  server_id: string;
  server_hostname?: string;
  summary: string;
  markdown: string;
  confidence: number;
  structured: Record<string, unknown>;
  anchored_at: string;
  window_minutes: number;
  llm_provider: string;
  llm_model: string;
  created_at: string;
}

export interface AiAnalysisListResponse {
  total: number;
  page: number;
  page_size: number;
  results: AiAnalysis[];
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
    reachable: number;
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

// Phase 28.7 — app-wide AI overview (dashboard). Persisted ai_analysis row of
// type "app_overview"; null when none has been generated yet.
export interface AppOverview {
  _id: string;
  run_id: string;
  summary: string;
  markdown: string;
  created_at: string;
  llm_provider?: string;
  llm_model?: string;
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
  // Phase 28.5 — scope filter (global vs server-scoped)
  owner_type?: "global" | "server";
  owner_id?: string;
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
  remediation_script_id_windows?: string | null;
  // Phase 28.5 — library scoping (default global)
  owner_type?: "global" | "server";
  owner_id?: string | null;
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
  remediation_script_id?: string | null;
  remediation_script_id_windows?: string | null;
  // Phase 28.5 — defaults to "global" / null when omitted
  owner_type?: "global" | "server";
  owner_id?: string | null;
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
  // Phase 28.5 — library scoping (default global)
  owner_type?: "global" | "server";
  owner_id?: string | null;
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
  // Phase 28.5 — defaults to "global" / null when omitted
  owner_type?: "global" | "server";
  owner_id?: string | null;
}

export interface ScriptFilters {
  language?: ScriptLanguage;
  target_os?: string;
  // Phase 28.5 — scope filter
  owner_type?: "global" | "server";
  owner_id?: string;
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

// Phase 28.4 — verdict values written by the AI script-execution review.
// `review_failed` = the review itself errored out (e.g. LLM unavailable).
// `in_progress` is set by the manual-analyze endpoint while the task runs.
export type ScriptReviewVerdict =
  | "resolved"
  | "partial"
  | "no_effect"
  | "made_worse"
  | "review_failed"
  | "in_progress";

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
  // Phase 28.4 — populated by the post-execution AI review.
  ai_review_id?: string | null;
  ai_review_verdict?: ScriptReviewVerdict | null;
  ai_review_summary?: string | null;
  // Phase 28.5.2 — denormalised copy of the manual checklist when an
  // operator approved a `suggest_manual_remediation` action on this run.
  ai_remediation_manual_commands?: AiManualCommand[] | null;
  ai_remediation_manual_commands_meta?: {
    reason?: string | null;
    automation_log_id?: string | null;
    incident_id?: string | null;
    created_at?: string | null;
  } | null;
}

export interface RemediationHistoryFilters {
  limit?: number;
  skip?: number;
  status?: "success" | "failed";
  server_id?: string;
  script_id?: string;
  from_date?: string;
  to_date?: string;
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

// Phase 28.6 — runtime LLM provider/model override, surfaced on the Settings tab.
export type LlmProvider = "openrouter" | "anthropic" | "openai";

export interface LlmConfig {
  provider: LlmProvider;
  model: string;
  env_default_provider: string;
  env_default_model: string;
}

export interface LlmConfigUpdate {
  provider: LlmProvider;
  model: string;
}

// ── In-app notifications (Phase 29 — persistent bell feed) ──────────────────
// Mirrors NotificationOut in SecOps-Backend/app/modules/notifications/feed_schemas.py.
export type NotificationCategory = "ai" | "incident" | "automation" | "anomaly" | "server";
export type NotificationSeverity = "info" | "success" | "warning" | "error";

export interface AppNotification {
  id: string;
  type: string;
  category: NotificationCategory;
  severity: NotificationSeverity;
  title: string;
  body?: string | null;
  link?: string | null;
  server_id?: string | null;
  user_id?: string | null;
  entity_type?: string | null;
  entity_id?: string | null;
  read: boolean;
  read_at?: string | null;
  count: number;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface NotificationListResponse {
  total: number;
  page: number;
  page_size: number;
  results: AppNotification[];
}
