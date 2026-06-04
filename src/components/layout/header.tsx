"use client";

import { useEffect, useState } from "react";
import { Search, Settings, Sun, Moon, Menu, Clock } from "lucide-react";
import { useTheme } from "next-themes";
import { useAuth } from "@/providers/auth-provider";
import Link from "next/link";
import { NotificationBell } from "@/components/layout/notification-bell";

interface HeaderProps {
  onMenuClick: () => void;
}

function UtcClock() {
  const [time, setTime] = useState("");

  useEffect(() => {
    const update = () =>
      setTime(new Date().toISOString().slice(11, 19));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="hidden md:flex items-center gap-1.5 h-9 px-2.5 rounded-lg border border-border bg-muted/40 text-[11px] font-mono text-muted-foreground tabular-nums"
      title="Current UTC time"
      suppressHydrationWarning
    >
      <Clock className="h-3.5 w-3.5 text-primary/70" />
      <span>{time || "--:--:--"} UTC</span>
    </div>
  );
}

export function Header({ onMenuClick }: HeaderProps) {
  const { user, isAdmin } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/80 backdrop-blur-md px-4 md:px-6">
      {/* Left: hamburger (mobile) + brand */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="text-sm font-bold tracking-wide text-foreground">
          Synthetic Sentinel
        </span>
      </div>

      {/* Center: Global search + UTC clock */}
      <div className="hidden md:flex items-center max-w-2xl w-full mx-8 gap-2">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search infrastructure..."
            className="w-full h-9 rounded-lg border border-border bg-muted/50 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
          />
        </div>
        <UtcClock />
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Theme toggle */}
        <button
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          aria-label="Toggle theme"
          suppressHydrationWarning
        >
          <Sun className="hidden h-4 w-4 dark:block" />
          <Moon className="block h-4 w-4 dark:hidden" />
        </button>

        {/* Notification bell */}
        <NotificationBell />

        {/* Settings — admin only */}
        {isAdmin && (
          <Link
            href="/settings"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Settings"
          >
            <Settings className="h-4 w-4" />
          </Link>
        )}

        {/* User avatar */}
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary text-xs font-bold uppercase cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all ml-1"
          title={user ? `${user.username} · ${user.role}` : undefined}
        >
          {user?.username?.charAt(0).toUpperCase() ?? "?"}
        </div>
      </div>
    </header>
  );
}
