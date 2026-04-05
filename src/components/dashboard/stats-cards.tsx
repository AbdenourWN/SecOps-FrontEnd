"use client";

import { useDashboardSummary } from "@/lib/hooks/use-dashboard";
import { Server, Activity, AlertTriangle, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DashboardSummary } from "@/lib/types";

const cards = [
  {
    key: "servers",
    label: "TOTAL SERVERS",
    icon: Server,
    getValue: (d: DashboardSummary | undefined) => d?.servers?.total ?? 0,
    getSub: (d: DashboardSummary | undefined) =>
      `${d?.servers?.online ?? 0} Online • ${d?.servers?.offline ?? 0} Offline`,
    accentColor: "text-primary",
    iconBg: "bg-primary/10",
  },
  {
    key: "health",
    label: "NETWORK HEALTH",
    icon: Activity,
    getValue: (d: DashboardSummary | undefined) => {
      if (!d || d.servers?.total === 0) return "0%";
      return `${(((d.servers?.online ?? 0) / (d.servers?.total ?? 1)) * 100).toFixed(1)}%`;
    },
    getSub: (d: DashboardSummary | undefined) =>
      `${d?.servers?.online ?? 0} Online • ${d?.servers?.offline ?? 0} Offline`,
    accentColor: "text-success",
    iconBg: "bg-success/10",
  },
  {
    key: "incidents",
    label: "OPEN INCIDENTS",
    icon: AlertTriangle,
    getValue: (d: DashboardSummary | undefined) =>
      (d?.incidents?.by_status?.open ?? 0) + (d?.incidents?.by_status?.investigating ?? 0),
    getSub: (d: DashboardSummary | undefined) => {
      const total = d?.incidents?.total ?? 0;
      const resolved = d?.incidents?.by_status?.resolved ?? 0;
      if (total === 0) return "No incidents";
      return `${((resolved / total) * 100).toFixed(0)}% resolution rate`;
    },
    accentColor: "text-warning",
    iconBg: "bg-warning/10",
  },
  {
    key: "critical",
    label: "CRITICAL ALERTS",
    icon: ShieldAlert,
    getValue: (d: DashboardSummary | undefined) =>
      d?.incidents?.by_severity?.critical ?? 0,
    getSub: () => "Requiring immediate intervention",
    accentColor: "text-danger",
    iconBg: "bg-danger/10",
  },
];

export function StatsCards() {
  const { data, isLoading } = useDashboardSummary();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.key}
          className="rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              {card.label}
            </span>
            <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", card.iconBg)}>
              <card.icon className={cn("h-4 w-4", card.accentColor)} />
            </div>
          </div>
          <div className="space-y-1">
            <p className={cn(
              "text-3xl font-bold tracking-tight",
              isLoading ? "animate-pulse text-muted-foreground" : "text-foreground"
            )}>
              {isLoading ? "—" : card.getValue(data)}
            </p>
            <p className="text-xs text-muted-foreground">
              {isLoading ? "Loading..." : card.getSub(data)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
