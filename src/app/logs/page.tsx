"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { useLogSearch } from "@/lib/hooks/use-logs";
import { useServers } from "@/lib/hooks/use-servers";
import { Search, Flame, Terminal, Filter, Server, List } from "lucide-react";
import { timeAgo, cn } from "@/lib/utils";
import type { LogLevel } from "@/lib/types";

export default function LogsPage() {
  const [query, setQuery] = useState("");
  const [serverId, setServerId] = useState("");
  const [level, setLevel] = useState("");
  const [searchParams, setSearchParams] = useState<{
    q?: string;
    server_id?: string;
    level?: LogLevel;
    limit: number;
  }>({ limit: 100 });

  const { data, isLoading } = useLogSearch(searchParams, true);
  const { data: servers } = useServers();

  const handleSearch = () => {
    setSearchParams({
      q: query || undefined,
      server_id: serverId && serverId !== "all" ? serverId : undefined,
      level: level && level !== "all" ? (level as LogLevel) : undefined,
      limit: 100,
    });
  };

  const logLevelColor = {
    info: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    warning: "text-warning bg-warning/10 border-warning/20",
    error: "text-orange-500 bg-orange-500/10 border-orange-500/20",
    critical: "text-danger bg-danger/10 border-danger/20"
  };

  return (
    <AppShell>
      <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 flex flex-col h-[calc(100vh-64px)]">
        
        {/* Header & Search Bar */}
        <div className="flex-none">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-500 text-xs font-bold mb-4 border border-blue-500/20">
            <List className="h-3.5 w-3.5" />
            TELEMETRY
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
            Log Explorer
          </h1>
          <p className="text-muted-foreground mt-2 max-w-xl leading-relaxed mb-8">
            Query across millions of decentralized log lines gathered instantly from connected edge nodes.
          </p>

          <div className="bg-card/50 backdrop-blur-md border border-border rounded-2xl p-4 md:p-6 shadow-xl relative overflow-visible">
             <div className="absolute top-0 right-10 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 pointer-events-none" />
             <div className="flex flex-col md:flex-row items-end gap-4 relative z-10">
               
               <div className="flex-1 w-full relative group">
                 <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-2 block">Search Query</label>
                 <div className="relative">
                   <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                   <input 
                     value={query} onChange={(e) => setQuery(e.target.value)} 
                     placeholder="e.g. `invalid password for root`" 
                     className="w-full pl-12 pr-4 py-3 rounded-xl bg-background border border-border focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-sm font-mono text-sm"
                     onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                   />
                 </div>
               </div>

               <div className="w-full md:w-48 shrink-0">
                 <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-2 block">Target Node</label>
                 <select 
                   value={serverId} onChange={(e) => setServerId(e.target.value)}
                   className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-primary/50 outline-none text-sm appearance-none shadow-sm cursor-pointer"
                 >
                   <option value="all">All Infrastructure</option>
                   {servers?.map((s) => <option key={s._id} value={s._id}>{s.hostname}</option>)}
                 </select>
               </div>

               <div className="w-full md:w-36 shrink-0">
                 <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-2 block">Severity</label>
                 <select 
                   value={level} onChange={(e) => setLevel(e.target.value)}
                   className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-primary/50 outline-none text-sm appearance-none shadow-sm cursor-pointer capitalize"
                 >
                   <option value="all">Any Level</option>
                   <option value="critical">Critical</option>
                   <option value="error">Error</option>
                   <option value="warning">Warning</option>
                   <option value="info">Info</option>
                 </select>
               </div>

               <button 
                 onClick={handleSearch}
                 className="w-full md:w-auto px-8 py-3 rounded-xl bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all"
               >
                 Execute
               </button>
             </div>
          </div>
        </div>

        {/* Results Area */}
        <div className="flex-1 min-h-0 bg-card rounded-2xl border border-border overflow-hidden flex flex-col mt-4">
           {/* Results Header */}
           <div className="px-6 py-3 border-b border-border bg-muted/20 flex items-center justify-between shrink-0">
             <div className="flex items-center gap-2">
               <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
               <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Streaming Output</span>
             </div>
             {data && (
               <div className="text-xs text-muted-foreground font-medium">
                 Matched <span className="text-foreground font-bold">{data.total.toLocaleString()}</span> lines (showing {data.showing})
               </div>
             )}
           </div>

           {/* Logs List Engine */}
           <div className="flex-1 overflow-y-auto p-4 space-y-[2px] font-mono text-[13px]">
             {isLoading ? (
               [...Array(15)].map((_, i) => (
                 <div key={i} className="flex gap-4 p-2">
                   <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                   <div className="h-4 w-12 bg-muted rounded animate-pulse" />
                   <div className="h-4 w-full bg-muted rounded animate-pulse opacity-50" />
                 </div>
               ))
             ) : !data?.results || data.results.length === 0 ? (
               <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-20">
                 <Terminal className="h-10 w-10 mb-4 opacity-20" />
                 <p>No log records match your current query.</p>
               </div>
             ) : (
               data.results.map((log: any, index: number) => (
                 <div key={index} className="flex flex-col sm:flex-row gap-2 sm:gap-4 p-2 hover:bg-muted/50 rounded-md transition-colors cursor-text group items-start">
                   <div className="shrink-0 text-muted-foreground/60 w-[140px] flex items-center gap-2">
                     <span className="text-[10px] opacity-40 group-hover:opacity-100">{String(index+1).padStart(4, '0')}</span>
                     {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' })}
                   </div>
                   
                   <div className="shrink-0 w-[80px]">
                     <span className={cn("px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider", logLevelColor[log.level as keyof typeof logLevelColor] || "text-muted-foreground bg-muted")}>
                       {log.level}
                     </span>
                   </div>
                   
                   <div className="shrink-0 w-[120px] truncate text-primary/70">
                     {servers?.find(s => s._id === log.server_id)?.hostname || log.server_id}
                   </div>
                   
                   <div className="flex-1 break-all text-foreground/90 whitespace-pre-wrap">
                     {log.message}
                   </div>
                 </div>
               ))
             )}
           </div>
        </div>
      </div>
    </AppShell>
  );
}
