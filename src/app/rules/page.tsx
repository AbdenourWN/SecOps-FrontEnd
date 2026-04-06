"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { useRules, useCreateRule, useDeleteRule } from "@/lib/hooks/use-rules";
import { Plus, Trash2, Cpu, Eye, LayoutGrid, Terminal, Shield } from "lucide-react";
import { timeAgo, cn } from "@/lib/utils";
import type { SeverityLevel, ActionLevel, RuleOSType } from "@/lib/types";

export default function RulesPage() {
  const { data: rules, isLoading } = useRules();
  const createRule = useCreateRule();
  const deleteRule = useDeleteRule();
  
  const [showForm, setShowForm] = useState(false);
  
  const [name, setName] = useState("");
  const [pattern, setPattern] = useState("");
  const [severity, setSeverity] = useState<SeverityLevel>("medium");
  const [actionLevel, setActionLevel] = useState<ActionLevel>(3);
  const [description, setDescription] = useState("");
  const [osType, setOsType] = useState<RuleOSType>("linux");
  const [enabled, setEnabled] = useState(true);

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
      <div className="p-6 md:p-10 max-w-7xl mx-auto flex flex-col lg:flex-row gap-8">
        
        {/* Main Content */}
        <div className="flex-1 space-y-8">
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
            {!showForm && (
              <button 
                onClick={() => setShowForm(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all text-sm font-semibold shadow-xl shadow-primary/20 shrink-0"
              >
                <Plus className="h-4 w-4" /> Add Detection Rule
              </button>
            )}
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-24 rounded-2xl bg-muted/60 animate-pulse border border-border" />
              ))}
            </div>
          ) : !rules || rules.length === 0 ? (
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
                       <span className="text-sm font-semibold">{rule.action_level === 3 ? "Remediate" : rule.action_level === 2 ? "Alert" : "Log"}</span>
                     </div>
                     <div className="flex flex-col gap-1 items-start sm:items-end">
                       <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Target</span>
                       <span className="text-sm font-semibold capitalize flex items-center gap-1"><Terminal className="h-3 w-3 text-muted-foreground"/>{rule.os_type}</span>
                     </div>
                     
                     <div className="ml-4 pl-4 border-l border-border opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                       <button 
                         onClick={() => deleteRule.mutate(rule._id)}
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
        </div>

        {/* Sidebar Creation Form */}
        {showForm && (
          <div className="w-full lg:w-[420px] shrink-0">
            <div className="sticky top-6 rounded-3xl border border-border bg-card shadow-2xl p-6 lg:p-8 animate-in slide-in-from-right-8 duration-300 relative overflow-hidden">
              <div className="absolute top-0 right-0 h-40 w-40 bg-orange-500/10 blur-3xl pointer-events-none rounded-full -translate-y-1/2 translate-x-1/2" />
              
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2 relative z-10">
                <Shield className="h-5 w-5 text-orange-500" />
                Detection Signature
              </h2>
              
              <div className="space-y-4 relative z-10">
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Rule Name</label>
                  <input 
                    value={name} onChange={(e) => setName(e.target.value)} 
                    placeholder="e.g. Detect Brute Force" 
                    className="w-full px-4 py-2.5 rounded-xl bg-muted/50 border border-border focus:border-primary/50 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block flex items-center justify-between">
                    Pattern (RegEx)
                    <span className="text-[9px] px-1.5 py-0.5 bg-muted rounded font-mono">case-insensitive</span>
                  </label>
                  <textarea 
                    value={pattern} onChange={(e) => setPattern(e.target.value)} 
                    placeholder="Failed password for (?:invalid user )?(\S+) from (\S+)" 
                    className="w-full px-4 py-3 rounded-xl bg-[#0f172a] text-yellow-500 border border-border focus:border-primary/50 outline-none text-xs font-mono h-24 resize-none"
                    spellCheck={false}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Severity</label>
                    <select 
                      value={severity} onChange={(e) => setSeverity(e.target.value as any)}
                      className="w-full px-4 py-2.5 rounded-xl bg-muted/50 border border-border focus:border-primary/50 outline-none text-sm appearance-none cursor-pointer"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Action Level</label>
                    <select 
                      value={actionLevel} onChange={(e) => setActionLevel(Number(e.target.value) as any)}
                      className="w-full px-4 py-2.5 rounded-xl bg-muted/50 border border-border focus:border-primary/50 outline-none text-sm appearance-none cursor-pointer"
                    >
                      <option value={1}>1 - Log</option>
                      <option value={2}>2 - Alert</option>
                      <option value={3}>3 - Remediate</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Target OS</label>
                    <select 
                      value={osType} onChange={(e) => setOsType(e.target.value as any)}
                      className="w-full px-4 py-2.5 rounded-xl bg-muted/50 border border-border focus:border-primary/50 outline-none text-sm appearance-none cursor-pointer"
                    >
                      <option value="linux">Linux</option>
                      <option value="windows">Windows</option>
                    </select>
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

                <div className="pt-4 flex items-center gap-3">
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
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
