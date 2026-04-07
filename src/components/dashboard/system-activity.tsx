"use client";

import Link from "next/link";
import { useRemediationHistory } from "@/lib/hooks/use-scripts";
import { timeAgo } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Bot, CheckCircle2, XCircle, ArrowRight } from "lucide-react";

export function SystemActivity() {
  const { data: runs, isLoading } = useRemediationHistory({ limit: 8 });

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-bold">Automation Activity</h2>
        </div>
        <Link
          href="/automation/history"
          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary font-semibold uppercase tracking-wider transition-colors"
        >
          View all
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="h-2 w-2 mt-1.5 rounded-full bg-muted animate-pulse shrink-0" />
              <div className="flex-1 space-y-1">
                <div className="h-3 bg-muted rounded animate-pulse w-3/4" />
                <div className="h-2.5 bg-muted rounded animate-pulse w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : !runs || runs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 gap-1">
          <p className="text-sm text-muted-foreground">No remediations yet</p>
          <p className="text-[11px] text-muted-foreground/70">
            Auto-fixes will appear here when rules trigger
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {runs.map((run) => {
            const ok = run.status === "success";
            return (
              <div key={run._id} className="flex items-start gap-3">
                <div
                  className={cn(
                    "mt-0.5 shrink-0 h-5 w-5 rounded-md flex items-center justify-center",
                    ok
                      ? "bg-success/15 text-success"
                      : "bg-danger/15 text-danger"
                  )}
                >
                  {ok ? (
                    <CheckCircle2 className="h-3 w-3" />
                  ) : (
                    <XCircle className="h-3 w-3" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold leading-snug truncate">
                    {run.script_name}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                    <span className="font-mono">{run.server_hostname}</span>
                    <span className="mx-1.5 text-muted-foreground/50">•</span>
                    {timeAgo(run.executed_at)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
