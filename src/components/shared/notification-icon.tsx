import {
  Sparkles,
  ShieldAlert,
  Wrench,
  Activity,
  Server,
  Bell,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NOTIFICATION_SEVERITY_COLOR } from "@/lib/constants";
import type { NotificationCategory, NotificationSeverity } from "@/lib/types";

const CATEGORY_ICON: Record<NotificationCategory, LucideIcon> = {
  ai: Sparkles,
  incident: ShieldAlert,
  automation: Wrench,
  anomaly: Activity,
  server: Server,
};

/**
 * Notification glyph: the icon comes from the category, the colour from the
 * severity. Lives in a `.tsx` (not constants.ts) because it carries JSX.
 */
export function NotificationIcon({
  category,
  severity,
  className,
}: {
  category: NotificationCategory;
  severity: NotificationSeverity;
  className?: string;
}) {
  const Icon = CATEGORY_ICON[category] ?? Bell;
  return (
    <Icon className={cn("h-4 w-4 shrink-0", NOTIFICATION_SEVERITY_COLOR[severity], className)} />
  );
}
