"use client";

import { AppShell } from "@/components/layout/app-shell";
import { useServer, useDeleteServer } from "@/lib/hooks/use-servers";
import { useIncidents } from "@/lib/hooks/use-incidents";
import { LogSourcesTab } from "@/components/servers/log-sources-tab";
import { OverviewTab } from "@/components/servers/tabs/overview-tab";
import { LogsTab } from "@/components/servers/tabs/logs-tab";
import { IncidentsTab } from "@/components/servers/tabs/incidents-tab";
import { TerminalTab } from "@/components/servers/tabs/terminal-tab";
import { useRouter } from "next/navigation";
import { ServerStatusBadge } from "@/components/shared/badges";
import { timeAgo, cn } from "@/lib/utils";
import { Trash2, ArrowLeft } from "lucide-react";
import { useState, use } from "react";
import { toast } from "sonner";
import Link from "next/link";

type TabKey = "overview" | "logs" | "sources" | "incidents" | "actions";

export default function ServerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data: server, isLoading: loadingServer } = useServer(id);
  const { data: incidentsData } = useIncidents({
    server_id: id,
    page_size: 10,
  });
  const incidents = incidentsData?.results ?? [];
  const deleteServer = useDeleteServer();

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
      toast.error((err as Error).message);
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

  const openIncidentCount = incidents.filter(
    (i) => i.status === "open" || i.status === "investigating",
  ).length;

  const tabs: Array<{ key: TabKey; label: string; badge?: string | number }> = [
    { key: "overview", label: "Overview" },
    { key: "logs", label: "Logs" },
    { key: "sources", label: "Log Sources" },
    {
      key: "incidents",
      label: "Incidents",
      badge: openIncidentCount >= 10 ? "10+" : openIncidentCount || undefined,
    },
    { key: "actions", label: "Actions" },
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
          </div>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-2 rounded-lg border border-red-500/30 px-3 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete Server
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-border">
          <nav className="flex gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
                  activeTab === tab.key
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.label}
                {tab.badge !== undefined && (
                  <span className="ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-500/20 text-[10px] font-bold text-red-400">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {activeTab === "overview" && (
          <OverviewTab serverId={id} incidents={incidents} osType={server.os_type} />
        )}
        {activeTab === "logs" && (
          <LogsTab serverId={id} hostname={server.hostname} />
        )}
        {activeTab === "sources" && (
          <LogSourcesTab serverId={id} osType={server.os_type} />
        )}
        {activeTab === "incidents" && <IncidentsTab serverId={id} />}
        {activeTab === "actions" && <TerminalTab server={server} />}

        {/* Delete Confirm Modal */}
        {showDeleteConfirm && (
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
        )}
      </div>
    </AppShell>
  );
}
