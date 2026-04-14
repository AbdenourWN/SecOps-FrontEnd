"use client";

import { use, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { useScript, useUpdateScript, useRemediationHistory } from "@/lib/hooks/use-scripts";
import { timeAgo } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Terminal,
  Clock,
  FileText,
  CheckCircle2,
  XCircle,
  Server,
  ExternalLink,
  Code,
  Code2,
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
import type { ScriptLanguage } from "@/lib/types";

const LANG_CONFIG: Record<string, { label: string; color: string; textColor: string }> = {
  bash:       { label: "Bash",       color: "bg-green-500/10  border-green-500/30",  textColor: "text-green-500"  },
  python:     { label: "Python",     color: "bg-yellow-500/10 border-yellow-500/30", textColor: "text-yellow-500" },
  powershell: { label: "PowerShell", color: "bg-blue-500/10   border-blue-500/30",   textColor: "text-blue-400"   },
};

const CODE_COLOR: Record<string, string> = {
  bash:       "text-green-400",
  python:     "text-yellow-300",
  powershell: "text-blue-300",
};

export default function ScriptDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: script, isLoading } = useScript(id);
  const { data: history } = useRemediationHistory({ script_id: id, limit: 8 });
  const updateScript = useUpdateScript();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState<ScriptLanguage>("bash");
  const [content, setContent] = useState("");
  const [targetOs, setTargetOs] = useState("linux");

  const startEditing = () => {
    if (!script) return;
    setName(script.name);
    setDescription(script.description || "");
    setLanguage(script.language as ScriptLanguage);
    setContent(script.content);
    setTargetOs(script.target_os || "linux");
    setEditing(true);
  };

  const handleSave = async () => {
    if (!name || !content) return;
    try {
      await updateScript.mutateAsync({
        id,
        data: {
          name,
          description: description || undefined,
          language,
          content,
          target_os: targetOs,
        },
      });
      toast.success("Script updated");
      setEditing(false);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  if (isLoading) {
    return (
      <AppShell>
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-72 bg-muted rounded" />
          <div className="h-80 bg-muted rounded-xl" />
        </div>
      </AppShell>
    );
  }

  if (!script) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-muted-foreground">Script not found.</p>
          <Link href="/automation" className="mt-4 text-sm text-primary hover:underline">
            Back to playbooks
          </Link>
        </div>
      </AppShell>
    );
  }

  const langCfg = LANG_CONFIG[script.language] ?? LANG_CONFIG.bash;
  const codeColor = CODE_COLOR[script.language] ?? "text-green-400";

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start gap-3">
          <Link
            href="/automation"
            className="mt-1 flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold">{script.name}</h1>
              <span
                className={cn(
                  "inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold border uppercase tracking-wider",
                  langCfg.color,
                  langCfg.textColor
                )}
              >
                {langCfg.label}
              </span>
              {script.target_os && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-muted text-muted-foreground border border-border capitalize">
                  <Terminal className="h-3 w-3" />
                  {script.target_os}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground font-mono mt-1">
              ID: {script._id}
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
            <button
              onClick={startEditing}
              className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors bg-primary/10 text-primary hover:bg-primary/20 border border-primary/30 shrink-0"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </button>
          )}
        </div>

        {editing ? (
          /* ── Edit Form ── */
          <div className="rounded-3xl border border-border bg-card shadow-2xl p-6 lg:p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 h-40 w-40 bg-primary/10 blur-3xl pointer-events-none rounded-full -translate-y-1/2 translate-x-1/2" />

            <h2 className="text-lg font-bold mb-6 flex items-center gap-2 relative z-10">
              <Code2 className="h-5 w-5 text-primary" />
              Edit Playbook
            </h2>

            <div className="space-y-4 relative z-10 max-w-2xl">
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  Playbook Name
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-muted/50 border border-border focus:border-primary/50 outline-none text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  Description
                </label>
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What does this do?"
                  className="w-full px-4 py-2.5 rounded-xl bg-muted/50 border border-border focus:border-primary/50 outline-none text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                    Environment
                  </label>
                  <Select
                    value={language}
                    onValueChange={(v) => v && setLanguage(v as ScriptLanguage)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bash">Bash</SelectItem>
                      <SelectItem value="python">Python</SelectItem>
                      <SelectItem value="powershell">PowerShell</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                    Target OS
                  </label>
                  <Select value={targetOs} onValueChange={(v) => v && setTargetOs(v)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="linux">Linux</SelectItem>
                      <SelectItem value="windows">Windows</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  Script Content
                  <span className="text-[9px] text-primary bg-primary/10 px-1.5 py-0.5 rounded font-mono normal-case tracking-normal">
                    {"{{var}}"} supported
                  </span>
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-[#0a0f1e] text-green-400 border border-border focus:border-primary/50 outline-none text-xs font-mono h-48 resize-none"
                  spellCheck={false}
                />
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  onClick={() => setEditing(false)}
                  className="flex-1 py-2.5 rounded-xl border border-border hover:bg-muted font-semibold text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!name || !content || updateScript.isPending}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-white font-semibold text-sm transition-all disabled:opacity-50 shadow-lg shadow-primary/20 hover:bg-primary/90"
                >
                  {updateScript.isPending ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ── Detail View ── */
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Script Content */}
              <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Code className="h-3.5 w-3.5" />
                  Script Content
                </h3>
                <div className="relative">
                  <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/30 text-[10px] font-mono text-muted-foreground uppercase tracking-wider border border-white/5">
                    {script.language}
                  </div>
                  <pre
                    className={cn(
                      "bg-[#0a0f1e] rounded-xl border border-border p-5 font-mono text-xs leading-relaxed overflow-x-auto overflow-y-auto max-h-[480px]",
                      codeColor
                    )}
                  >
                    {script.content}
                  </pre>
                </div>
              </div>

              {/* Description */}
              <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5" />
                  Description
                </h3>
                <p className="text-sm leading-relaxed">
                  {script.description || (
                    <span className="text-muted-foreground italic">No description provided.</span>
                  )}
                </p>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              {/* Meta */}
              <div className="rounded-xl border border-border bg-card p-5 space-y-5">
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Clock className="h-3 w-3" />
                    Created
                  </label>
                  <p className="text-sm">{new Date(script.created_at).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{timeAgo(script.created_at)}</p>
                </div>

                {script.target_os && (
                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <Terminal className="h-3 w-3" />
                      Target OS
                    </label>
                    <span className="text-sm font-semibold capitalize">{script.target_os}</span>
                  </div>
                )}

                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block">
                    Lines
                  </label>
                  <span className="text-sm font-semibold font-mono">
                    {script.content.split("\n").length}
                  </span>
                </div>
              </div>

              {/* Recent Runs */}
              <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center justify-between">
                  <span>Recent Executions</span>
                  <Link
                    href={`/automation/history?script_id=${script._id}`}
                    className="text-primary hover:underline normal-case font-medium"
                  >
                    View all
                  </Link>
                </h3>

                {!history || history.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No executions yet.</p>
                ) : (
                  <div className="space-y-2">
                    {history.map((run) => (
                      <div
                        key={run._id}
                        className="flex items-center gap-3 rounded-lg bg-muted/30 px-3 py-2.5 border border-border/50"
                      >
                        {run.status === "success" ? (
                          <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
                        ) : (
                          <XCircle className="h-4 w-4 text-danger shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 text-xs">
                            <Server className="h-3 w-3 text-muted-foreground shrink-0" />
                            <span className="font-semibold truncate">{run.server_hostname}</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {timeAgo(run.executed_at)}
                          </p>
                        </div>
                        <Link
                          href={`/incidents/${run.incident_id}`}
                          className="text-muted-foreground hover:text-primary transition-colors shrink-0"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </div>
                    ))}
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
