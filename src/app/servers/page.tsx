"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import {
  useServers,
  useDeleteServer,
  useCreateServer,
} from "@/lib/hooks/use-servers";
import { useIncidents } from "@/lib/hooks/use-incidents";
import {
  Server,
  Shield,
  Plus,
  Terminal,
  Activity,
  X,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { timeAgo } from "@/lib/utils";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { CredentialType, ServerFilters } from "@/lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export default function ServersPage() {
  const PAGE_SIZE = 9;

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ServerFilters["status"] | "">("");
  const [osFilter, setOsFilter] = useState<ServerFilters["os_type"] | "">("");
  const [page, setPage] = useState(1);

  // Reset to page 1 whenever a filter changes
  const setSearchAndReset = (v: string) => { setSearch(v); setPage(1); };
  const setStatusAndReset = (v: ServerFilters["status"] | "") => { setStatusFilter(v); setPage(1); };
  const setOsAndReset = (v: ServerFilters["os_type"] | "") => { setOsFilter(v); setPage(1); };

  const filters: ServerFilters = {
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(osFilter ? { os_type: osFilter } : {}),
    ...(search.trim() ? { search: search.trim() } : {}),
    page,
    page_size: PAGE_SIZE,
  };

  const { data, isLoading } = useServers(filters);
  const servers = data?.results ?? [];
  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 1;

  // Unfiltered stats — one cheap request per status
  const { data: allData }     = useServers({ page: 1, page_size: 1 });
  const { data: onlineData }  = useServers({ status: "online",  page: 1, page_size: 1 });
  const { data: offlineData } = useServers({ status: "offline", page: 1, page_size: 1 });
  const { data: openIncidentsData } = useIncidents({ status: "open" });
  const openIncidents = openIncidentsData?.results ?? [];
  const deleteServer = useDeleteServer();
  const createServer = useCreateServer();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deployOpen, setDeployOpen] = useState(false);

  // Deploy form state
  const [hostname, setHostname] = useState("");
  const [ipAddress, setIpAddress] = useState("");
  const [osType, setOsType] = useState<"linux" | "windows">("linux");
  const [port, setPort] = useState<string>("");
  const [credUsername, setCredUsername] = useState("");
  const [credType, setCredType] = useState<CredentialType>("password");
  const [credSecret, setCredSecret] = useState("");

  const resetDeployForm = () => {
    setHostname("");
    setIpAddress("");
    setOsType("linux");
    setPort("");
    setCredUsername("");
    setCredType("password");
    setCredSecret("");
  };

  const handleDeploy = async () => {
    if (
      !hostname.trim() ||
      !ipAddress.trim() ||
      !credUsername.trim() ||
      !credSecret
    ) {
      toast.error("Hostname, IP, username and secret are required");
      return;
    }
    // Basic IPv4 sanity — backend will reject anything invalid, but fail fast in UI.
    const ipOk = /^(\d{1,3}\.){3}\d{1,3}$/.test(ipAddress.trim());
    if (!ipOk) {
      toast.error("IP address must look like 192.168.1.10");
      return;
    }
    const parsedPort = port.trim() ? Number(port) : undefined;
    if (
      parsedPort !== undefined &&
      (!Number.isInteger(parsedPort) || parsedPort < 1 || parsedPort > 65535)
    ) {
      toast.error("Port must be an integer between 1 and 65535");
      return;
    }

    try {
      await createServer.mutateAsync({
        hostname: hostname.trim(),
        ip_address: ipAddress.trim(),
        os_type: osType,
        port: parsedPort,
        credential: {
          username: credUsername.trim(),
          type: credType,
          secret: credSecret,
        },
      });
      toast.success("Node deployed");
      resetDeployForm();
      setDeployOpen(false);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const incidentCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const inc of openIncidents ?? []) {
      counts[inc.server_id] = (counts[inc.server_id] ?? 0) + 1;
    }
    return counts;
  }, [openIncidents]);

  const totalOpenIncidents = (openIncidents ?? []).length;

  const hasFilters = !!statusFilter || !!osFilter || !!search.trim();

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
            <h1 className="text-3xl md:text-5xl font-black tracking-tight bg-linear-to-br from-foreground to-foreground/70 bg-clip-text text-transparent pb-2">
              Compute Nodes
            </h1>
            <p className="text-muted-foreground mt-2 max-w-xl leading-relaxed">
              Monitor and manage edge nodes and core servers in real-time.
              Automated agents report telemetry back to the centralized engine.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-card border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-sm font-semibold shadow-sm">
              <RefreshCw className="h-4 w-4" />
              Scan Network
            </button> */}
            <button
              onClick={() => setDeployOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all text-sm font-semibold shadow-xl shadow-primary/20"
            >
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
            <p className="text-4xl font-black">{allData?.total ?? 0}</p>
          </div>
          <div className="rounded-2xl border bg-card/40 backdrop-blur-md p-5 flex flex-col justify-between overflow-hidden relative border-success/30">
            <div className="absolute -right-6 -top-6 h-24 w-24 bg-success/10 rounded-full blur-2xl" />
            <span className="text-sm font-medium text-success mb-4 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-success animate-pulse" /> Online
            </span>
            <p className="text-4xl font-black">{onlineData?.total ?? 0}</p>
          </div>
          <div className="rounded-2xl border bg-card/40 backdrop-blur-md p-5 flex flex-col justify-between overflow-hidden relative border-danger/30">
            <div className="absolute -right-6 -top-6 h-24 w-24 bg-danger/10 rounded-full blur-2xl" />
            <p className="text-sm font-medium text-danger mb-4">Offline / Error</p>
            <p className="text-4xl font-black">{offlineData?.total ?? 0}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card/40 backdrop-blur-md p-5 flex flex-col justify-between overflow-hidden relative">
            <div className="absolute -right-6 -top-6 h-24 w-24 bg-secondary/10 rounded-full blur-2xl" />
            <p className="text-sm font-medium text-muted-foreground mb-4">Incidents Impacted</p>
            <p className="text-4xl font-black">{totalOpenIncidents}</p>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearchAndReset(e.target.value)}
              placeholder="Search hostname or IP…"
              className="w-full h-9 pl-9 pr-4 rounded-lg border border-border bg-muted/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
            />
          </div>
          <Select value={statusFilter || "all"} onValueChange={(v) => setStatusAndReset(v === "all" ? "" : v as ServerFilters["status"])}>
            <SelectTrigger className="w-full sm:w-35"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="online">Online</SelectItem>
              <SelectItem value="offline">Offline</SelectItem>
              <SelectItem value="unknown">Unknown</SelectItem>
            </SelectContent>
          </Select>
          <Select value={osFilter || "all"} onValueChange={(v) => setOsAndReset(v === "all" ? "" : v as ServerFilters["os_type"])}>
            <SelectTrigger className="w-full sm:w-35"><SelectValue placeholder="OS" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All OS</SelectItem>
              <SelectItem value="linux">Linux</SelectItem>
              <SelectItem value="windows">Windows</SelectItem>
            </SelectContent>
          </Select>
          {hasFilters && (
            <button
              onClick={() => { setSearchAndReset(""); setStatusAndReset(""); setOsAndReset(""); }}
              className="flex items-center gap-1.5 px-3 h-9 rounded-lg border border-border text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0"
            >
              <X className="h-3.5 w-3.5" />
              Clear
            </button>
          )}
        </div>

        {/* Server Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(PAGE_SIZE)].map((_, i) => (
              <div key={i} className="h-48 rounded-2xl bg-muted/60 animate-pulse border border-border" />
            ))}
          </div>
        ) : servers.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center border-2 border-dashed border-border rounded-3xl bg-card/30">
            <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-4">
              <Server className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold">{hasFilters ? "No servers match your filters" : "No servers connected"}</h3>
            <p className="text-muted-foreground text-sm mt-1 max-w-sm text-center">
              {hasFilters ? "Try adjusting or clearing the filters." : "Deploy an agent to a compute node to begin monitoring telemetry and security events."}
            </p>
          </div>
        ) : (
          <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {servers.map((server) => {
              const isOffline = server.status === "offline";
              const incidentCount = incidentCounts[server._id] ?? 0;
              const hasIncidents = incidentCount > 0;

              return (
                <div
                  key={server._id}
                  className={cn(
                    "group relative rounded-2xl border overflow-hidden p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 block hover:border-primary/40",
                    isOffline
                      ? "bg-danger/5 border-danger/30"
                      : hasIncidents
                        ? "bg-warning/5 border-warning/30"
                        : "bg-card border-border",
                  )}
                >
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "h-10 w-10 flex items-center justify-center rounded-xl",
                          isOffline
                            ? "bg-danger/20 text-danger"
                            : hasIncidents
                              ? "bg-warning/20 text-warning"
                              : "bg-primary/10 text-primary",
                        )}
                      >
                        <Server className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors">
                          <Link
                            href={`/servers/${server._id}`}
                            className="absolute inset-0 z-10"
                          />
                          {server.hostname}
                        </h3>
                        <p className="text-xs text-muted-foreground font-mono mt-0.5">
                          {server.ip_address}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                      <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block mb-1">
                        Status
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            "h-2 w-2 rounded-full shadow-sm",
                            isOffline ? "bg-danger" : "bg-success",
                          )}
                        />
                        <span className="text-sm font-semibold capitalize">
                          {server.status}
                        </span>
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block mb-1">
                        Architecture
                      </span>
                      <span className="text-sm font-semibold capitalize flex items-center gap-1.5">
                        <Terminal className="h-3.5 w-3.5 text-muted-foreground" />
                        {server.os_type}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-border pt-4 mt-auto">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5">
                        <Shield
                          className={cn(
                            "h-4 w-4",
                            hasIncidents ? "text-warning" : "text-success",
                          )}
                        />
                        <span
                          className={cn(
                            "text-xs font-bold",
                            hasIncidents
                              ? "text-warning"
                              : "text-muted-foreground",
                          )}
                        >
                          {incidentCount > 10 ? "10+" : incidentCount}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Activity className="h-4 w-4" />
                        <span className="text-[10px] font-mono">
                          {timeAgo(server.last_health_check)}
                        </span>
                      </div>
                    </div>

                    {/* Delete button placed z-20 to override Link overlay */}
                    {/* <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDeleteId(server._id);
                      }}
                      className="relative z-20 p-2 text-muted-foreground hover:text-danger hover:bg-danger/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button> */}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-muted-foreground">
                Page <span className="font-semibold text-foreground">{page}</span> of{" "}
                <span className="font-semibold text-foreground">{totalPages}</span>
                {" . "}
                <span className="font-semibold text-foreground">{data?.total}</span> total
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                  className="px-3 py-2 rounded-lg text-xs font-semibold border border-border bg-card hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >«</button>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-2 rounded-lg text-xs font-semibold border border-border bg-card hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >Prev</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                  .reduce<(number | "…")[]>((acc, p, idx, arr) => {
                    if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("…");
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((item, idx) =>
                    item === "…" ? (
                      <span key={`ellipsis-${idx}`} className="px-2 text-xs text-muted-foreground">…</span>
                    ) : (
                      <button
                        key={item}
                        onClick={() => setPage(item as number)}
                        className={cn(
                          "px-4 py-2 rounded-lg text-xs font-semibold border transition-colors",
                          page === item
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border bg-card hover:bg-muted"
                        )}
                      >{item}</button>
                    )
                  )}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-2 rounded-lg text-xs font-semibold border border-border bg-card hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >Next</button>
                <button
                  onClick={() => setPage(totalPages)}
                  disabled={page === totalPages}
                  className="px-3 py-2 rounded-lg text-xs font-semibold border border-border bg-card hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >»</button>
              </div>
            </div>
          )}
          </>
        )}

        {/* Deploy Node modal */}
        <Dialog
          open={deployOpen}
          onOpenChange={(open) => {
            setDeployOpen(open);
            if (!open) resetDeployForm();
          }}
        >
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">Deploy Compute Node</DialogTitle>
              <DialogDescription className="text-xs">
                Register a server and its access credentials. The secret is
                encrypted at rest.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                      Hostname
                    </label>
                    <input
                      value={hostname}
                      onChange={(e) => setHostname(e.target.value)}
                      placeholder="web-01"
                      className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border focus:border-primary/50 outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                      IP Address
                    </label>
                    <input
                      value={ipAddress}
                      onChange={(e) => setIpAddress(e.target.value)}
                      placeholder="192.168.1.10"
                      className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border focus:border-primary/50 outline-none text-sm font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                      OS
                    </label>
                    <Select
                      value={osType}
                      onValueChange={(v) => setOsType(v as "linux" | "windows")}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="linux">Linux</SelectItem>
                        <SelectItem value="windows">Windows</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                      Port{" "}
                      <span className="text-muted-foreground/60 font-normal normal-case">
                        (optional)
                      </span>
                    </label>
                    <input
                      value={port}
                      onChange={(e) => setPort(e.target.value)}
                      placeholder={osType === "windows" ? "5985" : "22"}
                      inputMode="numeric"
                      className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border focus:border-primary/50 outline-none text-sm font-mono"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-border">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3">
                    Access Credentials
                  </p>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                        Username
                      </label>
                      <input
                        value={credUsername}
                        onChange={(e) => setCredUsername(e.target.value)}
                        placeholder={
                          osType === "windows" ? "Administrator" : "root"
                        }
                        className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border focus:border-primary/50 outline-none text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                        Auth Type
                      </label>
                      <Select
                        value={credType}
                        onValueChange={(v) => setCredType(v as CredentialType)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="password">Password</SelectItem>
                          <SelectItem value="ssh_key">SSH Key</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                      {credType === "ssh_key"
                        ? "Private Key (PEM)"
                        : "Password"}
                    </label>
                    {credType === "ssh_key" ? (
                      <textarea
                        value={credSecret}
                        onChange={(e) => setCredSecret(e.target.value)}
                        placeholder="-----BEGIN OPENSSH PRIVATE KEY-----"
                        className="w-full px-3 py-2 rounded-lg bg-[#0f172a] text-green-400 border border-border focus:border-primary/50 outline-none text-xs font-mono h-28 resize-none"
                        spellCheck={false}
                      />
                    ) : (
                      <input
                        type="password"
                        value={credSecret}
                        onChange={(e) => setCredSecret(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border focus:border-primary/50 outline-none text-sm font-mono"
                      />
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-3">
                  <button
                    onClick={() => {
                      setDeployOpen(false);
                      resetDeployForm();
                    }}
                    disabled={createServer.isPending}
                    className="px-4 py-2 rounded-xl text-sm font-semibold border border-border hover:bg-muted disabled:opacity-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeploy}
                    disabled={createServer.isPending}
                    className="px-4 py-2 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-lg shadow-primary/20"
                  >
                    {createServer.isPending ? "Deploying..." : "Deploy Node"}
                  </button>
                </div>
              </div>
          </DialogContent>
        </Dialog>

        {/* Simple inline delete modal without relying on ui components */}
        {/* {deleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-card w-full max-w-md rounded-2xl border border-border shadow-2xl p-6">
              <h2 className="text-xl font-bold mb-2">Delete Server Node</h2>
              <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
                Are you sure you want to completely remove this compute node
                from the monitoring registry? This action is irreversible.
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
                    await deleteServer.mutateAsync({
                      id: deleteId,
                      data: { current_secret: "admin" },
                    });
                    setDeleteId(null);
                  }}
                  className="px-4 py-2 rounded-xl text-sm font-semibold bg-danger text-white hover:bg-danger/90 transition-colors shadow-lg shadow-danger/20"
                >
                  Confirm Deletion
                </button>
              </div>
            </div>
          </div>
        )} */}
      </div>
    </AppShell>
  );
}
