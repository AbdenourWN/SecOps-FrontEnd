"use client";

import { AppShell } from "@/components/layout/app-shell";
import {
  useIncident,
  useUpdateIncidentStatus,
  useAiAnalysis,
} from "@/lib/hooks/use-incidents";
import { SeverityBadge, StatusBadge, timeAgo } from "@/components/shared/badges";
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
} from "lucide-react";
import { use } from "react";
import { toast } from "sonner";
import Link from "next/link";
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
            {incident.context &&
              Object.keys(incident.context).length > 0 && (
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
                <div className="max-h-[400px] overflow-y-auto rounded-lg bg-muted/20 p-4">
                  <div className="text-sm leading-relaxed whitespace-pre-wrap">
                    {incident.ai_analysis}
                  </div>
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
                <select
                  value={incident.status}
                  onChange={(e) =>
                    handleStatusChange(e.target.value as IncidentStatus)
                  }
                  className="w-full h-9 rounded-lg border border-border bg-muted/50 px-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  {statuses.map((s) => (
                    <option key={s} value={s}>
                      {s.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                    </option>
                  ))}
                </select>
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
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block flex items-center gap-1.5">
                  <Shield className="h-3 w-3" />
                  Detection Rule
                </label>
                <p className="text-sm font-mono text-muted-foreground">{incident.rule_id.slice(0, 12)}…</p>
              </div>

              {/* Server */}
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block flex items-center gap-1.5">
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
