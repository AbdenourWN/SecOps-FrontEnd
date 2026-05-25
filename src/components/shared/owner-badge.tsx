"use client";

import Link from "next/link";
import { Globe, Server } from "lucide-react";
import { cn } from "@/lib/utils";
import { useServer } from "@/lib/hooks/use-servers";

interface OwnerBadgeProps {
  ownerType?: "global" | "server" | null;
  ownerId?: string | null;
  size?: "sm" | "md";
  /** When true and ownerType=server, the badge links to the per-server route. */
  link?: boolean;
}

/**
 * Phase 28.5 — small pill rendered on rule/script cards to show whether the
 * row belongs to the curated global library or to a specific server's private
 * library. Hostname is resolved via `useServer(owner_id)` and gracefully
 * degrades to the raw id while loading.
 */
export function OwnerBadge({
  ownerType = "global",
  ownerId,
  size = "sm",
  link = false,
}: OwnerBadgeProps) {
  const isServer = ownerType === "server" && ownerId;
  const { data: server } = useServer(isServer ? ownerId! : "");

  const base = cn(
    "inline-flex items-center gap-1 rounded-md border font-medium tabular-nums",
    size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs",
  );

  if (!isServer) {
    return (
      <span
        className={cn(
          base,
          "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
        )}
        title="Curated global rule/script (applies to every server in `global` or `both` library mode)"
      >
        <Globe className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />
        Global
      </span>
    );
  }

  const label = server?.hostname ?? ownerId!.slice(0, 8);
  const content = (
    <span
      className={cn(
        base,
        "border-blue-500/30 bg-blue-500/10 text-blue-300",
        link && "hover:bg-blue-500/20 transition-colors",
      )}
      title={`Scoped to server ${server?.hostname ?? ownerId} — visible only when that server is in Server-only or Both library mode`}
    >
      <Server className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />
      {label}
    </span>
  );

  if (link) {
    return (
      <Link href={`/servers/${ownerId}`} onClick={(e) => e.stopPropagation()}>
        {content}
      </Link>
    );
  }
  return content;
}
