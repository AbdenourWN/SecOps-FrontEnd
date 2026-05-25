"use client";

import Link from "next/link";
import {
  Bot,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  Server as ServerIcon,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  useAiActionsForSource,
  useApproveAiAction,
  useRejectAiAction,
} from "@/lib/hooks/use-ai-actions";
import type { AiActionStatus, AiPendingAction } from "@/lib/types";

const ACTION_LABELS: Record<string, string> = {
  dismiss_anomaly: "Dismiss Anomaly",
  promote_anomaly: "Promote Anomaly → Incident",
  mark_incident_false_positive: "Mark Incident False Positive",
  // Phase 28.4 — script-execution-review suggestions
  disable_script_for_server: "Disable Script for This Server",
  disable_rule_for_server: "Disable Rule for This Server",
  suggest_manual_remediation: "Replace Auto-fix with Manual Checklist",
  // Phase 28.5 — per-server library actions
  create_server_rule: "Create Server-Scoped Rule",
  create_server_script: "Create Server-Scoped Script",
  swap_remediation_script: "Swap Remediation Script for This Server",
};

// Friendly one-line explanation of what each action does when approved.
// Renders just under the title so the operator knows the blast radius
// without opening the inbox.
const ACTION_DESCRIPTIONS: Record<string, string> = {
  dismiss_anomaly:
    "Mark this anomaly as a false positive — it disappears from the active list.",
  promote_anomaly:
    "Convert this anomaly into a real incident so it follows the normal triage workflow.",
  mark_incident_false_positive:
    "Close this incident as a false positive and stop the AI loop on it.",
  disable_script_for_server:
    "Stop running this remediation script on this server (other servers unaffected).",
  disable_rule_for_server:
    "Stop firing this rule on this server (other servers unaffected).",
  suggest_manual_remediation:
    "Replace automation with an operator checklist of commands to run by hand.",
  create_server_rule:
    "Insert a new private detection rule scoped to this server only.",
  create_server_script:
    "Insert a new private remediation script scoped to this server only.",
  swap_remediation_script:
    "Add a server-scoped replacement script that overrides the global one by name.",
};

function StatusBadge({ status }: { status: AiActionStatus }) {
  if (status === "pending")
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20">
        <Clock className="h-3 w-3" /> Pending
      </span>
    );
  if (status === "approved")
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
        <CheckCircle2 className="h-3 w-3" /> Approved
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/20">
      <XCircle className="h-3 w-3" /> Rejected
    </span>
  );
}

// Payload fields that are mostly noise on this surface — they're already
// implied by the page the operator is on (source_id == this page's id) or
// reproduced in the audit metadata.
const HIDDEN_PAYLOAD_KEYS = new Set([
  "reason",
  "ai_analysis_id",
  "automation_log_id",
  "incident_id",
  "anomaly_id",
  "server_id",
]);

function ActionRow({ action }: { action: AiPendingAction }) {
  const approve = useApproveAiAction();
  const reject = useRejectAiAction();
  const isPending = action.status === "pending";

  const reason = (action.payload?.reason as string | undefined) ?? "";
  const description = ACTION_DESCRIPTIONS[action.action_type];
  const isLibraryAction =
    action.action_type === "create_server_rule" ||
    action.action_type === "create_server_script" ||
    action.action_type === "swap_remediation_script";

  const handleApprove = async () => {
    try {
      await approve.mutateAsync(action._id);
      toast.success("Action approved and executed");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleReject = async () => {
    try {
      await reject.mutateAsync(action._id);
      toast.success("Action rejected");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  // Filter the payload entries the user actually needs to see.
  const visiblePayload = Object.entries(action.payload).filter(
    ([k, v]) =>
      !HIDDEN_PAYLOAD_KEYS.has(k) &&
      v !== null &&
      v !== undefined &&
      !(typeof v === "string" && v.trim() === "") &&
      !(Array.isArray(v) && v.length === 0),
  );

  return (
    <div
      className={cn(
        "rounded-lg border p-3.5 space-y-2.5",
        isPending ? "border-amber-500/20 bg-amber-500/5" : "border-border bg-card/50",
      )}
    >
      {/* Header — title, status, and decision timestamp */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold">
              {ACTION_LABELS[action.action_type] ?? action.action_type}
            </span>
            <StatusBadge status={action.status} />
          </div>
          {description && (
            <p className="text-[11px] text-foreground/80 leading-relaxed">
              {description}
            </p>
          )}
        </div>
        <div className="text-right shrink-0 leading-tight">
          {action.decided_at ? (
            <>
              <p className="text-[10px] font-semibold text-foreground">
                {new Date(action.decided_at).toLocaleString()}
              </p>
              <p className="text-[9px] text-muted-foreground/70">
                decided · created {new Date(action.created_at).toLocaleString()}
              </p>
            </>
          ) : (
            <p className="text-[10px] text-muted-foreground">
              {new Date(action.created_at).toLocaleString()}
            </p>
          )}
        </div>
      </div>

      {/* Why — the LLM's reason for proposing the action */}
      {reason && (
        <div className="rounded-md bg-background/40 border border-border/60 px-2.5 py-1.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">
            Why
          </p>
          <p className="text-[11px] text-foreground/85 leading-relaxed">
            {reason}
          </p>
        </div>
      )}

      {/* Payload — same renderer as /ai-actions ActionCard, scoped down */}
      {visiblePayload.length > 0 && (
        <div className="rounded-md bg-muted/30 border border-border px-2.5 py-2 text-[11px] font-mono space-y-1">
          {visiblePayload.map(([k, v]) => {
            // Phase 28.4 — manual_commands array gets a dedicated nested list
            if (k === "manual_commands" && Array.isArray(v)) {
              return (
                <div key={k}>
                  <span className="text-muted-foreground">{k}:</span>
                  <ul className="mt-1 space-y-1 pl-2 border-l border-border/60">
                    {(v as Array<{ command?: string; purpose?: string }>).map(
                      (mc, i) => (
                        <li key={i} className="space-y-0.5">
                          <code className="text-violet-300 break-all">
                            {mc.command || "(no command)"}
                          </code>
                          {mc.purpose && (
                            <div className="text-[10px] text-muted-foreground font-sans">
                              {mc.purpose}
                            </div>
                          )}
                        </li>
                      ),
                    )}
                  </ul>
                </div>
              );
            }
            // Phase 28.5 — long script bodies / regex patterns get a code block
            if (
              (k === "content" || k === "new_script_content" || k === "pattern") &&
              typeof v === "string" &&
              v.length > 0
            ) {
              return (
                <div key={k}>
                  <span className="text-muted-foreground">{k}:</span>
                  <pre className="mt-1 max-h-60 overflow-auto rounded-md bg-zinc-950 border border-border/60 p-2 text-[11px] text-zinc-200 whitespace-pre-wrap break-all">
                    {String(v)}
                  </pre>
                </div>
              );
            }
            if (Array.isArray(v) && v.every((x) => typeof x === "string")) {
              return (
                <div key={k}>
                  <span className="text-muted-foreground">{k}:</span>{" "}
                  <span className="text-foreground">
                    {(v as string[]).join(", ") || "—"}
                  </span>
                </div>
              );
            }
            if (typeof v === "object" && v !== null) {
              return (
                <div key={k}>
                  <span className="text-muted-foreground">{k}:</span>{" "}
                  <span className="text-foreground break-all">
                    {JSON.stringify(v)}
                  </span>
                </div>
              );
            }
            return (
              <div key={k}>
                <span className="text-muted-foreground">{k}:</span>{" "}
                <span className="text-foreground">{String(v)}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Phase 28.5 — auto-flip side-effect notice for library actions */}
      {isLibraryAction && (
        <div className="text-[11px] text-blue-300/85 bg-blue-500/5 border border-blue-500/20 rounded-md px-2.5 py-1.5 leading-relaxed">
          Approving inserts this into the server&apos;s private library. If the
          server&apos;s library mode is still <b>Global only</b>, it will flip to{" "}
          <b>Both</b> automatically so the new entry takes effect.
        </div>
      )}

      {/* Server link — keeps a one-click jump to the server detail */}
      {action.server_id && (
        <div className="flex items-center gap-3 text-[11px]">
          <Link
            href={`/servers/${action.server_id}`}
            className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ServerIcon className="h-3 w-3" />
            {action.server_hostname || action.server_id.slice(-8)}
          </Link>
          <Link
            href={`/ai-actions?source_type=${action.source_type ?? ""}&source_id=${action.source_id ?? ""}`}
            className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors ml-auto"
          >
            Open in inbox
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      )}

      {isPending ? (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleApprove}
            disabled={approve.isPending || reject.isPending}
            className="gap-1.5 bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30 text-xs"
            variant="ghost"
          >
            <Check className="h-3 w-3" />
            Approve &amp; Execute
          </Button>
          <Button
            size="sm"
            onClick={handleReject}
            disabled={approve.isPending || reject.isPending}
            className="gap-1.5 text-red-400 hover:bg-red-500/10 border border-red-500/20 text-xs"
            variant="ghost"
          >
            <X className="h-3 w-3" />
            Reject
          </Button>
        </div>
      ) : (
        <p className="text-[11px] text-muted-foreground">
          {action.status === "approved" ? "Approved" : "Rejected"} by{" "}
          <span className="font-medium">{action.decided_by ?? "operator"}</span>
          {action.decided_at ? ` · ${new Date(action.decided_at).toLocaleString()}` : ""}
        </p>
      )}
    </div>
  );
}

/**
 * Embeddable AI-actions list scoped to a single incident or anomaly.
 *
 * Renders nothing if there are no actions yet (the section should disappear
 * for read_only servers or before the agent has proposed anything).
 */
export function AiActionsForSource({
  sourceType,
  sourceId,
  serverId,
}: {
  sourceType: "incident" | "anomaly" | "automation_log" | "server";
  sourceId: string;
  serverId?: string;
}) {
  const { data, isLoading } = useAiActionsForSource(sourceType, sourceId, serverId);
  const actions = data?.results ?? [];

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="h-4 w-40 bg-muted rounded animate-pulse" />
        <div className="mt-3 space-y-2">
          {[0, 1].map((i) => (
            <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (actions.length === 0) return null;

  const pendingCount = actions.filter((a) => a.status === "pending").length;

  return (
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5 space-y-3">
      <div className="flex items-center gap-2">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <Bot className="h-3.5 w-3.5 text-amber-400" />
          AI Status-Change Suggestions
        </h3>
        {pendingCount > 0 && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/20">
            {pendingCount} pending
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        The AI agent is proposing one or more status changes for this {sourceType}.
        Nothing happens until you approve.
      </p>
      <div className="space-y-2">
        {actions.map((action) => (
          <ActionRow key={action._id} action={action} />
        ))}
      </div>
    </div>
  );
}
