"use client";

import { useRecentIncidents } from "@/lib/hooks/use-dashboard";
import { SeverityBadge, timeAgo } from "@/components/shared/badges";
import { Radio } from "lucide-react";
import Link from "next/link";

export function RecentIncidents() {
  const { data: incidents, isLoading } = useRecentIncidents(8);

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <h3 className="text-sm font-semibold">Recent Incidents</h3>
        <span className="flex items-center gap-1.5 text-[10px] font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">
          <Radio className="h-3 w-3 animate-pulse" />
          LIVE
        </span>
      </div>

      <div className="divide-y divide-border max-h-100 overflow-y-auto">
        {isLoading ? (
          <div className="p-5 text-center text-sm text-muted-foreground">
            Loading incidents...
          </div>
        ) : (incidents || []).length === 0 ? (
          <div className="p-5 text-center text-sm text-muted-foreground">
            No recent incidents
          </div>
        ) : (
          (incidents || []).map((incident) => (
            <Link key={incident._id} href={`/incidents/${incident._id}`} className="">
              <div className="px-5 py-3 hover:bg-muted/30 transition-colors cursor-pointer border-b border-white-/10">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <SeverityBadge severity={incident.severity} />
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {timeAgo(incident.detected_at)}
                  </span>
                </div>
                <p className="text-sm text-foreground leading-snug mt-1.5">
                  {incident.description}
                </p>
                {incident.context &&
                  Object.keys(incident.context).length > 0 && (
                    <p className="text-xs text-muted-foreground font-mono mt-1 bg-muted/30 px-2 py-1 rounded">
                      {Object.entries(incident.context)
                        .slice(0, 2)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(" → ")}
                    </p>
                  )}
              </div>
            </Link>
          ))
        )}
      </div>

      <div className="px-5 py-3 border-t border-border">
        <Link
          href="/incidents"
          className="flex items-center justify-center w-full py-2 text-xs font-semibold text-muted-foreground border border-border rounded-lg hover:bg-muted hover:text-foreground transition-colors"
        >
          VIEW INCIDENT VAULT
        </Link>
      </div>
    </div>
  );
}
