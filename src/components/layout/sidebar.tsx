"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Server,
  AlertTriangle,
  FileText,
  Shield,
  Terminal,
  Settings,
  X,
} from "lucide-react";
import Image from "next/image";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/servers", label: "Servers", icon: Server },
  { href: "/incidents", label: "Incidents", icon: AlertTriangle },
  { href: "/logs", label: "Log Viewer", icon: FileText },
  { href: "/rules", label: "Detection Rules", icon: Shield },
  { href: "/automation", label: "Automation", icon: Terminal },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();

  const navLink = (href: string, label: string, Icon: React.ElementType) => {
    const active =
      pathname === href || (href !== "/" && pathname.startsWith(href));
    return (
      <Link
        key={href}
        href={href}
        onClick={onClose}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
          active
            ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        <Icon
          className={cn(
            "h-4 w-4 shrink-0",
            active && "text-primary-foreground",
          )}
        />
        {label}
        {label === "Incidents" && (
          <span
            className={cn(
              "ml-auto flex h-4 min-w-4 items-center justify-center rounded-full text-[10px] font-bold px-1",
              active ? "bg-white/20 text-white" : "bg-danger/15 text-danger",
            )}
          >
            !
          </span>
        )}
      </Link>
    );
  };

  return (
    <>
      {/* Backdrop — mobile only */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={cn(
          "fixed left-0 top-0 h-full w-60 flex flex-col border-r border-border bg-card z-50 transition-transform duration-300",
          // Mobile: slide in/out. Desktop: always visible.
          "lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between gap-3 px-5 h-14 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex w-8 h-8 items-center justify-center rounded-lg">
              <Image src="/logo.webp" alt="" width={50} height={50} />
            </div>
            <div>
              <p className="text-sm font-bold leading-none">Sentinel Core</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                SecOps Platform
              </p>
            </div>
          </div>
          {/* Close button — mobile only */}
          <button
            onClick={onClose}
            className="lg:hidden flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-2 mb-2">
            Navigation
          </p>
          {navItems.map(({ href, label, icon: Icon }) =>
            navLink(href, label, Icon),
          )}

          <div className="pt-4">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-2 mb-2">
              System
            </p>
            {navLink("/settings", "Settings", Settings)}
          </div>
        </nav>

        {/* Bottom: User info */}
        <div className="shrink-0 border-t border-border p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary text-xs font-bold">
              A
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">Admin</p>
              <p className="text-[10px] text-muted-foreground truncate">
                SecOps Administrator
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
