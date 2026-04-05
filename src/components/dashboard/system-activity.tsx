"use client";

import { useRecentIncidents } from "@/lib/hooks/use-dashboard";
import { timeAgo } from "@/lib/utils";
import { Activity } from "lucide-react";

export function SystemActivity() {
  const { data: activity, isLoading } = useRecentIncidents(8);

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-bold">System Activity</h2>
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
      ) : !activity || activity.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8">
          <p className="text-sm text-muted-foreground">No recent activity</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activity.map((item, idx) => (
            <div key={idx} className="flex items-start gap-3">
              <span
                className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                style={{
                  backgroundColor:
                    item.severity === "critical"
                      ? "var(--danger)"
                      : item.severity === "high"
                      ? "var(--severity-high)"
                      : item.severity === "medium"
                      ? "var(--warning)"
                      : "var(--success)",
                }}
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium leading-snug truncate">
                  {item.description}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {timeAgo(item.detected_at)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
