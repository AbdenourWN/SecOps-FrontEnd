"use client";

import { AppShell } from "@/components/layout/app-shell";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { ServerHealthGrid } from "@/components/dashboard/server-health-grid";
import { RecentIncidents } from "@/components/dashboard/recent-incidents";
import { SeverityTrendChart } from "@/components/dashboard/severity-trend-chart";
import { SystemActivity } from "@/components/dashboard/system-activity";
import { FooterBar } from "@/components/dashboard/footer-bar";

export default function DashboardPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        {/* Hero stat cards */}
        <StatsCards />

        {/* Main content: Server grid + Incidents feed */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2/3: Server health + Trend chart */}
          <div className="lg:col-span-2 space-y-6">
            <ServerHealthGrid />
            <SeverityTrendChart />
          </div>

          {/* Right 1/3: Recent incidents + Activity */}
          <div className="space-y-6">
            <RecentIncidents />
            <SystemActivity />
          </div>
        </div>

        {/* Footer */}
        <FooterBar />
      </div>
    </AppShell>
  );
}
