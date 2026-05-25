"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowLeft,
  Bot,
  CalendarDays,
  KeyRound,
  Library,
  Network,
  RotateCcw,
  Save,
  Settings2,
  ShieldAlert,
  Telescope,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useServer,
  useUpdateServer,
  useResetWarmup,
  useResetBaseline,
} from "@/lib/hooks/use-servers";
import {
  WarmupDurationPicker,
  formatMinutes,
} from "@/components/servers/warmup-duration-picker";
import { cn } from "@/lib/utils";
import type { DetectionConfig } from "@/lib/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const IP_RE = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface DetectionField {
  key: keyof DetectionConfig;
  label: string;
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  default: number | boolean;
  type?: "boolean";
  summary: string;
  detail: string;
  raiseTip: string;
  lowerTip: string;
}

const DETECTION_FIELDS: DetectionField[] = [
  {
    key: "verification_window_minutes",
    label: "Verification Window",
    unit: "min",
    min: 1,
    max: 120,
    step: 1,
    default: 10,
    summary:
      "After a remediation script runs, the engine watches this server for the same detection rule to trigger again. If it does, the fix is considered failed and a retry is scheduled.",
    detail:
      "The window starts the moment the script finishes. Any matching event before the window closes is counted as a recurrence and increments the retry counter.",
    raiseTip:
      "Critical servers where you want a long observation period before declaring a fix successful.",
    lowerTip:
      "High-traffic servers that generate many legitimate events — a shorter window avoids false 'fix failed' classifications.",
  },
  {
    key: "max_remediation_attempts",
    label: "Max Remediation Attempts",
    unit: "attempts",
    min: 1,
    max: 10,
    step: 1,
    default: 3,
    summary:
      "The number of times the engine will re-run the remediation script when a fix appears to have failed (the same rule fires again inside the verification window).",
    detail:
      "Once this limit is reached the incident is marked as remediation-exhausted and an escalation alert is sent to human responders. The engine stops all automated action on that incident.",
    raiseTip:
      "Rules where the automated fix is expected to need several passes (e.g. flushing temporary files that keep being recreated).",
    lowerTip:
      "High-severity rules where you want fast human escalation, or scripts that are known to be idempotent on first success.",
  },
  {
    key: "incident_lookback_minutes",
    label: "Dedup Lookback",
    unit: "min",
    min: 5,
    max: 1440,
    step: 5,
    default: 30,
    summary:
      "When a new log line matches a rule, the engine looks back this far to find an existing OPEN or VERIFYING incident for the same rule on this server. If one is found, the new trigger is merged instead of opening a duplicate.",
    detail:
      "Incidents older than this window are treated as resolved-and-gone — a fresh trigger opens a new incident. This prevents stale incidents from absorbing new events indefinitely.",
    raiseTip:
      "Rules whose events arrive in slow bursts over many minutes or hours — a longer window collapses the whole burst into one incident.",
    lowerTip:
      "Rules where each occurrence truly warrants its own investigation, or when your volume is low and stale dedup is unlikely.",
  },
  {
    key: "recurrence_streak_threshold",
    label: "Recurrence Streak Threshold",
    unit: "cycles",
    min: 2,
    max: 20,
    step: 1,
    default: 3,
    summary:
      "How many consecutive 'fixed → came back' cycles the engine allows before it pauses automation entirely and escalates to a human. One cycle = script ran, appeared to resolve, then the same rule fired again within the recurrence lookback window.",
    detail:
      "When this threshold is crossed the incident is marked with automation_skipped_reason: recurrence_detected and only alert-level (L3) actions are taken from that point forward. A human must manually clear the recurrence state.",
    raiseTip:
      "Stable environments where transient flapping is common and you trust the automation to self-correct given enough attempts.",
    lowerTip:
      "Critical servers or sensitive rules where infinite remediation loops must be stopped quickly — lower values pause automation sooner.",
  },
  {
    key: "recurrence_lookback_hours",
    label: "Recurrence Lookback",
    unit: "hrs",
    min: 0.25,
    max: 24,
    step: 0.25,
    default: 2,
    summary:
      "When checking whether a previous auto-resolved incident should count as part of the current recurrence chain, how far back to look. A resolution older than this window resets the streak counter to zero.",
    detail:
      "Short values mean the engine forgets quickly — a problem that recurs after a long gap is treated as a new event. Long values mean the engine has a longer memory and can recognise slowly-cycling problems as the same root cause.",
    raiseTip:
      "Servers with known slow-cycling issues (e.g. a service that crashes every few hours) where you want the streak to accumulate across incidents.",
    lowerTip:
      "High-frequency servers where you expect the same rule to fire naturally over time without being a true recurrence.",
  },
  {
    key: "volume_spike_multiplier",
    label: "Volume Spike Multiplier",
    unit: "×",
    min: 2,
    max: 100,
    step: 0.5,
    default: 10,
    summary:
      "The log ingestion rate must exceed this multiple of the server's rolling EMA baseline to trigger a volume-spike anomaly. The baseline is updated each telemetry tick using exponential smoothing.",
    detail:
      "Volume spikes are categorised as Tier 2 heuristic anomalies, not rule-based incidents. They appear on the Anomalies tab and can be dismissed or promoted to an incident. The EMA baseline requires at least 5 data points before spikes are flagged.",
    raiseTip:
      "Noisy servers with naturally bursty log output — a higher multiplier prevents constant false positives on expected volume surges.",
    lowerTip:
      "Quiet, predictable servers where even a moderate surge in log volume is a meaningful signal worth investigating.",
  },
  {
    key: "anomaly_dedup_window_hours",
    label: "Anomaly Dedup Window",
    unit: "hrs",
    min: 0.25,
    max: 24,
    step: 0.25,
    default: 2,
    summary:
      "Identical anomaly detections within this window are collapsed into a single observation row — repeated hits just bump the occurrence counter instead of creating new rows.",
    detail:
      "The fingerprint encodes server, type, normalized message, and heuristic reasons. After the window expires, the next detection starts a fresh row. This is the primary control for managing observation volume on noisy servers.",
    raiseTip:
      "Servers with known repetitive events (e.g. Windows Security logs) — a longer window dramatically reduces row count.",
    lowerTip:
      "Quiet servers where each occurrence of the same pattern within a few hours is independently meaningful.",
  },
  {
    key: "anomaly_suppression_ttl_hours",
    label: "Dismissal Suppression",
    unit: "hrs",
    min: 1,
    max: 168,
    step: 1,
    default: 24,
    summary:
      "After an observation is dismissed, the same fingerprint is silently suppressed for this many hours. New detections of the same pattern are dropped without creating a row or emitting an event.",
    detail:
      "Suppression is fingerprint-scoped, not rule-scoped — only the exact same normalized message and heuristic reasons are suppressed. Different variations of the same event type will still be flagged. The suppression record is stored in the dismissed_fingerprints collection with a TTL index.",
    raiseTip:
      "Chronic noisy patterns you have already reviewed and confirmed as benign — raise to avoid re-reviewing the same thing daily.",
    lowerTip:
      "Patterns that could become malicious after a short quiet period — lower so they resurface quickly if conditions change.",
  },
  {
    key: "anomaly_auto_promote",
    label: "Auto-Promote Anomalies",
    type: "boolean",
    default: false,
    summary:
      "When enabled, observations with severity=high and ≥3 occurrences are automatically promoted to incidents without manual review — as long as the fingerprint is not in the dismissal suppression list.",
    detail:
      "Auto-promotion runs every time an existing observation's occurrence count is bumped. The promotion creates a real incident with rule_id='anomaly:promoted' and marks the source observation as promoted_to_incident. The incident description includes the occurrence count and the list of triggering reasons.",
    raiseTip:
      "Critical servers where high-severity repeated anomalies should always create an incident immediately — reduces operator burden on well-tuned servers.",
    lowerTip:
      "Noisy servers still being tuned — keep off until keyword filtering and dedup settings are dialled in to avoid incident spam.",
  },
  {
    key: "script_review_enabled",
    label: "AI Script Execution Review",
    type: "boolean",
    default: true,
    summary:
      "Run an AI review after every L1/L2 remediation script execution on this server. The review reads pre/post snapshots + stdout/stderr and judges whether the fix actually addressed the root cause (resolved / partial / no_effect / made_worse). Verdict appears on the Remediation History page and the incident detail page.",
    detail:
      "Adds ~10–20 s and one LLM call per automated fix. Independent of the AI autonomy level — works on `read_only` servers too. When the server is in `suggest` mode AND the verdict is no_effect/made_worse/partial, the AI may also queue suggestion actions (disable this script for this server, disable the rule, propose manual commands) into the AI Actions inbox for operator approval. Disable on cost-sensitive servers; operators can still manually trigger a review per-run from the History page.",
    raiseTip:
      "Most servers — the verdict signal is the fastest indicator that a script silently failed to fix the underlying problem.",
    lowerTip:
      "Cost-sensitive servers or extremely chatty boxes where every L1 fix burning a token spend is wasteful — operators retain on-demand manual analysis.",
  },
];

const DETECTION_DEFAULTS: Record<string, number | boolean> = {
  ...Object.fromEntries(DETECTION_FIELDS.map((f) => [f.key, f.default])),
  anomaly_auto_promote: false,
  script_review_enabled: true,
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EditServerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data: server, isLoading } = useServer(id);

  // ── Form state ──────────────────────────────────────────────────────────────
  const [hostname, setHostname] = useState("");
  const [ipAddress, setIpAddress] = useState("");
  const [osType, setOsType] = useState<"linux" | "windows">("linux");
  const [port, setPort] = useState("");

  const [bhStart, setBhStart] = useState("09:00");
  const [bhEnd, setBhEnd] = useState("18:00");
  const [bhDays, setBhDays] = useState<number[]>([1, 2, 3, 4, 5]);

  const [detectionConfig, setDetectionConfig] = useState<
    Record<string, number | boolean>
  >({ ...DETECTION_DEFAULTS });

  const [winEventAllow, setWinEventAllow] = useState("");
  const [winEventExclude, setWinEventExclude] = useState("");

  const [changeCredential, setChangeCredential] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newSecret, setNewSecret] = useState("");
  const [currentSecret, setCurrentSecret] = useState("");

  const [aiAutonomyLevel, setAiAutonomyLevel] = useState<"read_only" | "suggest">("read_only");
  // Phase 28.5 — per-server library mode selectors
  const [ruleLibraryMode, setRuleLibraryMode] = useState<"global" | "server" | "both">("global");
  const [scriptLibraryMode, setScriptLibraryMode] = useState<"global" | "server" | "both">("global");
  const [warmupMinutes, setWarmupMinutes] = useState(60);
  const [error, setError] = useState<string | null>(null);

  // ── Sync when server loads ───────────────────────────────────────────────────
  useEffect(() => {
    if (!server) return;
    setHostname(server.hostname);
    setIpAddress(server.ip_address);
    setOsType(server.os_type);
    setPort(server.port?.toString() ?? "");
    setBhStart(server.business_hours?.start ?? "09:00");
    setBhEnd(server.business_hours?.end ?? "18:00");
    setBhDays(server.business_hours?.days ?? [1, 2, 3, 4, 5]);
    setDetectionConfig({
      ...DETECTION_DEFAULTS,
      ...(server.detection_config ?? {}),
    });
    setWinEventAllow((server.windows_event_ids ?? []).join(", "));
    setWinEventExclude((server.windows_event_ids_exclude ?? []).join(", "));
    setAiAutonomyLevel(server.ai_autonomy_level ?? "read_only");
    setRuleLibraryMode(server.rule_library_mode ?? "global");
    setScriptLibraryMode(server.script_library_mode ?? "global");
  }, [server]);

  const updateServer = useUpdateServer();
  const resetWarmup = useResetWarmup();
  const resetBaseline = useResetBaseline();

  const toggleDay = (d: number) =>
    setBhDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort(),
    );

  const setField = (key: string, value: number | boolean) =>
    setDetectionConfig((prev) => ({ ...prev, [key]: value }));

  const parseIds = (raw: string): number[] | null =>
    raw.trim() === ""
      ? null
      : raw.split(",").map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n));

  const handleSave = async () => {
    setError(null);
    if (!hostname.trim()) return setError("Hostname is required");
    if (!IP_RE.test(ipAddress)) return setError("Invalid IP address");
    if (!TIME_RE.test(bhStart) || !TIME_RE.test(bhEnd))
      return setError("Business hours must be HH:MM (24-hour)");
    if (bhDays.length === 0)
      return setError("Select at least one business day");
    if (!currentSecret) return setError("Current password is required to save");
    if (changeCredential && !newSecret)
      return setError("New password cannot be empty");

    try {
      await updateServer.mutateAsync({
        id: server!._id,
        data: {
          hostname,
          ip_address: ipAddress,
          os_type: osType,
          port: port ? Number(port) : undefined,
          business_hours: {
            start: bhStart,
            end: bhEnd,
            days: bhDays,
            tz: "UTC",
          },
          detection_config: detectionConfig,
          windows_event_ids: parseIds(winEventAllow),
          windows_event_ids_exclude: parseIds(winEventExclude),
          ai_autonomy_level: aiAutonomyLevel,
          // Phase 28.5 — per-server library mode
          rule_library_mode: ruleLibraryMode,
          script_library_mode: scriptLibraryMode,
          credential: changeCredential
            ? { username: newUsername || undefined, secret: newSecret }
            : undefined,
          current_secret: currentSecret,
        },
      });
      toast.success("Server updated");
      router.push(`/servers/${id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to update";
      setError(msg);
      toast.error(msg);
    }
  };

  const handleResetWarmup = async () => {
    try {
      await resetWarmup.mutateAsync({
        id: server!._id,
        body: { warmup_minutes: warmupMinutes, clear_known_patterns: true },
      });
      toast.success(
        `Pattern warm-up restarted (${formatMinutes(warmupMinutes)})`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  };

  const handleResetBaseline = async () => {
    try {
      await resetBaseline.mutateAsync(server!._id);
      toast.success("Log-rate baseline reset");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  };

  // ── Loading / not-found ──────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <AppShell>
        <div className="animate-pulse space-y-6 max-w-3xl mx-auto">
          <div className="h-8 w-64 bg-muted rounded" />
          <div className="h-48 bg-muted rounded-xl" />
          <div className="h-48 bg-muted rounded-xl" />
        </div>
      </AppShell>
    );
  }

  if (!server) {
    return (
      <AppShell>
        <p className="text-muted-foreground">Server not found.</p>
      </AppShell>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-8 pb-16">
        {/* ── Sticky header ──────────────────────────────────────────────── */}
        <div className="-mx-4 px-4 py-4 bg-background/90 backdrop-blur-sm border-b border-border flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href={`/servers/${id}`}
              className="shrink-0 flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Editing server
              </p>
              <h1 className="text-lg font-bold truncate">
                {server.hostname.toUpperCase()}
              </h1>
            </div>
          </div>
        </div>

        {/* ── Section 1: Identity ─────────────────────────────────────────── */}
        <Section
          icon={<Network className="h-5 w-5" />}
          title="Server Identity"
          description="Basic network identity of the server. Changing the IP or OS type takes effect on the next scheduler tick."
        >
          <div className="grid grid-cols-2 gap-4">
            <Field label="Hostname">
              <Input
                value={hostname}
                onChange={(e) => setHostname(e.target.value)}
              />
            </Field>
            <Field label="IP Address">
              <Input
                value={ipAddress}
                onChange={(e) => setIpAddress(e.target.value)}
              />
            </Field>
            <Field label="OS Type" hint="Operating System">
              <Select
                value={osType}
                onValueChange={(v) => v && setOsType(v as "linux" | "windows")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="linux">Linux</SelectItem>
                  <SelectItem value="windows">Windows</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Port" hint="Leave blank for default (22 / 5985)">
              <Input
                value={port}
                onChange={(e) => setPort(e.target.value)}
                placeholder="22 / 5985"
              />
            </Field>
          </div>
        </Section>

        {/* ── Section 2: Business Hours ────────────────────────────────────── */}
        <Section
          icon={<CalendarDays className="h-5 w-5" />}
          title="Business Hours"
          description="Defines the normal operating window for this server. The time-of-day heuristic uses this to elevate the anomaly score of events that occur outside these hours — weekend logins, off-hours process launches, and similar suspicious patterns score higher as a result."
        >
          <div className="grid grid-cols-3 gap-4">
            <Field label="Start time" hint="HH:MM 24-hour">
              <Input
                value={bhStart}
                onChange={(e) => setBhStart(e.target.value)}
                placeholder="09:00"
              />
            </Field>
            <Field label="End time" hint="HH:MM 24-hour">
              <Input
                value={bhEnd}
                onChange={(e) => setBhEnd(e.target.value)}
                placeholder="18:00"
              />
            </Field>
            <Field label="Timezone" hint="All times are stored in UTC">
              <div className="h-8 flex items-center px-2.5 rounded-lg border border-border bg-muted/50 text-sm font-mono text-muted-foreground select-none">
                UTC
              </div>
            </Field>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
              Active Days
            </label>
            <div className="flex flex-wrap gap-2">
              {DAY_NAMES.map((name, idx) => {
                const day = idx + 1;
                const active = bhDays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={cn(
                      "h-9 w-12 text-xs font-semibold rounded-lg border transition-all",
                      active
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-card text-muted-foreground border-border hover:text-foreground hover:border-muted-foreground",
                    )}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              Events outside the selected days are also considered off-hours.
            </p>
          </div>
        </Section>

        {/* ── Section 3: Detection Configuration ──────────────────────────── */}
        <Section
          icon={<Settings2 className="h-5 w-5" />}
          title="Detection Configuration"
          description="Per-server overrides for the detection and automated remediation algorithm. These tunables control how aggressively the engine retries fixes, deduplicates incidents, and identifies recurring problems. Leave at defaults unless you have a specific reason to change them."
        >
          <div className="space-y-4">
            {DETECTION_FIELDS.map((field) => {
              const isBoolean = field.type === "boolean";
              const currentBool = !!detectionConfig[field.key];
              const currentNum = Number(detectionConfig[field.key] ?? field.default);
              const isCustom = isBoolean
                ? currentBool !== field.default
                : currentNum !== field.default;

              if (isBoolean) {
                return (
                  <div
                    key={field.key}
                    className={cn(
                      "rounded-xl border p-5 space-y-4 transition-colors",
                      isCustom ? "border-primary/30 bg-primary/5" : "border-border bg-card/50",
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold">{field.label}</h3>
                          {isCustom && (
                            <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/15 text-primary border border-primary/20">
                              Custom
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Default: {field.default ? "on" : "off"}
                        </p>
                      </div>
                      <label className="relative cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          checked={currentBool}
                          onChange={(e) => setField(field.key, e.target.checked)}
                          className="sr-only"
                        />
                        <div className={cn(
                          "w-11 h-6 rounded-full transition-colors",
                          currentBool ? "bg-primary" : "bg-muted",
                        )} />
                        <div className={cn(
                          "absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform",
                          currentBool ? "translate-x-5" : "translate-x-0",
                        )} />
                      </label>
                    </div>
                    <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
                      <p>{field.summary}</p>
                      <p className="text-xs">{field.detail}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Tip variant="raise" text={field.raiseTip} />
                      <Tip variant="lower" text={field.lowerTip} />
                    </div>
                    {isCustom && (
                      <button
                        type="button"
                        onClick={() => setField(field.key, field.default)}
                        className="text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Reset to default ({field.default ? "on" : "off"})
                      </button>
                    )}
                  </div>
                );
              }

              // Numeric slider field
              const pct = ((currentNum - field.min!) / (field.max! - field.min!)) * 100;
              return (
                <div
                  key={field.key}
                  className={cn(
                    "rounded-xl border p-5 space-y-4 transition-colors",
                    isCustom ? "border-primary/30 bg-primary/5" : "border-border bg-card/50",
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold">{field.label}</h3>
                        {isCustom && (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/15 text-primary border border-primary/20">
                            Custom
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Default: {field.default} {field.unit}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <input
                        type="number"
                        min={field.min}
                        max={field.max}
                        step={field.step}
                        value={currentNum}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          if (!isNaN(v))
                            setField(field.key, Math.min(field.max!, Math.max(field.min!, v)));
                        }}
                        className="w-20 h-9 rounded-lg border border-border bg-background text-center text-sm font-bold tabular-nums focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                      />
                      <span className="text-xs text-muted-foreground w-12 shrink-0">
                        {field.unit}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Slider
                      value={currentNum}
                      onValueChange={(v) => setField(field.key, v)}
                      min={field.min}
                      max={field.max}
                      step={field.step}
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground tabular-nums">
                      <span>{field.min} {field.unit}</span>
                      <span className="font-semibold text-foreground">{pct.toFixed(0)}% of range</span>
                      <span>{field.max} {field.unit}</span>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
                    <p>{field.summary}</p>
                    <p className="text-xs">{field.detail}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Tip variant="raise" text={field.raiseTip} />
                    <Tip variant="lower" text={field.lowerTip} />
                  </div>
                  {isCustom && (
                    <button
                      type="button"
                      onClick={() => setField(field.key, field.default)}
                      className="text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Reset to default ({field.default} {field.unit})
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </Section>

        {/* ── Section 4: Windows Event Log Filters ─────────────────────────── */}
        {osType === "windows" && (
          <Section
            icon={<Settings2 className="h-5 w-5" />}
            title="Windows Event Log Filters"
            description="Control which Windows Event IDs are collected from System, Security, and Application logs. By default all Level 1–3 events are collected. Use the allowlist to focus on specific event types, or the denylist to silence known-noisy IDs."
          >
            <div className="grid grid-cols-2 gap-4">
              <Field label="EventID Allowlist" hint="Comma-separated — only these IDs collected">
                <Input
                  value={winEventAllow}
                  onChange={(e) => setWinEventAllow(e.target.value)}
                  placeholder="e.g. 4625, 4720, 7034"
                  className="font-mono"
                />
              </Field>
              <Field label="EventID Denylist" hint="Comma-separated — these IDs excluded">
                <Input
                  value={winEventExclude}
                  onChange={(e) => setWinEventExclude(e.target.value)}
                  placeholder="e.g. 7036, 7040"
                  className="font-mono"
                />
              </Field>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Common high-signal IDs: <span className="font-mono">4625</span> (failed logon), <span className="font-mono">4720</span> (user created), <span className="font-mono">4732</span> (added to group), <span className="font-mono">7034</span> (service crash), <span className="font-mono">7045</span> (new service). Leave both blank to collect all Level 1–3 events.
            </p>
          </Section>
        )}

        {/* ── Section 5: Anomaly State ─────────────────────────────────────── */}
        <Section
          icon={<Telescope className="h-5 w-5" />}
          title="Anomaly Detection State"
          description="Read-only view of the server's Tier 2 heuristic state. Use the maintenance actions below to restart warm-up or reset the volume baseline. These take effect immediately and do not require the current password."
        >
          <div className="grid grid-cols-2 gap-4 text-sm">
            <ReadOnlyCard
              label="Pattern warm-up until"
              value={
                server.pattern_warmup_until
                  ? new Date(server.pattern_warmup_until).toLocaleString()
                  : "Not set"
              }
              note="During warm-up, novel patterns are recorded silently and not flagged."
            />
            <ReadOnlyCard
              label="Log rate baseline"
              value={
                server.log_rate_baseline != null
                  ? `${server.log_rate_baseline.toFixed(2)} logs/min`
                  : "Not calibrated"
              }
              note="The EMA baseline used for volume-spike detection. Requires ≥ 5 ticks."
            />
          </div>

          {/* Restart warm-up */}
          <div className="rounded-xl border border-border bg-card/50 p-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Restart Pattern Warm-up
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Wipes the seen-patterns set and starts a fresh warm-up window of
              the chosen duration. Use this after seeding a server with new log
              sources or after a major configuration change — otherwise the
              engine may flag legitimate patterns as novel.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <WarmupDurationPicker
                valueMinutes={warmupMinutes}
                onChange={setWarmupMinutes}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetWarmup}
                disabled={resetWarmup.isPending}
                className="gap-1.5 border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-400"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Restart warm-up
              </Button>
            </div>
          </div>

          {/* Reset baseline */}
          <div className="rounded-xl border border-border bg-card/50 p-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Reset Log-Rate Baseline
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Forces the volume EMA baseline back to zero. The next telemetry
              ticks will re-learn the baseline from scratch. Use this if log
              volume has permanently changed and the old baseline is generating
              false-positive volume-spike anomalies.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetBaseline}
              disabled={resetBaseline.isPending}
              className="gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset baseline
            </Button>
          </div>
        </Section>

        {/* ── Section 6: AI Autonomy ──────────────────────────────────────── */}
        <Section
          icon={<Bot className="h-5 w-5" />}
          title="AI Agent Autonomy"
          description="Controls how much authority the AI triage agent has when it investigates incidents and anomalies on this server. Start with Read-only on new servers and raise only after you trust the signal quality."
        >
          <div className="space-y-4">
            <div className="flex rounded-xl overflow-hidden border border-border">
              {(
                [
                  {
                    value: "read_only" as const,
                    label: "Read-only",
                    description: "Agent investigates and suggests. No mutations.",
                  },
                  {
                    value: "suggest" as const,
                    label: "Suggest",
                    description: "Agent queues actions for operator approval.",
                  },
                ] as const
              ).map((opt, i) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setAiAutonomyLevel(opt.value)}
                  className={cn(
                    "flex-1 px-3 py-3 text-left transition-colors",
                    i === 0 ? "" : "border-l border-border",
                    aiAutonomyLevel === opt.value
                      ? "bg-primary/10 text-foreground"
                      : "bg-card/50 text-muted-foreground hover:bg-muted/50",
                  )}
                >
                  <p className={cn("text-xs font-bold", aiAutonomyLevel === opt.value ? "text-primary" : "")}>
                    {opt.label}
                  </p>
                  <p className="text-[11px] mt-0.5 leading-tight">{opt.description}</p>
                </button>
              ))}
            </div>
          </div>
        </Section>

        {/* ── Section 7: Library Mode (Phase 28.5) ─────────────────────────── */}
        <Section
          icon={<Library className="h-5 w-5" />}
          title="Rule & Script Libraries"
          description="Pick which slice of the rule and script library this server uses. Switching modes is non-destructive — private rules/scripts stay in the database; they just become inactive in Global-only mode and reactivate when you switch back."
        >
          <div className="space-y-4">
            <LibraryModeSelect
              label="Rule library"
              value={ruleLibraryMode}
              onChange={setRuleLibraryMode}
            />
            <LibraryModeSelect
              label="Script library"
              value={scriptLibraryMode}
              onChange={setScriptLibraryMode}
            />
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Manage this server&apos;s private rules and scripts from the{" "}
              <Link href={`/servers/${id}#rules`} className="text-primary hover:underline font-medium">
                Rules
              </Link>{" "}
              and{" "}
              <Link href={`/servers/${id}#scripts`} className="text-primary hover:underline font-medium">
                Scripts
              </Link>{" "}
              tabs on the server detail page.
            </p>
          </div>
        </Section>

        {/* ── Section 8: Credentials ───────────────────────────────────────── */}
        <Section
          icon={<KeyRound className="h-5 w-5" />}
          title="Stored Credentials"
          description="The credential used by the scheduler for SSH or WinRM connections. Changing this rotates the stored encrypted secret immediately. The old credential is discarded."
        >
          <label className="flex items-center gap-3 cursor-pointer group">
            <div
              onClick={() => setChangeCredential((v) => !v)}
              className={cn(
                "h-5 w-9 rounded-full border-2 transition-colors relative cursor-pointer",
                changeCredential
                  ? "bg-primary border-primary"
                  : "bg-muted border-border",
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 h-3 w-3 rounded-full bg-background shadow transition-transform",
                  changeCredential ? "translate-x-4" : "translate-x-0.5",
                )}
              />
            </div>
            <span className="text-sm font-medium select-none">
              Change stored credential
            </span>
          </label>

          {changeCredential && (
            <div className="grid grid-cols-2 gap-4 mt-2">
              <Field
                label="New Username"
                hint="Leave blank to keep current username"
              >
                <Input
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  autoComplete="username"
                />
              </Field>
              <Field label="New Password" hint="Type a Strong Password">
                <Input
                  type="password"
                  value={newSecret}
                  onChange={(e) => setNewSecret(e.target.value)}
                  autoComplete="new-password"
                />
              </Field>
            </div>
          )}
        </Section>

        {/* ── Section 9: Security Challenge ────────────────────────────────── */}
        <Section
          icon={<ShieldAlert className="h-5 w-5 text-amber-400" />}
          title="Security Challenge"
          accent="amber"
          description="Every change to this server requires the current credential password as confirmation. This prevents accidental or unauthorized modifications."
        >
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              {error}
            </div>
          )}
          <Field label="Current Password (required to save)">
            <Input
              type="password"
              value={currentSecret}
              onChange={(e) => setCurrentSecret(e.target.value)}
              placeholder="Enter the current server credential password"
              autoComplete="current-password"
              className="h-10"
            />
          </Field>
        </Section>

        {/* ── Bottom action bar ────────────────────────────────────────────── */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
          <Link href={`/servers/${id}`}>
            <Button variant="outline">Cancel</Button>
          </Link>
          <Button
            onClick={handleSave}
            disabled={updateServer.isPending}
            className="gap-1.5"
          >
            <Save className="h-4 w-4" />
            {updateServer.isPending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>
    </AppShell>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function Section({
  icon,
  title,
  description,
  accent,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  accent?: "amber";
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "mt-0.5 p-2 rounded-lg",
            accent === "amber"
              ? "bg-amber-500/10 text-amber-400"
              : "bg-muted text-muted-foreground",
          )}
        >
          {icon}
        </div>
        <div>
          <h2 className="text-base font-bold">{title}</h2>
          <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed max-w-2xl">
            {description}
          </p>
        </div>
      </div>
      <div
        className={cn(
          "rounded-xl border p-5 space-y-4",
          accent === "amber"
            ? "border-amber-500/20 bg-amber-500/5"
            : "border-border bg-card/30",
        )}
      >
        {children}
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div>
        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
          {label}
        </label>
        {hint && (
          <span className="text-[10px] text-muted-foreground/70">{hint}</span>
        )}
      </div>
      {children}
    </div>
  );
}

// Phase 28.5 — 3-tier library mode segmented control. Same visual language as
// the AI Autonomy selector so the edit page reads consistently.
function LibraryModeSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: "global" | "server" | "both";
  onChange: (v: "global" | "server" | "both") => void;
}) {
  const OPTIONS = [
    { value: "global" as const, label: "Global only", description: "Curated 55 rules / 23 scripts (default)" },
    { value: "server" as const, label: "Server-only", description: "Only this server's private library" },
    { value: "both" as const,   label: "Both",        description: "Global library + this server's private additions" },
  ];
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
        {label}
      </label>
      <div className="flex rounded-xl overflow-hidden border border-border">
        {OPTIONS.map((opt, i) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "flex-1 px-3 py-3 text-left transition-colors",
              i === 0 ? "" : "border-l border-border",
              value === opt.value
                ? "bg-primary/10 text-foreground"
                : "bg-card/50 text-muted-foreground hover:bg-muted/50",
            )}
          >
            <p className={cn("text-xs font-bold", value === opt.value ? "text-primary" : "")}>
              {opt.label}
            </p>
            <p className="text-[11px] mt-0.5 leading-tight">{opt.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function ReadOnlyCard({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card/50 p-3 space-y-1">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="text-sm font-semibold font-mono">{value}</p>
      <p className="text-[10px] text-muted-foreground leading-relaxed">
        {note}
      </p>
    </div>
  );
}

function Tip({ variant, text }: { variant: "raise" | "lower"; text: string }) {
  const isRaise = variant === "raise";
  return (
    <div
      className={cn(
        "rounded-lg p-3 text-xs leading-relaxed",
        isRaise
          ? "bg-blue-500/8 border border-blue-500/20 text-blue-400/80"
          : "bg-green-500/8 border border-green-500/20 text-green-400/80",
      )}
    >
      <span className="font-bold block mb-0.5">
        {isRaise ? "↑ Raise when:" : "↓ Lower when:"}
      </span>
      {text}
    </div>
  );
}
