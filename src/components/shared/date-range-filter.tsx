"use client";

import { useState, useEffect, useRef } from "react";
import { Calendar, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Shared date+time range filter.
 *
 * Two modes, in one tiny popover:
 *   - Presets (Last 1h / 24h / 7d / 30d / All time) — fire instantly on click
 *   - Custom: two `datetime-local` inputs + Apply / Clear — only refetches on Apply
 *
 * `value` is the *applied* range (ISO strings, UTC). The component reports a new
 * value to `onChange` only when (a) a preset is clicked, or (b) the user clicks
 * Apply on a custom range. The parent owns the filter state.
 */
export interface DateRange {
  from?: string | null;  // ISO string, UTC, e.g. "2026-05-15T13:00:00.000Z"
  to?: string | null;
}

interface Preset {
  key: string;
  label: string;
  hours: number | null;   // null = All time
}

const PRESETS: Preset[] = [
  { key: "1h",  label: "Last 1h",  hours: 1 },
  { key: "24h", label: "Last 24h", hours: 24 },
  { key: "7d",  label: "Last 7 days",  hours: 24 * 7 },
  { key: "30d", label: "Last 30 days", hours: 24 * 30 },
  { key: "all", label: "All time", hours: null },
];

// Converts an ISO string to the local-time format that `datetime-local` inputs expect:
// "YYYY-MM-DDTHH:MM" (no seconds, no timezone). Returns "" for null/undefined.
function isoToLocalInput(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// "2026-05-15T13:00" (local) → ISO UTC string. Returns null for "".
function localInputToIso(local: string): string | null {
  if (!local) return null;
  const d = new Date(local);  // parsed as local time
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function rangeLabel(value: DateRange): string {
  if (!value.from && !value.to) return "Any time";
  // Try matching a known preset by comparing the from-offset
  if (value.from && !value.to) {
    const fromMs = new Date(value.from).getTime();
    const nowMs = Date.now();
    const deltaH = (nowMs - fromMs) / 3_600_000;
    const matched = PRESETS.find((p) => p.hours != null && Math.abs(p.hours - deltaH) < 0.5);
    if (matched) return matched.label;
  }
  // Custom range — show short summary
  const fmt = (iso: string) =>
    new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  if (value.from && value.to) return `${fmt(value.from)} → ${fmt(value.to)}`;
  if (value.from) return `From ${fmt(value.from)}`;
  if (value.to) return `Until ${fmt(value.to)}`;
  return "Any time";
}

export function DateRangeFilter({
  value,
  onChange,
  className,
}: {
  value: DateRange;
  onChange: (next: DateRange) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [customFrom, setCustomFrom] = useState<string>(isoToLocalInput(value.from));
  const [customTo, setCustomTo] = useState<string>(isoToLocalInput(value.to));
  const popoverRef = useRef<HTMLDivElement>(null);

  // Reset draft inputs when the applied value changes externally (e.g. parent clears)
  useEffect(() => {
    setCustomFrom(isoToLocalInput(value.from));
    setCustomTo(isoToLocalInput(value.to));
  }, [value.from, value.to]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const handlePreset = (p: Preset) => {
    if (p.hours == null) {
      onChange({ from: null, to: null });
    } else {
      const from = new Date(Date.now() - p.hours * 3_600_000).toISOString();
      onChange({ from, to: null });
    }
    setOpen(false);
  };

  const handleApply = () => {
    onChange({
      from: localInputToIso(customFrom),
      to: localInputToIso(customTo),
    });
    setOpen(false);
  };

  const handleClear = () => {
    setCustomFrom("");
    setCustomTo("");
    onChange({ from: null, to: null });
    setOpen(false);
  };

  const isActive = !!(value.from || value.to);

  return (
    <div ref={popoverRef} className={cn("relative inline-block", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "h-8 inline-flex items-center gap-1.5 px-2.5 text-xs font-semibold rounded-lg border transition-colors",
          isActive
            ? "border-primary/40 bg-primary/10 text-primary"
            : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        <Calendar className="h-3 w-3" />
        <span className="truncate max-w-[180px]">{rangeLabel(value)}</span>
        {isActive && (
          <span
            role="button"
            aria-label="Clear date filter"
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
            }}
            className="ml-0.5 h-3.5 w-3.5 inline-flex items-center justify-center rounded hover:bg-primary/20"
          >
            <X className="h-3 w-3" />
          </span>
        )}
      </button>

      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 w-72 rounded-xl border border-border bg-popover shadow-lg p-2 space-y-2">
          {/* Presets */}
          <div className="space-y-0.5">
            {PRESETS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => handlePreset(p)}
                className="w-full text-left px-2.5 py-1.5 text-xs font-medium rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="border-t border-border pt-2 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1">
              Custom range
            </p>
            <div className="space-y-1.5">
              <label className="block">
                <span className="text-[10px] text-muted-foreground block mb-0.5">From</span>
                <input
                  type="datetime-local"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="w-full px-2 py-1 rounded-md bg-background border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary/20 outline-none text-xs"
                />
              </label>
              <label className="block">
                <span className="text-[10px] text-muted-foreground block mb-0.5">To</span>
                <input
                  type="datetime-local"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="w-full px-2 py-1 rounded-md bg-background border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary/20 outline-none text-xs"
                />
              </label>
            </div>
            <div className="flex items-center justify-end gap-1.5 pt-1">
              <button
                type="button"
                onClick={handleClear}
                className="px-2.5 py-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={handleApply}
                className="px-2.5 py-1 text-[11px] font-semibold rounded-md bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25 transition-colors"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
