"use client";

import { AppShell } from "@/components/layout/app-shell";
import {
  useIncident,
  useUpdateIncidentStatus,
  useAiAnalysis,
} from "@/lib/hooks/use-incidents";
import {
  SeverityBadge,
  StatusBadge,
  timeAgo,
} from "@/components/shared/badges";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Brain,
  RefreshCw,
  Server,
  Clock,
  Shield,
  FileText,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { use } from "react";
import { toast } from "sonner";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { IncidentStatus } from "@/lib/types";

export default function IncidentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: incident, isLoading } = useIncident(id);
  const updateStatus = useUpdateIncidentStatus();
  const aiAnalysis = useAiAnalysis();

  const handleStatusChange = async (newStatus: IncidentStatus) => {
    try {
      await updateStatus.mutateAsync({ id, status: newStatus });
      toast.success(`Status updated to ${newStatus.replace("_", " ")}`);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleAiAnalysis = async () => {
    try {
      await aiAnalysis.mutateAsync(id);
      toast.success("AI analysis completed");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  if (isLoading) {
    return (
      <AppShell>
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-64 bg-muted rounded" />
          <div className="h-64 bg-muted rounded-xl" />
        </div>
      </AppShell>
    );
  }

  if (!incident) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-muted-foreground">Incident not found.</p>
          <Link
            href="/incidents"
            className="mt-4 text-sm text-primary hover:underline"
          >
            Back to incidents
          </Link>
        </div>
      </AppShell>
    );
  }

  const statuses: IncidentStatus[] = [
    "open",
    "verifying",
    "investigating",
    "resolved",
    "false_positive",
  ];

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link
            href="/incidents"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">Incident Detail</h1>
              <SeverityBadge severity={incident.severity} />
            </div>
            <p className="text-xs text-muted-foreground font-mono mt-1">
              ID: {incident._id}
            </p>
          </div>
        </div>

        {/* Automation skipped banner */}
        {incident.automation_skipped_reason && (
          <div className={cn(
            "flex items-start gap-3 rounded-xl border px-4 py-3 text-sm",
            incident.automation_skipped_reason === "script_disabled"
              ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
              : "bg-red-500/10 border-red-500/30 text-red-400"
          )}>
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <span className="font-semibold">
                {incident.automation_skipped_reason === "script_disabled"
                  ? "Automation skipped — linked script is disabled."
                  : "Automation skipped — linked script was deleted."}
              </span>
              <span className="ml-1 text-muted-foreground">
                {incident.automation_skipped_reason === "script_disabled"
                  ? "Alert was sent instead. Re-enable the script in the Automation page to restore auto-remediation."
                  : "Alert was sent instead. Link a new script to this rule to restore auto-remediation."}
              </span>
            </div>
          </div>
        )}

        {/* Remediation exhausted banner */}
        {incident.automation_failure_reason === "remediation_exhausted" && (
          <div className="flex items-start gap-3 rounded-xl border px-4 py-3 text-sm bg-red-500/10 border-red-500/30 text-red-400">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <span className="font-semibold">
                Auto-remediation exhausted — failed {incident.remediation_attempts ?? 0}× without resolving the issue.
              </span>
              <span className="ml-1 text-muted-foreground">
                The system has stopped retrying for this server + rule. Investigate manually, then resolve this incident to re-arm auto-remediation. If the linked script is the wrong fix for this server, disable it in the Automation page.
              </span>
            </div>
          </div>
        )}

        {/* Verifying banner */}
        {incident.status === "verifying" && incident.automation_failure_reason !== "remediation_exhausted" && (
          <div className="flex items-start gap-3 rounded-xl border px-4 py-3 text-sm bg-cyan-500/10 border-cyan-500/30 text-cyan-400">
            <RefreshCw className="h-4 w-4 mt-0.5 shrink-0 animate-spin" />
            <div>
              <span className="font-semibold">
                Verifying remediation
                {(incident.remediation_attempts ?? 0) > 1 && ` (attempt ${incident.remediation_attempts}/3)`}
                {" — "}
                {incident.verification_until
                  ? `auto-resolves at ${new Date(incident.verification_until).toLocaleTimeString()} unless the rule re-fires.`
                  : "auto-resolves when the verification window passes without recurrence."}
              </span>
              <span className="ml-1 text-muted-foreground">
                If the underlying problem persists, this incident will be retried (up to 3×) before escalating.
              </span>
            </div>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <FileText className="h-3.5 w-3.5" />
                Description
              </h3>
              <p className="text-sm leading-relaxed">{incident.description}</p>
            </div>

            {/* Context */}
            {incident.context && Object.keys(incident.context).length > 0 && (
              <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                  Context
                </h3>
                <div className="space-y-2">
                  {Object.entries(incident.context).map(([key, value]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between rounded-lg bg-muted/30 px-4 py-2.5"
                    >
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {key}
                      </span>
                      <span className="font-mono text-sm">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI Analysis */}
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Brain className="h-3.5 w-3.5" />
                  AI Analysis
                </h3>
                {!incident.ai_analysis && (
                  <button
                    onClick={handleAiAnalysis}
                    disabled={aiAnalysis.isPending}
                    className="flex items-center gap-2 rounded-lg bg-primary/10 text-primary px-3 py-1.5 text-xs font-semibold hover:bg-primary/20 transition-colors disabled:opacity-50"
                  >
                    {aiAnalysis.isPending ? (
                      <>
                        <RefreshCw className="h-3 w-3 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Brain className="h-3 w-3" />
                        Run Analysis
                      </>
                    )}
                  </button>
                )}
              </div>
              {incident.ai_analysis ? (
                <div className="max-h-125 overflow-y-auto rounded-lg bg-slate-50 dark:bg-muted/20 border border-slate-200 dark:border-border p-5">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h1: ({ children }) => <h1 className="text-base font-bold text-blue-700 dark:text-blue-400 border-b border-blue-200 dark:border-blue-900/50 pb-1.5 mb-3 mt-5 first:mt-0">{children}</h1>,
                      h2: ({ children }) => <h2 className="text-sm font-bold text-blue-600 dark:text-blue-300 mb-2 mt-4 first:mt-0">{children}</h2>,
                      h3: ({ children }) => <h3 className="text-sm font-semibold text-violet-700 dark:text-violet-300 mb-1.5 mt-3 first:mt-0">{children}</h3>,
                      p: ({ children }) => <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 mb-2.5 last:mb-0">{children}</p>,
                      ul: ({ children }) => <ul className="space-y-1 mb-2.5 text-sm text-slate-700 dark:text-slate-300 pl-1">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 mb-2.5 text-sm text-slate-700 dark:text-slate-300">{children}</ol>,
                      li: ({ children }) => (
                        <li className="flex items-start gap-2 leading-relaxed">
                          <span className="text-blue-500 mt-0.5 shrink-0 text-xs">▸</span>
                          <span>{children}</span>
                        </li>
                      ),
                      strong: ({ children }) => <strong className="font-semibold text-slate-900 dark:text-white">{children}</strong>,
                      em: ({ children }) => <em className="italic text-slate-500 dark:text-slate-400">{children}</em>,
                      code: ({ children, className }) => {
                        const isBlock = className?.includes("language-");
                        return isBlock
                          ? <code className="block bg-slate-100 dark:bg-[#0a1628] border-l-2 border-blue-500 dark:border-blue-600 rounded-r-lg px-3 py-2.5 text-xs font-mono text-blue-800 dark:text-green-400 overflow-x-auto">{children}</code>
                          : <code className="bg-violet-50 dark:bg-violet-500/15 border border-violet-200 dark:border-violet-500/25 rounded px-1.5 py-0.5 text-xs font-mono text-violet-700 dark:text-violet-300">{children}</code>;
                      },
                      pre: ({ children }) => <pre className="my-3 rounded-lg overflow-hidden">{children}</pre>,
                      blockquote: ({ children }) => <blockquote className="border-l-2 border-blue-500 pl-3.5 py-0.5 my-2.5 bg-blue-50 dark:bg-blue-500/5 rounded-r italic text-slate-600 dark:text-slate-400">{children}</blockquote>,
                      hr: () => <hr className="border-slate-200 dark:border-slate-700 my-4" />,
                    }}
                  >
                    {incident.ai_analysis}
                  </ReactMarkdown>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No AI analysis available. Click &quot;Run Analysis&quot; to
                  generate one using the local LLM.
                </p>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-5 space-y-5">
              {/* Status */}
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">
                  Status
                </label>
                <Select
                  value={incident.status}
                  onValueChange={(v) => handleStatusChange(v as IncidentStatus)}
                >
                  <SelectTrigger className="w-full h-9 text-sm font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statuses.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s
                          .replace("_", " ")
                          .replace(/\b\w/g, (c) => c.toUpperCase())}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Severity */}
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">
                  Severity
                </label>
                <SeverityBadge severity={incident.severity} />
              </div>

              {/* Detected */}
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block flex items-center gap-1.5">
                  <Clock className="h-3 w-3" />
                  Detected
                </label>
                <p className="text-sm">
                  {new Date(incident.detected_at).toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">
                  {timeAgo(incident.detected_at)}
                </p>
              </div>

              {/* Resolved */}
              {incident.resolved_at && (
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block">
                    Resolved
                  </label>
                  <p className="text-sm">
                    {new Date(incident.resolved_at).toLocaleString()}
                  </p>
                </div>
              )}

              {/* Rule */}
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Shield className="h-3 w-3" />
                  Detection Rule
                </label>
                <Link
                  href={`/rules/${incident.rule_id}`}
                  className="flex items-center gap-1.5 text-sm text-primary hover:underline"
                >
                  {incident.rule_id.slice(0, 12)}…{" "}
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>

              {/* Server */}
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Server className="h-3 w-3" />
                  Server
                </label>
                <Link
                  href={`/servers/${incident.server_id}`}
                  className="flex items-center gap-1.5 text-sm text-primary hover:underline"
                >
                  {incident.server_id.slice(0, 12)}…
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
