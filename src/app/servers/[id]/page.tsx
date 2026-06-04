"use client";

import { AppShell } from "@/components/layout/app-shell";
import { getFriendlyMessage } from "@/lib/errors";
import { useAuth } from "@/providers/auth-provider";
import { useServer, useDeleteServer, useRecalculateStats } from "@/lib/hooks/use-servers";
import { useIncidents } from "@/lib/hooks/use-incidents";
import { useServerAnomaliesFiltered } from "@/lib/hooks/use-anomalies";

import { LogSourcesTab } from "@/components/servers/log-sources-tab";
import { OverviewTab } from "@/components/servers/tabs/overview-tab";
import { LogsTab } from "@/components/servers/tabs/logs-tab";
import { IncidentsTab } from "@/components/servers/tabs/incidents-tab";
import { TerminalTab } from "@/components/servers/tabs/terminal-tab";
import { MetricsTab } from "@/components/servers/tabs/metrics-tab";
import { AnomaliesTab } from "@/components/servers/tabs/anomalies-tab";
import { AiOverviewTab } from "@/components/servers/tabs/ai-overview-tab";
import { ServerRulesTab } from "@/components/servers/tabs/server-rules-tab";
import { ServerScriptsTab } from "@/components/servers/tabs/server-scripts-tab";
import { useRouter } from "next/navigation";
import { ServerStatusBadge } from "@/components/shared/badges";
import { timeAgo, cn } from "@/lib/utils";
import { diagnoseAuthFailure } from "@/lib/server-auth-diagnostics";
import { Trash2, ArrowLeft, Pencil, RefreshCw, AlertTriangle } from "lucide-react";
import { useState, use } from "react";
import { toast } from "sonner";
import Link from "next/link";

type TabKey =
  | "overview"
  | "metrics"
  | "logs"
  | "sources"
  | "incidents"
  | "anomalies"
  | "rules"     // Phase 28.5 — per-server private rule library
  | "scripts"   // Phase 28.5 — per-server private script library
  | "ai-overview"
  | "actions";

export default function ServerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { isOperator } = useAuth(); // operator/admin → may open the terminal
  const { data: server, isLoading: loadingServer } = useServer(id);
  const { data: incidentsData } = useIncidents({
    server_id: id,
    page_size: 10,
  });
  const incidents = incidentsData?.results ?? [];

  const { data: pendingAnomalies } = useServerAnomaliesFiltered(id, {
    status: "pending_review",
    page_size: 1,
  });

  const deleteServer = useDeleteServer();
  const recalculate = useRecalculateStats();

  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");

  const handleDelete = async () => {
    if (!deletePassword) return;
    try {
      await deleteServer.mutateAsync({
        id,
        data: { current_secret: deletePassword },
      });
      toast.success("Server deleted");
      router.push("/servers");
    } catch (err) {
      toast.error(getFriendlyMessage(err));
    }
  };

  if (loadingServer) {
    return (
      <AppShell>
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-64 bg-muted rounded" />
          <div className="h-32 bg-muted rounded-xl" />
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

  const openIncidentCount = server?.open_incidents_count ?? 0;
  const pendingAnomalyCount = pendingAnomalies?.total ?? 0;

  const handleRecalculate = async () => {
    try {
      const result = await recalculate.mutateAsync(id);
      toast.success(`Stats recalculated — ${result.open_incidents_count} active incident(s)`);
    } catch {
      toast.error("Failed to recalculate stats");
    }
  };

  const tabs: Array<{ key: TabKey; label: string; badge?: number }> = [
    { key: "overview",    label: "Overview" },
    { key: "metrics",     label: "Metrics" },
    { key: "logs",        label: "Logs" },
    { key: "sources",     label: "Log Sources" },
    { key: "incidents",   label: "Incidents", badge: openIncidentCount },
    { key: "anomalies",   label: "Anomalies", badge: pendingAnomalyCount },
    // Phase 28.5 — per-server private library tabs
    { key: "rules",       label: "Rules" },
    { key: "scripts",     label: "Scripts" },
    { key: "ai-overview", label: "AI Overview" },
    // Terminal/command execution — operator+ only; viewers never see this tab.
    ...(isOperator ? [{ key: "actions" as const, label: "Actions" }] : []),
  ];

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Link
                href="/servers"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <ServerStatusBadge status={server.status} />
              <span className="text-xs text-muted-foreground font-mono">
                NODE_ID: {id.slice(0, 8).toUpperCase()}
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">
              {server.hostname.toUpperCase()}
            </h1>
            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
              <span className="font-mono">{server.ip_address}</span>
              <span className="capitalize">{server.os_type}</span>
              <span>Last check: {timeAgo(server.last_health_check)}</span>
            </div>
            {server.status === "reachable" && (() => {
              const d = diagnoseAuthFailure(server.auth_failure_reason, server.os_type);
              return (
                <div className="mt-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2.5 space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-yellow-300" />
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-yellow-300">{d.title}</p>
                      <p className="text-xs leading-relaxed text-yellow-200/80">{d.explanation}</p>
                    </div>
                  </div>
                  {d.rawError && (
                    <div className="pl-6">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-yellow-300/70 mb-1">
                        Error returned by {server.os_type === "windows" ? "WinRM" : "SSH"}
                      </p>
                      <pre className="text-[11px] font-mono text-yellow-200 bg-yellow-500/5 border border-yellow-500/20 rounded px-2 py-1.5 whitespace-pre-wrap break-words">
                        {d.rawError}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRecalculate}
              disabled={recalculate.isPending}
              title="Recount active incidents from the database and fix any counter drift"
              className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${recalculate.isPending ? "animate-spin" : ""}`} />
              Recalculate
            </button>
            <Link
              href={`/servers/${id}/edit`}
              className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Link>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2 rounded-lg border border-red-500/30 px-3 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete Server
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-border">
          <nav className="flex gap-1 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5",
                  activeTab === tab.key
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.label}
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className={cn(
                    "inline-flex h-5 min-w-5 px-1 items-center justify-center rounded-full text-[10px] font-bold",
                    tab.key === "anomalies"
                      ? "bg-cyan-500/20 text-cyan-400"
                      : "bg-red-500/20 text-red-400",
                  )}>
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {activeTab === "overview" && (
          <OverviewTab serverId={id} incidents={incidents} server={server} />
        )}
        {activeTab === "metrics" && <MetricsTab serverId={id} />}
        {activeTab === "logs" && (
          <LogsTab serverId={id} hostname={server.hostname} />
        )}
        {activeTab === "sources" && (
          <LogSourcesTab serverId={id} osType={server.os_type} />
        )}
        {activeTab === "incidents" && <IncidentsTab serverId={id} />}
        {activeTab === "anomalies" && <AnomaliesTab serverId={id} />}
        {activeTab === "rules" && <ServerRulesTab serverId={id} />}
        {activeTab === "scripts" && <ServerScriptsTab serverId={id} />}
        {activeTab === "ai-overview" && <AiOverviewTab server={server} />}
        {activeTab === "actions" && isOperator && <TerminalTab server={server} />}

        {/* Delete Confirm Modal */}
        {/* {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-xl">
              <h2 className="text-lg font-bold mb-2">Delete Server</h2>
              <p className="text-sm text-muted-foreground mb-4">
                This action cannot be undone. Enter the server credential
                password to confirm deletion of{" "}
                <span className="font-semibold text-foreground">
                  {server.hostname}
                </span>
                .
              </p>
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Credential password"
                className="w-full h-9 rounded-lg border border-border bg-muted/50 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-red-500/50 mb-4"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeletePassword("");
                  }}
                  className="flex-1 h-9 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleteServer.isPending || !deletePassword}
                  className="flex-1 h-9 rounded-lg bg-red-500 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-50 transition-colors"
                >
                  {deleteServer.isPending ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )} */}
      </div>
    </AppShell>
  );
}
