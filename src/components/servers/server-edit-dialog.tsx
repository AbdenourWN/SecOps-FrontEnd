"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useResetBaseline,
  useResetWarmup,
  useUpdateServer,
} from "@/lib/hooks/use-servers";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AlertTriangle, ChevronDown, ChevronUp, RotateCcw, Settings2 } from "lucide-react";
import type { ServerResponse } from "@/lib/types";
import { WarmupDurationPicker, formatMinutes } from "@/components/servers/warmup-duration-picker";

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const IP_RE = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]; // ISO 1..7

const DETECTION_FIELDS: { key: string; label: string; min: number; max: number; step: number; description: string }[] = [
  { key: "verification_window_minutes", label: "Verification window (min)", min: 1, max: 120, step: 1,
    description: "How long to watch for recurrence after a script runs. Raise for critical servers; lower for noisy ones." },
  { key: "max_remediation_attempts", label: "Max remediation attempts", min: 1, max: 10, step: 1,
    description: "Retries before escalating to a human. Lower = faster escalation." },
  { key: "incident_lookback_minutes", label: "Dedup lookback (min)", min: 5, max: 1440, step: 5,
    description: "How far back to look for an existing incident when deduplicating triggers." },
  { key: "recurrence_streak_threshold", label: "Recurrence streak threshold", min: 2, max: 20, step: 1,
    description: "Consecutive 'fix → problem recurs' cycles before pausing automation and alerting." },
  { key: "recurrence_lookback_hours", label: "Recurrence lookback (hours)", min: 0.25, max: 24, step: 0.25,
    description: "How recent a previous resolution must be to count as part of the recurrence chain." },
  { key: "volume_spike_multiplier", label: "Volume spike multiplier", min: 2, max: 100, step: 0.5,
    description: "Log rate must exceed this multiple of the baseline EMA to trigger a volume anomaly." },
];

const DETECTION_DEFAULTS: Record<string, number> = {
  verification_window_minutes: 10,
  max_remediation_attempts: 3,
  incident_lookback_minutes: 30,
  recurrence_streak_threshold: 3,
  recurrence_lookback_hours: 2,
  volume_spike_multiplier: 10,
};

interface EditServerDialogProps {
  server: ServerResponse;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditServerDialog({ server, open, onOpenChange }: EditServerDialogProps) {
  const [hostname, setHostname] = useState(server.hostname);
  const [ipAddress, setIpAddress] = useState(server.ip_address);
  const [osType, setOsType] = useState<"linux" | "windows">(server.os_type);
  const [port, setPort] = useState<string>(server.port?.toString() ?? "");

  const [bhStart, setBhStart] = useState(server.business_hours?.start ?? "09:00");
  const [bhEnd, setBhEnd] = useState(server.business_hours?.end ?? "18:00");
  const [bhTz, setBhTz] = useState(server.business_hours?.tz ?? "UTC");
  const [bhDays, setBhDays] = useState<number[]>(
    server.business_hours?.days ?? [1, 2, 3, 4, 5]
  );

  const [changeCredential, setChangeCredential] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newSecret, setNewSecret] = useState("");

  const [currentSecret, setCurrentSecret] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Restart-warmup duration picker (default 1h)
  const [warmupMinutes, setWarmupMinutes] = useState(60);
  const [detectionOpen, setDetectionOpen] = useState(false);
  const [detectionConfig, setDetectionConfig] = useState<Record<string, number>>(
    { ...DETECTION_DEFAULTS, ...(server.detection_config ?? {}) }
  );

  const updateServer = useUpdateServer();
  const resetWarmup = useResetWarmup();
  const resetBaseline = useResetBaseline();

  // Re-sync local state when a different server is opened
  useEffect(() => {
    if (open) {
      setHostname(server.hostname);
      setIpAddress(server.ip_address);
      setOsType(server.os_type);
      setPort(server.port?.toString() ?? "");
      setBhStart(server.business_hours?.start ?? "09:00");
      setBhEnd(server.business_hours?.end ?? "18:00");
      setBhTz(server.business_hours?.tz ?? "UTC");
      setBhDays(server.business_hours?.days ?? [1, 2, 3, 4, 5]);
      setDetectionConfig({ ...DETECTION_DEFAULTS, ...(server.detection_config ?? {}) });
      setDetectionOpen(false);
      setChangeCredential(false);
      setNewUsername("");
      setNewSecret("");
      setCurrentSecret("");
      setError(null);
      setWarmupMinutes(60);
    }
  }, [open, server]);

  const toggleDay = (d: number) => {
    setBhDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()
    );
  };

  const handleSave = async () => {
    setError(null);

    if (!hostname.trim()) return setError("Hostname is required");
    if (!IP_RE.test(ipAddress)) return setError("Invalid IP address");
    if (!TIME_RE.test(bhStart) || !TIME_RE.test(bhEnd))
      return setError("Business hours must be HH:MM (24h)");
    if (bhDays.length === 0) return setError("Pick at least one business day");
    if (!currentSecret) return setError("Current password is required to save changes");
    if (changeCredential && !newSecret) return setError("New password cannot be empty");

    try {
      await updateServer.mutateAsync({
        id: server._id,
        data: {
          hostname,
          ip_address: ipAddress,
          os_type: osType,
          port: port ? Number(port) : undefined,
          business_hours: {
            start: bhStart,
            end: bhEnd,
            days: bhDays,
            tz: bhTz,
          },
          detection_config: detectionConfig,
          credential: changeCredential
            ? {
                username: newUsername || undefined,
                secret: newSecret,
              }
            : undefined,
          current_secret: currentSecret,
        },
      });
      toast.success("Server updated");
      onOpenChange(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to update";
      setError(msg);
      toast.error(msg);
    }
  };

  const handleResetWarmup = async () => {
    try {
      await resetWarmup.mutateAsync({
        id: server._id,
        body: { warmup_minutes: warmupMinutes, clear_known_patterns: true },
      });
      toast.success(`Pattern warm-up restarted (${formatMinutes(warmupMinutes)})`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  };

  const handleResetBaseline = async () => {
    try {
      await resetBaseline.mutateAsync(server._id);
      toast.success("Log rate baseline reset");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit server — {server.hostname}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Identity */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Hostname">
              <Input value={hostname} onChange={(e) => setHostname(e.target.value)} />
            </Field>
            <Field label="IP Address">
              <Input value={ipAddress} onChange={(e) => setIpAddress(e.target.value)} />
            </Field>
            <Field label="OS Type">
              <Select value={osType} onValueChange={(v) => v && setOsType(v as "linux" | "windows")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="linux">Linux</SelectItem>
                  <SelectItem value="windows">Windows</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Port">
              <Input
                value={port}
                onChange={(e) => setPort(e.target.value)}
                placeholder="22 / 5985"
              />
            </Field>
          </div>

          {/* Business hours */}
          <div className="border border-border rounded-lg p-3 space-y-3">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Business hours (time-of-day heuristic)
            </p>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Start">
                <Input value={bhStart} onChange={(e) => setBhStart(e.target.value)} />
              </Field>
              <Field label="End">
                <Input value={bhEnd} onChange={(e) => setBhEnd(e.target.value)} />
              </Field>
              <Field label="Timezone">
                <Input value={bhTz} onChange={(e) => setBhTz(e.target.value)} />
              </Field>
            </div>
            <div className="flex items-center gap-1">
              {DAY_NAMES.map((name, idx) => {
                const day = idx + 1;
                const active = bhDays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={cn(
                      "h-7 w-9 text-[11px] font-semibold rounded-md border transition-all",
                      active
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card text-muted-foreground border-border hover:text-foreground"
                    )}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Anomaly state — read-only display + reset buttons */}
          <div className="border border-border rounded-lg p-3 space-y-3">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Anomaly state
            </p>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <ReadOnlyRow
                label="Pattern warm-up until"
                value={
                  server.pattern_warmup_until
                    ? new Date(server.pattern_warmup_until).toLocaleString()
                    : "—"
                }
              />
              <ReadOnlyRow
                label="Log rate baseline (logs/min)"
                value={
                  server.log_rate_baseline != null
                    ? server.log_rate_baseline.toFixed(2)
                    : "—"
                }
              />
            </div>

            {/* Warm-up restart with configurable duration */}
            <div className="space-y-2 pt-1">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Restart warm-up — pick duration
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <WarmupDurationPicker
                  valueMinutes={warmupMinutes}
                  onChange={setWarmupMinutes}
                />
                <button
                  type="button"
                  onClick={handleResetWarmup}
                  disabled={resetWarmup.isPending}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold rounded-md border border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/10 disabled:opacity-50 transition-colors"
                >
                  <RotateCcw className="h-3 w-3" />
                  Restart warm-up
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Wipes the seen-patterns set and starts a new warm-up window of
                the chosen length. During warm-up, novel patterns are silently
                recorded but not flagged.
              </p>
            </div>

            {/* Baseline reset */}
            <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-border/40">
              <button
                type="button"
                onClick={handleResetBaseline}
                disabled={resetBaseline.isPending}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold rounded-md border border-border hover:bg-muted disabled:opacity-50 transition-colors"
              >
                <RotateCcw className="h-3 w-3" />
                Reset log-rate baseline
              </button>
              <p className="text-[10px] text-muted-foreground">
                Forces the EMA back to 0 — next telemetry tick learns fresh.
              </p>
            </div>

            <p className="text-[10px] text-muted-foreground italic">
              These maintenance actions take effect immediately and do not
              require the current password.
            </p>
          </div>

          {/* Advanced Detection Tuning */}
          <div className="border border-muted rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setDetectionOpen((v) => !v)}
              className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/50 transition-colors text-sm font-semibold"
            >
              <span className="flex items-center gap-2">
                <Settings2 className="h-3.5 w-3.5 text-muted-foreground" />
                Advanced Detection Tuning
              </span>
              {detectionOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {detectionOpen && (
              <div className="p-3 space-y-3 bg-card">
                {DETECTION_FIELDS.map((f) => (
                  <div key={f.key} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium">{f.label}</label>
                      <span className="text-xs text-muted-foreground font-mono">{detectionConfig[f.key]}</span>
                    </div>
                    <input
                      type="range"
                      min={f.min}
                      max={f.max}
                      step={f.step}
                      value={detectionConfig[f.key]}
                      onChange={(e) => setDetectionConfig((prev) => ({ ...prev, [f.key]: Number(e.target.value) }))}
                      className="w-full accent-primary"
                    />
                    <p className="text-[10px] text-muted-foreground leading-relaxed">{f.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Optional credential change */}
          <div className="border border-border rounded-lg p-3 space-y-3">
            <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={changeCredential}
                onChange={(e) => setChangeCredential(e.target.checked)}
              />
              Change stored credential
            </label>
            {changeCredential && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="New username (optional)">
                  <Input value={newUsername} onChange={(e) => setNewUsername(e.target.value)} />
                </Field>
                <Field label="New password">
                  <Input
                    type="password"
                    value={newSecret}
                    onChange={(e) => setNewSecret(e.target.value)}
                  />
                </Field>
              </div>
            )}
          </div>

          {/* Security challenge */}
          <div className="border border-amber-500/30 bg-amber-500/5 rounded-lg p-3 space-y-2">
            <p className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="h-3 w-3" />
              Security challenge
            </p>
            <Field label="Current password (required)">
              <Input
                type="password"
                value={currentSecret}
                onChange={(e) => setCurrentSecret(e.target.value)}
                placeholder="Enter the current server password"
              />
            </Field>
          </div>

          {error && (
            <div className="text-xs text-red-400 flex items-start gap-1.5">
              <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex items-center gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={updateServer.isPending}>
              {updateServer.isPending ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
        {label}
      </label>
      {children}
    </div>
  );
}

function ReadOnlyRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
        {label}
      </p>
      <p className="text-sm font-mono mt-0.5">{value}</p>
    </div>
  );
}
