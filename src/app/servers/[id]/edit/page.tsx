"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  KeyRound,
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
  unit: string;
  min: number;
  max: number;
  step: number;
  default: number;
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
];

const DETECTION_DEFAULTS: Record<string, number> = Object.fromEntries(
  DETECTION_FIELDS.map((f) => [f.key, f.default]),
);

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
    Record<string, number>
  >({ ...DETECTION_DEFAULTS });

  const [changeCredential, setChangeCredential] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newSecret, setNewSecret] = useState("");
  const [currentSecret, setCurrentSecret] = useState("");

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
  }, [server]);

  const updateServer = useUpdateServer();
  const resetWarmup = useResetWarmup();
  const resetBaseline = useResetBaseline();

  const toggleDay = (d: number) =>
    setBhDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort(),
    );

  const setField = (key: string, value: number) =>
    setDetectionConfig((prev) => ({ ...prev, [key]: value }));

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
              const current = detectionConfig[field.key] ?? field.default;
              const isCustom = current !== field.default;
              const pct =
                ((current - field.min) / (field.max - field.min)) * 100;

              return (
                <div
                  key={field.key}
                  className={cn(
                    "rounded-xl border p-5 space-y-4 transition-colors",
                    isCustom
                      ? "border-primary/30 bg-primary/5"
                      : "border-border bg-card/50",
                  )}
                >
                  {/* Header row */}
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
                    {/* Numeric input for precise entry */}
                    <div className="flex items-center gap-2 shrink-0">
                      <input
                        type="number"
                        min={field.min}
                        max={field.max}
                        step={field.step}
                        value={current}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          if (!isNaN(v))
                            setField(
                              field.key,
                              Math.min(field.max, Math.max(field.min, v)),
                            );
                        }}
                        className="w-20 h-9 rounded-lg border border-border bg-background text-center text-sm font-bold tabular-nums focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                      />
                      <span className="text-xs text-muted-foreground w-12 shrink-0">
                        {field.unit}
                      </span>
                    </div>
                  </div>

                  {/* Slider */}
                  <div className="space-y-1.5">
                    <Slider
                      value={current}
                      onValueChange={(v) => setField(field.key, v)}
                      min={field.min}
                      max={field.max}
                      step={field.step}
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground tabular-nums">
                      <span>
                        {field.min} {field.unit}
                      </span>
                      <span className="font-semibold text-foreground">
                        {pct.toFixed(0)}% of range
                      </span>
                      <span>
                        {field.max} {field.unit}
                      </span>
                    </div>
                  </div>

                  {/* Descriptions */}
                  <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
                    <p>{field.summary}</p>
                    <p className="text-xs">{field.detail}</p>
                  </div>

                  {/* Raise / Lower tips */}
                  <div className="grid grid-cols-2 gap-3">
                    <Tip variant="raise" text={field.raiseTip} />
                    <Tip variant="lower" text={field.lowerTip} />
                  </div>

                  {/* Reset to default */}
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

        {/* ── Section 4: Anomaly State ─────────────────────────────────────── */}
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

        {/* ── Section 5: Credentials ───────────────────────────────────────── */}
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

        {/* ── Section 6: Security Challenge ────────────────────────────────── */}
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
