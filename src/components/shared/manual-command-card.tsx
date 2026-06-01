"use client";

import { useState } from "react";
import { CheckCircle2, ClipboardCopy } from "lucide-react";
import { cn } from "@/lib/utils";
import { RISK_STYLES as RISK_PILL } from "@/lib/constants";

/**
 * Manual diagnostic / remediation command card.
 *
 * Used in three places:
 *  - Incident detail page    — legacy 3-field shape `{ command, purpose, note }`
 *  - Anomaly detail page     — same legacy shape
 *  - Server overview tab     — extended shape with `expected_output` + `steps[]`
 *                              + risk/os pills
 *
 * The extended fields are all optional, so the legacy call sites keep working
 * unchanged after the extract.
 */

export interface ManualCommandCardProps {
  command: string;
  purpose: string;
  // Legacy incident/anomaly field — short one-line warning under the command
  note?: string;
  // New server-overview fields — none required, so legacy callers don't break
  expected_output?: string;
  steps?: string[];
  risk_level?: "low" | "medium" | "high";
  os_type?: "linux" | "windows";
}

export function ManualCommandCard({
  command,
  purpose,
  note,
  expected_output,
  steps,
  risk_level,
  os_type,
}: ManualCommandCardProps) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(command).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const hasRichBody = !!(expected_output || (steps && steps.length > 0));

  return (
    <div className="rounded-lg border border-violet-400/40 bg-background/50 p-3 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-0.5 flex-1">
          <p className="text-xs text-muted-foreground">{purpose}</p>
          <code className="block text-xs font-mono text-violet-300 break-all leading-relaxed">{command}</code>
        </div>
        <button
          onClick={handleCopy}
          className="shrink-0 flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors mt-0.5"
        >
          {copied ? (
            <>
              <CheckCircle2 className="h-3 w-3 text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <ClipboardCopy className="h-3 w-3" /> Copy
            </>
          )}
        </button>
      </div>

      {/* Legacy single-line note — preserved for incident/anomaly cards */}
      {note && (
        <p className="text-[10px] text-violet-400/70 font-medium">⚠ {note}</p>
      )}

      {/* Expected output — server overview only */}
      {expected_output && (
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Expected output
          </p>
          <pre className="text-[11px] font-mono text-foreground/80 bg-muted/40 border border-border/60 rounded px-2 py-1.5 whitespace-pre-wrap break-words">
            {expected_output}
          </pre>
        </div>
      )}

      {/* Step-by-step checklist — server overview only */}
      {steps && steps.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Steps
          </p>
          <ol className="list-decimal list-inside text-[11px] text-foreground/85 leading-relaxed space-y-0.5 pl-1">
            {steps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </div>
      )}

      {/* Risk + OS pills — only show when the extended shape is in use */}
      {hasRichBody && (risk_level || os_type) && (
        <div className="flex items-center gap-2 pt-0.5">
          {risk_level && (
            <span
              className={cn(
                "text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border",
                RISK_PILL[risk_level] ?? RISK_PILL.medium,
              )}
            >
              {risk_level} risk
            </span>
          )}
          {os_type && (
            <span className="text-[10px] font-bold uppercase text-muted-foreground">
              {os_type}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
