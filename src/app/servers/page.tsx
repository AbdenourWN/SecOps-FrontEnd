"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { useServers, useDeleteServer } from "@/lib/hooks/use-servers";
import { Server, Shield, Trash2, Plus, Terminal, RefreshCw, Activity } from "lucide-react";
import { timeAgo } from "@/lib/utils";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function ServersPage() {
  const { data: servers, isLoading } = useServers();
  const deleteServer = useDeleteServer();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Stats
  const onlineCount = servers?.filter((s) => s.status === "online").length || 0;
  const offlineCount = servers?.filter((s) => s.status === "offline").length || 0;

  return (
    <AppShell>
      <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold mb-4 border border-primary/20">
              <Server className="h-3.5 w-3.5" />
              INFRASTRUCTURE
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
              Compute Nodes
            </h1>
            <p className="text-muted-foreground mt-2 max-w-xl leading-relaxed">
              Monitor and manage edge nodes and core servers in real-time. Automated agents report telemetry back to the centralized engine.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-card border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-sm font-semibold shadow-sm">
              <RefreshCw className="h-4 w-4" />
              Scan Network
            </button>
            <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all text-sm font-semibold shadow-xl shadow-primary/20">
              <Plus className="h-4 w-4" />
              Deploy Node
            </button>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-border bg-card/40 backdrop-blur-md p-5 flex flex-col justify-between overflow-hidden relative">
            <div className="absolute -right-6 -top-6 h-24 w-24 bg-primary/10 rounded-full blur-2xl" />
            <p className="text-sm font-medium text-muted-foreground mb-4">Total Nodes</p>
            <p className="text-4xl font-black">{servers?.length || 0}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card/40 backdrop-blur-md p-5 flex flex-col justify-between overflow-hidden relative border-success/30">
            <div className="absolute -right-6 -top-6 h-24 w-24 bg-success/10 rounded-full blur-2xl" />
            <span className="text-sm font-medium text-success mb-4 flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-success animate-pulse"/> Online</span>
            <p className="text-4xl font-black">{onlineCount}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card/40 backdrop-blur-md p-5 flex flex-col justify-between overflow-hidden relative border-danger/30">
            <div className="absolute -right-6 -top-6 h-24 w-24 bg-danger/10 rounded-full blur-2xl" />
            <p className="text-sm font-medium text-danger mb-4">Offline / Error</p>
            <p className="text-4xl font-black">{offlineCount}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card/40 backdrop-blur-md p-5 flex flex-col justify-between overflow-hidden relative">
             <div className="absolute -right-6 -top-6 h-24 w-24 bg-secondary/10 rounded-full blur-2xl" />
            <p className="text-sm font-medium text-muted-foreground mb-4">Incidents Impacted</p>
            <p className="text-4xl font-black">
               {servers?.reduce((acc, s) => acc + (s.open_incidents || 0), 0) || 0}
            </p>
          </div>
        </div>

        {/* Server Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 rounded-2xl bg-muted/60 animate-pulse border border-border" />
            ))}
          </div>
        ) : !servers || servers.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center border-2 border-dashed border-border rounded-3xl bg-card/30">
            <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-4">
              <Server className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold">No servers connected</h3>
            <p className="text-muted-foreground text-sm mt-1 max-w-sm text-center">Deploy an agent to a compute node to begin monitoring telemetry and security events.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {servers.map((server) => {
              const isOffline = server.status === "offline";
              const hasIncidents = server.open_incidents > 0;
              
              return (
                <div 
                  key={server._id} 
                  className={cn(
                    "group relative rounded-2xl border overflow-hidden p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 block hover:border-primary/40",
                    isOffline ? "bg-danger/5 border-danger/30" : hasIncidents ? "bg-warning/5 border-warning/30" : "bg-card border-border"
                  )}
                >
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "h-10 w-10 flex items-center justify-center rounded-xl",
                        isOffline ? "bg-danger/20 text-danger" : hasIncidents ? "bg-warning/20 text-warning" : "bg-primary/10 text-primary"
                      )}>
                        <Server className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors">
                          <Link href={`/servers/${server._id}`} className="absolute inset-0 z-10" />
                          {server.hostname}
                        </h3>
                        <p className="text-xs text-muted-foreground font-mono mt-0.5">{server.ip_address}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                      <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block mb-1">Status</span>
                      <div className="flex items-center gap-1.5">
                        <span className={cn(
                          "h-2 w-2 rounded-full shadow-sm",
                          isOffline ? "bg-danger" : "bg-success"
                        )} />
                        <span className="text-sm font-semibold capitalize">{server.status}</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block mb-1">Architecture</span>
                      <span className="text-sm font-semibold capitalize flex items-center gap-1.5">
                        <Terminal className="h-3.5 w-3.5 text-muted-foreground" />
                        {server.os_type}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-border pt-4 mt-auto">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5">
                        <Shield className={cn("h-4 w-4", hasIncidents ? "text-warning" : "text-success")} />
                        <span className={cn("text-xs font-bold", hasIncidents ? "text-warning" : "text-muted-foreground")}>
                          {server.open_incidents}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Activity className="h-4 w-4" />
                        <span className="text-[10px] font-mono">{timeAgo(server.last_health_check)}</span>
                      </div>
                    </div>
                    
                    {/* Delete button placed z-20 to override Link overlay */}
                    <button 
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeleteId(server._id); }}
                      className="relative z-20 p-2 text-muted-foreground hover:text-danger hover:bg-danger/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Simple inline delete modal without relying on ui components */}
        {deleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-card w-full max-w-md rounded-2xl border border-border shadow-2xl p-6">
              <h2 className="text-xl font-bold mb-2">Delete Server Node</h2>
              <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
                Are you sure you want to completely remove this compute node from the monitoring registry? This action is irreversible.
              </p>
              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => setDeleteId(null)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold border border-transparent hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={async () => {
                    await deleteServer.mutateAsync({ id: deleteId, data: { current_secret: "admin" } });
                    setDeleteId(null);
                  }}
                  className="px-4 py-2 rounded-xl text-sm font-semibold bg-danger text-white hover:bg-danger/90 transition-colors shadow-lg shadow-danger/20"
                >
                  Confirm Deletion
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
