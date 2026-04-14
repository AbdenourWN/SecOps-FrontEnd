"use client";

import { use, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { useRule, useUpdateRule } from "@/lib/hooks/use-rules";
import { SeverityBadge } from "@/components/shared/badges";
import { timeAgo } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Shield,
  Terminal,
  Tag,
  Clock,
  Zap,
  Bell,
  FileText,
  ExternalLink,
  Power,
  Code,
  Pencil,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SeverityLevel, ActionLevel, RuleOSType } from "@/lib/types";

const ACTION_LEVEL = {
  1: {
    label: "Log Only",
    description: "Record the event to logs, no alert",
    color: "text-blue-400 bg-blue-500/10 border-blue-500/30",
    icon: FileText,
  },
  2: {
    label: "Alert",
    description: "Create an incident and notify",
    color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30",
    icon: Bell,
  },
  3: {
    label: "Remediate",
    description: "Auto-execute the linked remediation script",
    color: "text-green-400 bg-green-500/10 border-green-500/30",
    icon: Zap,
  },
} as const;

export default function RuleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: rule, isLoading } = useRule(id);
  const updateRule = useUpdateRule();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [pattern, setPattern] = useState("");
  const [severity, setSeverity] = useState<SeverityLevel>("medium");
  const [actionLevel, setActionLevel] = useState<ActionLevel>(2);
  const [description, setDescription] = useState("");
  const [osType, setOsType] = useState<RuleOSType>("linux");
  const [enabled, setEnabled] = useState(true);
  const [tagsInput, setTagsInput] = useState("");

  const startEditing = () => {
    if (!rule) return;
    setName(rule.name);
    setPattern(rule.pattern);
    setSeverity(rule.severity);
    setActionLevel(rule.action_level);
    setDescription(rule.description || "");
    setOsType(rule.os_type);
    setEnabled(rule.enabled);
    setTagsInput(rule.tags.join(", "));
    setEditing(true);
  };

  const handleSave = async () => {
    if (!name || !pattern) return;
    try {
      await updateRule.mutateAsync({
        id,
        data: {
          name,
          pattern,
          severity,
          action_level: actionLevel,
          description: description || undefined,
          os_type: osType,
          enabled,
          tags: tagsInput
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
        },
      });
      toast.success("Rule updated");
      setEditing(false);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleToggle = async () => {
    if (!rule) return;
    try {
      await updateRule.mutateAsync({ id, data: { enabled: !rule.enabled } });
      toast.success(`Rule ${rule.enabled ? "disabled" : "enabled"}`);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  if (isLoading) {
    return (
      <AppShell>
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-72 bg-muted rounded" />
          <div className="h-64 bg-muted rounded-xl" />
        </div>
      </AppShell>
    );
  }

  if (!rule) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-muted-foreground">Rule not found.</p>
          <Link href="/rules" className="mt-4 text-sm text-primary hover:underline">
            Back to rules
          </Link>
        </div>
      </AppShell>
    );
  }

  const actionCfg = ACTION_LEVEL[rule.action_level];
  const ActionIcon = actionCfg.icon;

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start gap-3">
          <Link
            href="/rules"
            className="mt-1 flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold">{rule.name}</h1>
              <SeverityBadge severity={rule.severity} />
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold border",
                  rule.enabled
                    ? "text-green-400 bg-green-500/10 border-green-500/30"
                    : "text-slate-400 bg-slate-500/10 border-slate-500/20"
                )}
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    rule.enabled ? "bg-green-400 animate-pulse" : "bg-slate-500"
                  )}
                />
                {rule.enabled ? "Enabled" : "Disabled"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground font-mono mt-1">
              ID: {rule._id}
            </p>
          </div>
          {editing ? (
            <button
              onClick={() => setEditing(false)}
              className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors bg-muted text-muted-foreground hover:bg-muted/80 border border-border shrink-0"
            >
              <X className="h-3.5 w-3.5" />
              Cancel
            </button>
          ) : (
            <>
              <button
                onClick={startEditing}
                className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors bg-primary/10 text-primary hover:bg-primary/20 border border-primary/30 shrink-0"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </button>
              <button
                onClick={handleToggle}
                disabled={updateRule.isPending}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 shrink-0",
                  rule.enabled
                    ? "bg-muted text-muted-foreground hover:bg-danger/10 hover:text-danger border border-border"
                    : "bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/30"
                )}
              >
                <Power className="h-3.5 w-3.5" />
                {rule.enabled ? "Disable" : "Enable"}
              </button>
            </>
          )}
        </div>

        {editing ? (
          /* ── Edit Form ── */
          <div className="rounded-3xl border border-border bg-card shadow-2xl p-6 lg:p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 h-40 w-40 bg-orange-500/10 blur-3xl pointer-events-none rounded-full -translate-y-1/2 translate-x-1/2" />

            <h2 className="text-lg font-bold mb-6 flex items-center gap-2 relative z-10">
              <Shield className="h-5 w-5 text-orange-500" />
              Edit Detection Rule
            </h2>

            <div className="space-y-4 relative z-10 max-w-2xl">
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  Rule Name
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-muted/50 border border-border focus:border-primary/50 outline-none text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  Pattern (RegEx)
                  <span className="text-[9px] px-1.5 py-0.5 bg-muted rounded font-mono">
                    case-insensitive
                  </span>
                </label>
                <textarea
                  value={pattern}
                  onChange={(e) => setPattern(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-[#0f172a] text-yellow-500 border border-border focus:border-primary/50 outline-none text-xs font-mono h-24 resize-none"
                  spellCheck={false}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                    Severity
                  </label>
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
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                    Action Level
                  </label>
                  <Select
                    value={String(actionLevel)}
                    onValueChange={(v) => v && setActionLevel(Number(v) as ActionLevel)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 – Log Only</SelectItem>
                      <SelectItem value="2">2 – Alert</SelectItem>
                      <SelectItem value="3">3 – Remediate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                    Target OS
                  </label>
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
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                    Status
                  </label>
                  <button
                    onClick={() => setEnabled(!enabled)}
                    className={cn(
                      "w-full px-4 py-2.5 rounded-xl border outline-none text-sm font-semibold transition-all flex items-center justify-center gap-2",
                      enabled
                        ? "bg-success/10 text-success border-success/30"
                        : "bg-muted text-muted-foreground border-border"
                    )}
                  >
                    <div
                      className={cn(
                        "h-2 w-2 rounded-full",
                        enabled
                          ? "bg-success shadow-[0_0_8px_rgba(0,0,0,0.5)] shadow-success"
                          : "bg-muted-foreground"
                      )}
                    />
                    {enabled ? "Enabled" : "Disabled"}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  Description
                </label>
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What does this rule detect?"
                  className="w-full px-4 py-2.5 rounded-xl bg-muted/50 border border-border focus:border-primary/50 outline-none text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  Tags
                  <span className="ml-2 text-[9px] px-1.5 py-0.5 bg-muted rounded font-mono normal-case tracking-normal">
                    comma-separated
                  </span>
                </label>
                <input
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="brute-force, ssh, authentication"
                  className="w-full px-4 py-2.5 rounded-xl bg-muted/50 border border-border focus:border-primary/50 outline-none text-sm"
                />
              </div>

              <div className="pt-4 flex items-center gap-3">
                <button
                  onClick={() => setEditing(false)}
                  className="flex-1 py-2.5 rounded-xl border border-border hover:bg-muted font-semibold text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!name || !pattern || updateRule.isPending}
                  className="flex-1 py-2.5 rounded-xl bg-orange-500 text-white font-semibold text-sm transition-all disabled:opacity-50 shadow-lg shadow-orange-500/20 hover:bg-orange-600"
                >
                  {updateRule.isPending ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ── Detail View ── */
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Pattern */}
              <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Code className="h-3.5 w-3.5" />
                  Detection Pattern
                </h3>
                <div className="bg-[#0f172a] rounded-xl border border-border p-4 overflow-x-auto">
                  <pre className="font-mono text-sm text-yellow-400 whitespace-pre-wrap break-all">
                    /{rule.pattern}/i
                  </pre>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Applied as a case-insensitive regular expression against incoming log lines.
                </p>
              </div>

              {/* Description */}
              <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5" />
                  Description
                </h3>
                <p className="text-sm leading-relaxed">
                  {rule.description || (
                    <span className="text-muted-foreground italic">No description provided.</span>
                  )}
                </p>
              </div>

              {/* Tags */}
              {rule.tags.length > 0 && (
                <div className="rounded-xl border border-border bg-card p-5">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Tag className="h-3.5 w-3.5" />
                    Tags
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {rule.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2.5 py-1 rounded-md text-xs font-semibold bg-primary/10 text-primary border border-primary/20"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-card p-5 space-y-5">
                {/* Action Level */}
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">
                    Action Level
                  </label>
                  <div
                    className={cn(
                      "flex items-start gap-3 rounded-lg border p-3",
                      actionCfg.color
                    )}
                  >
                    <ActionIcon className="h-4 w-4 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-bold">{actionCfg.label}</p>
                      <p className="text-xs opacity-75 mt-0.5">{actionCfg.description}</p>
                    </div>
                  </div>
                </div>

                {/* Target OS */}
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block flex items-center gap-1.5">
                    <Terminal className="h-3 w-3" />
                    Target OS
                  </label>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted text-sm font-semibold capitalize">
                    {rule.os_type}
                  </span>
                </div>

                {/* Created */}
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block flex items-center gap-1.5">
                    <Clock className="h-3 w-3" />
                    Created
                  </label>
                  <p className="text-sm">{new Date(rule.created_at).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{timeAgo(rule.created_at)}</p>
                </div>

                {/* Remediation Script */}
                {rule.remediation_script_id && (
                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <Shield className="h-3 w-3" />
                      Remediation Script
                    </label>
                    <Link
                      href={`/automation/${rule.remediation_script_id}`}
                      className="flex items-center gap-1.5 text-sm text-primary hover:underline"
                    >
                      {rule.remediation_script_id.slice(0, 12)}…
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
