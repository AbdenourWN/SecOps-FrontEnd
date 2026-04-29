"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type Unit = "minutes" | "hours" | "days" | "weeks" | "months";

const UNIT_TO_MIN: Record<Unit, number> = {
  minutes: 1,
  hours: 60,
  days: 60 * 24,
  weeks: 60 * 24 * 7,
  months: 60 * 24 * 30,    // treat 1 month = 30 days
};

const UNIT_LABEL: Record<Unit, string> = {
  minutes: "Minutes",
  hours: "Hours",
  days: "Days",
  weeks: "Weeks",
  months: "Months",
};

const UNIT_MAX: Record<Unit, number> = {
  minutes: 525_600,        // 1 year
  hours: 8760,
  days: 365,
  weeks: 52,
  months: 12,
};

/**
 * Picks the largest unit that divides minutes evenly so the user sees
 * "2 hours" rather than "120 minutes" when round-tripped.
 */
function minutesToValueUnit(min: number): { value: number; unit: Unit } {
  if (min === 0) return { value: 0, unit: "hours" };
  for (const u of ["months", "weeks", "days", "hours", "minutes"] as Unit[]) {
    const f = UNIT_TO_MIN[u];
    if (min % f === 0) return { value: min / f, unit: u };
  }
  return { value: min, unit: "minutes" };
}

interface Props {
  /** Current value in minutes. 0 = skip warmup. */
  valueMinutes: number;
  onChange: (minutes: number) => void;
  /** Hide the "skip" toggle. Default: shown. */
  hideSkipToggle?: boolean;
  className?: string;
}

export function WarmupDurationPicker({
  valueMinutes,
  onChange,
  hideSkipToggle = false,
  className,
}: Props) {
  const [{ value, unit }, setLocal] = useState(() =>
    minutesToValueUnit(Math.max(0, valueMinutes)),
  );

  // Sync local state when parent value changes (e.g. dialog re-opens)
  useEffect(() => {
    setLocal(minutesToValueUnit(Math.max(0, valueMinutes)));
  }, [valueMinutes]);

  const skipped = valueMinutes === 0;

  const emit = (v: number, u: Unit) => {
    const minutes = Math.max(0, Math.min(UNIT_MAX[u] * UNIT_TO_MIN[u], v * UNIT_TO_MIN[u]));
    onChange(minutes);
  };

  const setValue = (v: number) => {
    const safe = Math.max(0, Math.min(UNIT_MAX[unit], Math.floor(v)));
    setLocal({ value: safe, unit });
    emit(safe, unit);
  };

  const setUnit = (u: Unit) => {
    setLocal({ value, unit: u });
    emit(value, u);
  };

  const toggleSkip = () => {
    if (skipped) {
      // restore default 1 hour
      setLocal({ value: 1, unit: "hours" });
      onChange(60);
    } else {
      onChange(0);
    }
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Input
        type="number"
        min={0}
        max={UNIT_MAX[unit]}
        value={skipped ? 0 : value}
        disabled={skipped}
        onChange={(e) => setValue(Number(e.target.value))}
        className="w-24 disabled:opacity-50"
      />
      <Select
        value={unit}
        onValueChange={(v) => v && setUnit(v as Unit)}
      >
        <SelectTrigger className="w-32">
          <span className="text-sm" data-slot="select-value">
            {UNIT_LABEL[unit]}
          </span>
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(UNIT_LABEL) as Unit[]).map((u) => (
            <SelectItem key={u} value={u}>
              {UNIT_LABEL[u]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {!hideSkipToggle && (
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer ml-1">
          <input
            type="checkbox"
            checked={skipped}
            onChange={toggleSkip}
          />
          <span>Skip warm-up</span>
        </label>
      )}
    </div>
  );
}

/** Format minutes as a human-readable string for display. */
export function formatMinutes(min: number): string {
  if (min === 0) return "skipped";
  const { value, unit } = minutesToValueUnit(min);
  const label = value === 1 ? UNIT_LABEL[unit].slice(0, -1) : UNIT_LABEL[unit];
  return `${value} ${label.toLowerCase()}`;
}
