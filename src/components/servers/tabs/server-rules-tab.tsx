"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertCircle, Plus, Settings, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { getFriendlyMessage } from "@/lib/errors";
import { useRules, useCreateServerRule, useDeleteRule } from "@/lib/hooks/use-rules";
import { useServer } from "@/lib/hooks/use-servers";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  SeverityLevel,
  ActionLevel,
  RuleOSType,
  DetectionRule,
} from "@/lib/types";

interface ServerRulesTabProps {
  serverId: string;
}

/**
 * Phase 28.5 — per-server private rule library. Lists only rules with
 * `owner_type=server, owner_id={serverId}`. Operators can create / delete
 * rules scoped to this server only.
 *
 * Soft failure-mode banner: if the server's `rule_library_mode` is still
 * `global`, these rules exist in the DB but will never fire. The banner
 * explains how to fix it.
 */
export function ServerRulesTab({ serverId }: ServerRulesTabProps) {
  const { data: server } = useServer(serverId);
  const { data: rulesData, isLoading } = useRules({
    owner_type: "server",
    owner_id: serverId,
    page: 1,
    page_size: 100,
  });
  const createRule = useCreateServerRule(serverId);
  const deleteRule = useDeleteRule();

  const rules = rulesData?.results ?? [];
  const libraryMode = server?.rule_library_mode ?? "global";
  const dormant = libraryMode === "global" && rules.length > 0;

  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DetectionRule | null>(null);

  const [name, setName] = useState("");
  const [pattern, setPattern] = useState("");
  const [severity, setSeverity] = useState<SeverityLevel>("medium");
  const [actionLevel, setActionLevel] = useState<ActionLevel>(3);
  const [description, setDescription] = useState("");
  const [osType, setOsType] = useState<RuleOSType>("linux");

  const resetForm = () => {
    setName(""); setPattern(""); setSeverity("medium");
    setActionLevel(3); setDescription(""); setOsType("linux");
  };

  const handleCreate = async () => {
    if (!name || !pattern) {
      toast.error("Name and pattern are required");
      return;
    }
    try {
      await createRule.mutateAsync({
        name,
        pattern,
        severity,
        action_level: actionLevel,
        description: description || undefined,
        enabled: true,
        os_type: osType,
        tags: [],
      });
      toast.success("Server-scoped rule created");
      setShowForm(false);
      resetForm();
    } catch (err) {
      toast.error(getFriendlyMessage(err));
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteRule.mutateAsync(deleteTarget._id);
      toast.success("Rule deleted");
      setDeleteTarget(null);
    } catch (err) {
      toast.error(getFriendlyMessage(err));
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Private rule library</h2>
          <p className="text-xs text-muted-foreground">
            Detection rules scoped to this server only. The global library still applies in <b>Both</b> mode.
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all text-sm font-semibold shrink-0"
        >
          <Plus className="h-4 w-4" /> New rule
        </button>
      </div>

      {/* Dormant warning (private rules exist but library mode hides them) */}
      {dormant && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-200">
          <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
          <div className="flex-1">
            <div className="font-semibold mb-0.5">Server library mode is set to <span className="text-amber-100">Global only</span></div>
            <div className="text-amber-200/80 leading-relaxed">
              The {rules.length} private rule{rules.length === 1 ? "" : "s"} below are saved but <b>will not fire</b> on this server. Switch to <b>Server-only</b> or <b>Both</b> on the edit page to activate them. Switching back will deactivate without deleting.
            </div>
            <Link
              href={`/servers/${serverId}/edit`}
              className="inline-flex items-center gap-1 mt-2 text-amber-100 hover:text-white font-semibold underline-offset-4 hover:underline"
            >
              <Settings className="h-3.5 w-3.5" /> Open server edit page
            </Link>
          </div>
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 rounded-2xl bg-muted/60 animate-pulse border border-border" />
          ))}
        </div>
      ) : rules.length === 0 ? (
        <div className="py-16 flex flex-col items-center justify-center border border-dashed border-border rounded-2xl bg-card/30">
          <h3 className="text-base font-bold">No private rules yet</h3>
          <p className="text-muted-foreground text-sm mt-1 mb-4 text-center max-w-sm">
            Add detection rules specific to this server, or have the AI propose them from the anomalies and overview tabs.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 rounded-lg bg-card border border-border hover:border-primary/50 text-sm font-semibold"
          >
            Create first rule
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <div key={rule._id} className="flex items-start justify-between gap-4 rounded-2xl border border-border bg-card p-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h3 className={cn("text-base font-bold", !rule.enabled && "text-muted-foreground")}>{rule.name}</h3>
                  <span className={cn(
                    "px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider",
                    rule.severity === "critical" ? "bg-danger/10 text-danger"
                    : rule.severity === "high" ? "bg-orange-500/10 text-orange-500"
                    : rule.severity === "medium" ? "bg-warning/10 text-warning"
                    : "bg-blue-500/10 text-blue-500"
                  )}>{rule.severity}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-muted text-muted-foreground">
                    {rule.os_type}
                  </span>
                </div>
                <div className="bg-muted/30 rounded inline-block px-2 py-0.5 mb-1 font-mono text-[11px] text-primary/70 italic border border-border/50">
                  /{rule.pattern}/i
                </div>
                {rule.description && (
                  <p className="text-xs text-muted-foreground">{rule.description}</p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Link
                  href={`/rules/${rule._id}`}
                  className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  title="Edit rule"
                >
                  <Settings className="h-4 w-4" />
                </Link>
                <button
                  onClick={() => setDeleteTarget(rule)}
                  className="p-2 rounded-lg hover:bg-danger/10 text-muted-foreground hover:text-danger transition-colors"
                  title="Delete rule"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={showForm} onOpenChange={(o) => { setShowForm(o); if (!o) resetForm(); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>New server-scoped rule</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Rule name (e.g. 'App X — auth failure spike')"
              className="w-full px-3 py-2 rounded-lg bg-card border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary/50 text-sm outline-none"
            />
            <input
              type="text"
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              placeholder="Regex pattern (Python regex, case-insensitive)"
              className="w-full px-3 py-2 rounded-lg bg-card border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary/50 text-sm outline-none font-mono"
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description (optional)"
              rows={2}
              className="w-full px-3 py-2 rounded-lg bg-card border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary/50 text-sm outline-none"
            />
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Severity</label>
                <Select value={severity} onValueChange={(v) => setSeverity(v as SeverityLevel)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Action level</label>
                <Select value={String(actionLevel)} onValueChange={(v) => setActionLevel(Number(v) as ActionLevel)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">L1 — Auto-remediate</SelectItem>
                    <SelectItem value="2">L2 — Auto-remediate</SelectItem>
                    <SelectItem value="3">L3 — Alert only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">OS</label>
                <Select value={osType} onValueChange={(v) => setOsType(v as RuleOSType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="linux">Linux</SelectItem>
                    <SelectItem value="windows">Windows</SelectItem>
                    <SelectItem value="common">Common</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => { setShowForm(false); resetForm(); }}
                className="px-4 py-2 rounded-lg border border-border hover:bg-muted text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={createRule.isPending || !name || !pattern}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 text-sm font-semibold"
              >
                {createRule.isPending ? "Creating…" : "Create rule"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete rule?"
        message={`This will permanently delete '${deleteTarget?.name}'. The server-scoped rule will be removed from the private library.`}
        confirmLabel="Delete"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
