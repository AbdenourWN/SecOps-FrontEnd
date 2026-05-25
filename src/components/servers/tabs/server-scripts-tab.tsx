"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertCircle, Code2, Plus, Settings, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useScripts, useCreateServerScript, useDeleteScript } from "@/lib/hooks/use-scripts";
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
import type { ScriptLanguage, ScriptResponse } from "@/lib/types";

interface ServerScriptsTabProps {
  serverId: string;
}

/**
 * Phase 28.5 — per-server private script library. Listed only when
 * `owner_type=server, owner_id={serverId}`. Name-match resolution in the
 * backend automatically prefers any of these scripts over a global one
 * with the same name when the server is in Server-only or Both mode.
 */
export function ServerScriptsTab({ serverId }: ServerScriptsTabProps) {
  const { data: server } = useServer(serverId);
  const { data: scriptsData, isLoading } = useScripts({
    owner_type: "server",
    owner_id: serverId,
    page: 1,
    page_size: 100,
  });
  const createScript = useCreateServerScript(serverId);
  const deleteScript = useDeleteScript();

  const scripts = scriptsData?.results ?? [];
  const libraryMode = server?.script_library_mode ?? "global";
  const dormant = libraryMode === "global" && scripts.length > 0;

  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ScriptResponse | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState<ScriptLanguage>("bash");
  const [content, setContent] = useState("");
  const [targetOs, setTargetOs] = useState("linux");
  const [category, setCategory] = useState<"diagnostic" | "containment" | "recovery">("recovery");

  const resetForm = () => {
    setName(""); setDescription(""); setLanguage("bash");
    setContent(""); setTargetOs("linux"); setCategory("recovery");
  };

  const handleCreate = async () => {
    if (!name || !content) {
      toast.error("Name and script content are required");
      return;
    }
    try {
      await createScript.mutateAsync({
        name,
        description: description || undefined,
        language,
        content,
        target_os: targetOs,
        category,
      });
      toast.success("Server-scoped script created");
      setShowForm(false);
      resetForm();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteScript.mutateAsync(deleteTarget._id);
      toast.success("Script deleted");
      setDeleteTarget(null);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Private script library</h2>
          <p className="text-xs text-muted-foreground">
            Remediation scripts scoped to this server only. A server-scoped script with the same name as a global one automatically overrides it on this server.
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all text-sm font-semibold shrink-0"
        >
          <Plus className="h-4 w-4" /> New script
        </button>
      </div>

      {dormant && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-200">
          <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
          <div className="flex-1">
            <div className="font-semibold mb-0.5">Server library mode is set to <span className="text-amber-100">Global only</span></div>
            <div className="text-amber-200/80 leading-relaxed">
              The {scripts.length} private script{scripts.length === 1 ? "" : "s"} below are saved but <b>will not run</b> on this server. Switch to <b>Server-only</b> or <b>Both</b> on the edit page to activate them. Switching back will deactivate without deleting.
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

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 rounded-2xl bg-muted/60 animate-pulse border border-border" />
          ))}
        </div>
      ) : scripts.length === 0 ? (
        <div className="py-16 flex flex-col items-center justify-center border border-dashed border-border rounded-2xl bg-card/30">
          <Code2 className="h-8 w-8 text-muted-foreground mb-2" />
          <h3 className="text-base font-bold">No private scripts yet</h3>
          <p className="text-muted-foreground text-sm mt-1 mb-4 text-center max-w-sm">
            Add remediation scripts specific to this server, or let the AI propose replacements when a global script keeps failing.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 rounded-lg bg-card border border-border hover:border-primary/50 text-sm font-semibold"
          >
            Create first script
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {scripts.map((script) => (
            <div key={script._id} className="flex items-start justify-between gap-4 rounded-2xl border border-border bg-card p-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h3 className={cn("text-base font-bold", !script.enabled && "text-muted-foreground")}>{script.name}</h3>
                  <span className={cn(
                    "px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider",
                    script.language === "bash" ? "bg-green-500/10 text-green-500"
                    : script.language === "python" ? "bg-yellow-500/10 text-yellow-500"
                    : "bg-blue-500/10 text-blue-500"
                  )}>{script.language}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-muted text-muted-foreground">
                    {script.target_os || "linux"}
                  </span>
                  {script.category && (
                    <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-muted text-muted-foreground">
                      {script.category}
                    </span>
                  )}
                </div>
                {script.description && (
                  <p className="text-xs text-muted-foreground">{script.description}</p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Link
                  href={`/automation/${script._id}`}
                  className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  title="Edit script"
                >
                  <Settings className="h-4 w-4" />
                </Link>
                <button
                  onClick={() => setDeleteTarget(script)}
                  className="p-2 rounded-lg hover:bg-danger/10 text-muted-foreground hover:text-danger transition-colors"
                  title="Delete script"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={(o) => { setShowForm(o); if (!o) resetForm(); }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>New server-scoped script</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Script name (matches a global name to override on this server)"
              className="w-full px-3 py-2 rounded-lg bg-card border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary/50 text-sm outline-none"
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
                <label className="text-xs text-muted-foreground mb-1 block">Language</label>
                <Select value={language} onValueChange={(v) => setLanguage(v as ScriptLanguage)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bash">Bash</SelectItem>
                    <SelectItem value="powershell">PowerShell</SelectItem>
                    <SelectItem value="python">Python</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Target OS</label>
                <Select value={targetOs} onValueChange={(v) => v && setTargetOs(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="linux">Linux</SelectItem>
                    <SelectItem value="windows">Windows</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Category</label>
                <Select value={category} onValueChange={(v) => setCategory(v as typeof category)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="diagnostic">Diagnostic</SelectItem>
                    <SelectItem value="containment">Containment</SelectItem>
                    <SelectItem value="recovery">Recovery</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={language === "powershell" ? "# PowerShell content…" : language === "python" ? "# Python content…" : "# Bash content…"}
              rows={10}
              className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary/50 text-xs outline-none font-mono text-zinc-200"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => { setShowForm(false); resetForm(); }}
                className="px-4 py-2 rounded-lg border border-border hover:bg-muted text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={createScript.isPending || !name || !content}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 text-sm font-semibold"
              >
                {createScript.isPending ? "Creating…" : "Create script"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete script?"
        message={`This will permanently delete '${deleteTarget?.name}'. The server-scoped script will be removed from the private library.`}
        confirmLabel="Delete"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
