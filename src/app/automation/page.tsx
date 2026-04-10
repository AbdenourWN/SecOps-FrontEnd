"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { useScripts, useCreateScript, useDeleteScript } from "@/lib/hooks/use-scripts";
import { Terminal, Plus, Trash2, Cpu, Code2, History } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { timeAgo, cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import type { ScriptLanguage, ScriptResponse } from "@/lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function AutomationPage() {
  const { data: scripts, isLoading } = useScripts();
  const createScript = useCreateScript();
  const deleteScript = useDeleteScript();

  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ScriptResponse | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState<ScriptLanguage>("bash");
  const [content, setContent] = useState("");
  const [targetOs, setTargetOs] = useState("linux");

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteScript.mutateAsync(deleteTarget._id);
      toast.success("Playbook deleted");
      setDeleteTarget(null);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleCreate = async () => {
    if (!name || !content) return;
    await createScript.mutateAsync({
      name, description: description || undefined, language, content, target_os: targetOs
    });
    setShowForm(false);
    setName(""); setContent(""); setDescription("");
  };

  return (
    <AppShell>
      <div className="p-6 md:p-10 max-w-7xl mx-auto flex flex-col lg:flex-row gap-8">
        
        {/* Main Content */}
        <div className="flex-1 space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/10 text-secondary text-xs font-bold mb-4 border border-secondary/20">
                <Terminal className="h-3.5 w-3.5" />
                AUTOMATION
              </div>
              <h1 className="text-3xl md:text-5xl font-black tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
                Response Scripts
              </h1>
              <p className="text-muted-foreground mt-2 max-w-xl leading-relaxed">
                Configure auto-remediation playbooks executed instantly on target nodes when specific detection rules are triggered.
              </p>
            </div>
            {!showForm && (
              <div className="flex items-center gap-3">
                <Link
                  href="/automation/history"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-card border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-sm font-semibold shadow-sm"
                >
                  <History className="h-4 w-4" /> View History
                </Link>
                <button
                  onClick={() => setShowForm(true)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all text-sm font-semibold shadow-xl shadow-primary/20"
                >
                  <Plus className="h-4 w-4" /> New Playbook
                </button>
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-56 rounded-3xl bg-muted/60 animate-pulse border border-border" />
              ))}
            </div>
          ) : !scripts || scripts.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center border border-dashed border-border rounded-3xl bg-card/30">
              <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center text-muted-foreground mb-4">
                <Code2 className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-bold">No scripts configured</h3>
              <p className="text-muted-foreground text-sm mt-1 mb-6 text-center max-w-sm">Create your first automated response playbook to enable self-healing infrastructure.</p>
              <button 
                onClick={() => setShowForm(true)}
                className="px-5 py-2.5 rounded-xl bg-card border border-border hover:border-primary/50 transition-all text-sm font-semibold shadow-sm text-foreground"
              >
                Create Playbook
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {scripts.map((script) => (
                <div key={script._id} className="group flex flex-col justify-between rounded-3xl border border-border bg-card p-6 transition-all hover:shadow-xl hover:-translate-y-1 hover:border-primary/40 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setDeleteTarget(script)}
                      className="p-2 rounded-lg bg-danger/10 text-danger hover:bg-danger hover:text-white transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <span className={cn(
                        "px-2.5 py-1 rounded-md text-[10px] uppercase font-bold tracking-wider",
                        script.language === "bash" ? "bg-green-500/10 text-green-500"
                        : script.language === "python" ? "bg-yellow-500/10 text-yellow-500"
                        : "bg-blue-500/10 text-blue-500"
                      )}>
                        {script.language}
                      </span>
                      <span className="px-2.5 py-1 rounded-md text-[10px] uppercase font-bold tracking-wider bg-muted text-muted-foreground">
                        {script.target_os || "Linux"}
                      </span>
                    </div>
                    
                    <h3 className="text-xl font-bold tracking-tight mb-2 pr-10">{script.name}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 min-h-[40px]">
                      {script.description || "No description provided for this playbook."}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-border flex flex-col gap-3">
                    <div className="bg-muted/50 rounded-xl p-3 font-mono text-xs text-muted-foreground truncate border border-border/50 select-all">
                      {script.content.split('\n')[0].substring(0, 50)}{script.content.length > 50 ? '...' : ''}
                    </div>
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                      Created {timeAgo(script.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar Creation Form */}
        {showForm && (
          <div className="w-full lg:w-[400px] shrink-0">
            <div className="sticky top-6 rounded-3xl border border-border bg-card shadow-2xl p-6 lg:p-8 animate-in slide-in-from-right-8 duration-300">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Code2 className="h-5 w-5 text-primary" />
                New Playbook
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Playbook Name</label>
                  <input 
                    value={name} onChange={(e) => setName(e.target.value)} 
                    placeholder="e.g. Block Malicious IP" 
                    className="w-full px-4 py-2.5 rounded-xl bg-muted/50 border border-border focus:border-primary/50 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Description</label>
                  <input 
                    value={description} onChange={(e) => setDescription(e.target.value)} 
                    placeholder="What does this do?" 
                    className="w-full px-4 py-2.5 rounded-xl bg-muted/50 border border-border focus:border-primary/50 outline-none text-sm"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Environment</label>
                    <Select
                      value={language}
                      onValueChange={(v) => setLanguage(v as ScriptLanguage)}
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
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Target OS</label>
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
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block flex items-center justify-between">
                    Script Content
                    <span className="text-[9px] text-primary bg-primary/10 px-1.5 py-0.5 rounded font-mono">{"{{var}}"} supported</span>
                  </label>
                  <textarea 
                    value={content} onChange={(e) => setContent(e.target.value)} 
                    placeholder="iptables -A INPUT -s {{source_ip}} -j DROP" 
                    className="w-full px-4 py-3 rounded-xl bg-[#0f172a] text-green-400 border border-border focus:border-primary/50 outline-none text-xs font-mono h-32 resize-none"
                    spellCheck={false}
                  />
                </div>

                <div className="pt-2 flex items-center gap-3">
                  <button 
                    onClick={() => setShowForm(false)}
                    className="flex-1 py-2.5 rounded-xl border border-border hover:bg-muted font-semibold text-sm transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleCreate} disabled={!name || !content || createScript.isPending}
                    className="flex-1 py-2.5 rounded-xl bg-primary text-white font-semibold text-sm transition-all disabled:opacity-50 shadow-lg shadow-primary/20 hover:bg-primary/90"
                  >
                    {createScript.isPending ? "Saving..." : "Save Script"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Playbook"
        message={
          deleteTarget
            ? `Permanently delete "${deleteTarget.name}"? Any rule still pointing to this playbook will stop auto-remediating.`
            : ""
        }
        confirmLabel="Delete Playbook"
        isPending={deleteScript.isPending}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </AppShell>
  );
}
