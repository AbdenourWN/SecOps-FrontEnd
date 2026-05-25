"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { useRules, useCreateRule, useDeleteRule } from "@/lib/hooks/use-rules";
import { Plus, Trash2, Eye, LayoutGrid, Terminal, Shield, Search } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { OwnerBadge } from "@/components/shared/owner-badge";
import type { SeverityLevel, ActionLevel, RuleOSType, DetectionRule } from "@/lib/types";
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
} from "@/components/ui/dialog";

const PAGE_SIZE = 10;

export default function RulesPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [filterSeverity, setFilterSeverity] = useState<SeverityLevel | "all">("all");
  const [filterOS, setFilterOS] = useState<RuleOSType | "all">("all");
  const [filterEnabled, setFilterEnabled] = useState<"all" | "true" | "false">("all");
  // Phase 28.5 — library scope filter
  const [filterScope, setFilterScope] = useState<"all" | "global" | "server">("all");
  const [page, setPage] = useState(1);

  const setSeverityAndReset = (v: SeverityLevel | "all") => { setFilterSeverity(v); setPage(1); };
  const setOSAndReset = (v: RuleOSType | "all") => { setFilterOS(v); setPage(1); };
  const setEnabledAndReset = (v: "all" | "true" | "false") => { setFilterEnabled(v); setPage(1); };
  const setScopeAndReset = (v: "all" | "global" | "server") => { setFilterScope(v); setPage(1); };
  const executeSearch = () => { setSearch(searchInput); setPage(1); };

  const { data, isLoading } = useRules({
    severity: filterSeverity === "all" ? undefined : filterSeverity,
    os_type: filterOS === "all" ? undefined : filterOS,
    enabled: filterEnabled === "all" ? undefined : filterEnabled === "true",
    search: search || undefined,
    owner_type: filterScope === "all" ? undefined : filterScope,
    page,
    page_size: PAGE_SIZE,
  });

  const rules = data?.results ?? [];
  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 1;

  const createRule = useCreateRule();
  const deleteRule = useDeleteRule();

  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DetectionRule | null>(null);

  const [name, setName] = useState("");
  const [pattern, setPattern] = useState("");
  const [severity, setSeverity] = useState<SeverityLevel>("medium");
  const [actionLevel, setActionLevel] = useState<ActionLevel>(3);
  const [description, setDescription] = useState("");
  const [osType, setOsType] = useState<RuleOSType>("linux");
  const [enabled, setEnabled] = useState(true);

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteRule.mutateAsync(deleteTarget._id);
      toast.success("Detection rule deleted");
      setDeleteTarget(null);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleCreate = async () => {
    if (!name || !pattern) return;
    await createRule.mutateAsync({
      name, pattern, severity, action_level: actionLevel,
      description: description || undefined, os_type: osType,
      enabled, tags: [],
    });
    setShowForm(false);
    setName(""); setPattern(""); setDescription("");
  };

  return (
    <AppShell>
      <div className="p-6 md:p-10 max-w-7xl mx-auto">
        <div className="space-y-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/10 text-orange-500 text-xs font-bold mb-4 border border-orange-500/20">
                <Eye className="h-3.5 w-3.5" />
                DETECTION ENGINE
              </div>
              <h1 className="text-3xl md:text-5xl font-black tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
                SecOps Rules
              </h1>
              <p className="text-muted-foreground mt-2 max-w-xl leading-relaxed">
                Define powerful RegEx-based rules to scan infinite streams of logs. Instantly classify threats across hybrid infrastructure.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && executeSearch()}
                  placeholder="Search rules..."
                  className="pl-9 pr-4 py-2.5 rounded-xl bg-card border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all text-sm shadow-sm outline-none w-64"
                />
              </div>
              <button
                onClick={executeSearch}
                disabled={!searchInput.trim()}
                className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold shadow-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Search
              </button>
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all text-sm font-semibold shadow-xl shadow-primary/20 shrink-0"
              >
                <Plus className="h-4 w-4" /> Add Rule
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 bg-muted/30 p-1 rounded-xl border border-border">
              {(["all", "critical", "high", "medium", "low"] as const).map((sev) => (
                <button
                  key={sev}
                  onClick={() => setSeverityAndReset(sev)}
                  className={cn(
                    "px-4 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all",
                    filterSeverity === sev
                      ? "bg-card shadow-sm text-foreground border border-border"
                      : "text-muted-foreground hover:text-foreground border border-transparent"
                  )}
                >
                  {sev}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 bg-muted/30 p-1 rounded-xl border border-border">
              {(["all", "linux", "windows", "common"] as const).map((os) => (
                <button
                  key={os}
                  onClick={() => setOSAndReset(os)}
                  className={cn(
                    "px-4 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all",
                    filterOS === os
                      ? "bg-card shadow-sm text-foreground border border-border"
                      : "text-muted-foreground hover:text-foreground border border-transparent"
                  )}
                >
                  {os}
                </button>
              ))}
            </div>

            {/* Phase 28.5 — library scope filter */}
            <div
              className="flex items-center gap-2 bg-muted/30 p-1 rounded-xl border border-border"
              title="Filter by library scope: All shows everything, Global hides per-server private rules, Server-only shows just server-scoped rules"
            >
              {(["all", "global", "server"] as const).map((scope) => (
                <button
                  key={scope}
                  onClick={() => setScopeAndReset(scope)}
                  className={cn(
                    "px-4 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all",
                    filterScope === scope
                      ? "bg-card shadow-sm text-foreground border border-border"
                      : "text-muted-foreground hover:text-foreground border border-transparent"
                  )}
                >
                  {scope === "all" ? "All scopes" : scope === "global" ? "Global" : "Server-scoped"}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 bg-muted/30 p-1 rounded-xl border border-border ml-auto">
              {(["all", "true", "false"] as const).map((val) => (
                <button
                  key={val}
                  onClick={() => setEnabledAndReset(val)}
                  className={cn(
                    "px-4 py-1.5 text-xs font-semibold rounded-lg transition-all",
                    filterEnabled === val
                      ? "bg-card shadow-sm text-foreground border border-border"
                      : "text-muted-foreground hover:text-foreground border border-transparent"
                  )}
                >
                  {val === "all" ? "All" : val === "true" ? "Enabled" : "Disabled"}
                </button>
              ))}
            </div>
          </div>

          {/* Rules List */}
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-24 rounded-2xl bg-muted/60 animate-pulse border border-border" />
              ))}
            </div>
          ) : rules.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center border border-dashed border-border rounded-3xl bg-card/30">
              <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center text-muted-foreground mb-4">
                <LayoutGrid className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-bold">No detection rules found</h3>
              <p className="text-muted-foreground text-sm mt-1 mb-6 text-center max-w-sm">Build your RegEx signature database to start detecting anomalies.</p>
              <button
                onClick={() => setShowForm(true)}
                className="px-5 py-2.5 rounded-xl bg-card border border-border hover:border-primary/50 transition-all text-sm font-semibold shadow-sm text-foreground"
              >
                Create Signature
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {rules.map((rule) => (
                <div key={rule._id} className="group flex flex-col sm:flex-row justify-between items-start sm:items-center rounded-2xl border border-border bg-card p-5 transition-all hover:shadow-lg hover:-translate-y-0.5 relative overflow-hidden">

                  {/* Left Side Info */}
                  <div className="flex-1 min-w-0 flex items-start gap-4">
                     <div className="mt-1 flex items-center justify-center">
                        <div className={cn(
                          "w-2.5 h-2.5 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)]",
                          rule.enabled ? "bg-success shadow-success/50" : "bg-muted-foreground shadow-muted/50"
                        )} />
                     </div>
                     <div className="min-w-0 pr-6">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <h3 className={cn("text-lg font-bold tracking-tight", !rule.enabled && "text-muted-foreground")}>{rule.name}</h3>
                          <span className={cn(
                            "px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ml-2",
                            rule.severity === "critical" ? "bg-danger/10 text-danger"
                            : rule.severity === "high" ? "bg-orange-500/10 text-orange-500"
                            : rule.severity === "medium" ? "bg-warning/10 text-warning"
                            : "bg-blue-500/10 text-blue-500"
                          )}>
                             {rule.severity}
                          </span>
                          {/* Phase 28.5 — library ownership badge */}
                          <OwnerBadge ownerType={rule.owner_type} ownerId={rule.owner_id} link />
                        </div>
                        <div className="bg-muted/30 rounded inline-block px-2 py-0.5 mb-2 font-mono text-[11px] text-primary/70 truncate max-w-full italic border border-border/50">
                           /{rule.pattern}/i
                        </div>
                        <p className="text-xs text-muted-foreground truncate w-full">
                           {rule.description || "No description."}
                        </p>
                     </div>
                  </div>

                  {/* Right Side Stats & Actions */}
                  <div className="flex items-center gap-6 mt-4 sm:mt-0 pt-4 sm:pt-0 border-t sm:border-0 border-border w-full sm:w-auto pl-10 sm:pl-0 shrink-0">
                     <div className="flex flex-col gap-1 items-start sm:items-end">
                       <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Action Lvl</span>
                       <span className="text-sm font-semibold">{rule.action_level === 1 ? "Silent Fix" : rule.action_level === 2 ? "Fix + Alert" : "Alert Only"}</span>
                     </div>
                     <div className="flex flex-col gap-1 items-start sm:items-end">
                       <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Target</span>
                       <span className="text-sm font-semibold capitalize flex items-center gap-1"><Terminal className="h-3 w-3 text-muted-foreground"/>{rule.os_type}</span>
                     </div>

                     <div className="ml-4 pl-4 border-l border-border flex items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                       <Link
                         href={`/rules/${rule._id}`}
                         className="p-2 rounded-xl text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors bg-card border border-border shadow-sm"
                       >
                         <Eye className="h-4 w-4" />
                       </Link>
                       <button
                         onClick={() => setDeleteTarget(rule)}
                         className="p-2 rounded-xl text-muted-foreground hover:bg-danger/10 hover:text-danger transition-colors bg-card border border-border shadow-sm"
                       >
                         <Trash2 className="h-4 w-4" />
                       </button>
                     </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-muted-foreground">
                Page <span className="font-semibold text-foreground">{page}</span> of{" "}
                <span className="font-semibold text-foreground">{totalPages}</span>
                {" · "}
                <span className="font-semibold text-foreground">{data?.total ?? 0}</span> total
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
        </div>
      </div>

      {/* Detection Rule Modal */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Shield className="h-5 w-5 text-orange-500" />
              Detection Signature
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Rule Name</label>
              <input
                value={name} onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Detect Brute Force"
                className="w-full px-4 py-2.5 rounded-xl bg-muted/50 border border-border focus:border-primary/50 outline-none text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center justify-between">
                Pattern (RegEx)
                <span className="text-[9px] px-1.5 py-0.5 bg-muted rounded font-mono">case-insensitive</span>
              </label>
              <textarea
                value={pattern} onChange={(e) => setPattern(e.target.value)}
                placeholder="Failed password for (?:invalid user )?(\S+) from (\S+)"
                className="w-full px-4 py-3 rounded-xl bg-[#0f172a] text-yellow-500 border border-border focus:border-primary/50 outline-none text-xs font-mono h-28 resize-none"
                spellCheck={false}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Severity</label>
                <Select
                  value={severity}
                  onValueChange={(v) => setSeverity(v as SeverityLevel)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Action Level</label>
                <Select
                  value={String(actionLevel)}
                  onValueChange={(v) => setActionLevel(Number(v) as ActionLevel)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 - Log</SelectItem>
                    <SelectItem value="2">2 - Alert</SelectItem>
                    <SelectItem value="3">3 - Remediate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Target OS</label>
                <Select
                  value={osType}
                  onValueChange={(v) => setOsType(v as RuleOSType)}
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
                 <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Status</label>
                 <button
                   onClick={() => setEnabled(!enabled)}
                   className={cn(
                     "w-full px-4 py-2.5 rounded-xl border outline-none text-sm font-semibold transition-all flex items-center justify-center gap-2",
                     enabled ? "bg-success/10 text-success border-success/30" : "bg-muted text-muted-foreground border-border"
                   )}
                 >
                   <div className={cn("h-2 w-2 rounded-full", enabled ? "bg-success shadow-[0_0_8px_rgba(0,0,0,0.5)] shadow-success" : "bg-muted-foreground")} />
                   {enabled ? "Enabled" : "Disabled"}
                 </button>
              </div>
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 py-2.5 rounded-xl border border-border hover:bg-muted font-semibold text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate} disabled={!name || !pattern || createRule.isPending}
                className="flex-1 py-2.5 rounded-xl bg-orange-500 text-white font-semibold text-sm transition-all disabled:opacity-50 shadow-lg shadow-orange-500/20 hover:bg-orange-600"
              >
                {createRule.isPending ? "Creating..." : "Save Rule"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Detection Rule"
        message={
          deleteTarget
            ? `Permanently remove "${deleteTarget.name}"? Logs that match this signature will no longer be classified or trigger automated responses.`
            : ""
        }
        confirmLabel="Delete Rule"
        isPending={deleteRule.isPending}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </AppShell>
  );
}
