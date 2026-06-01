import { Loader2, CheckCircle2, XCircle, ShieldAlert } from "lucide-react";
import type { ReactNode } from "react";

/**
 * AiCommand lifecycle status → small status icon.
 * Was duplicated as `STATUS_ICON` in the incident and anomaly detail pages.
 */
export const STATUS_ICON: Record<string, ReactNode> = {
  pending: null,
  approved: <Loader2 className="h-3 w-3 animate-spin text-blue-400" />,
  executing: <Loader2 className="h-3 w-3 animate-spin text-blue-400" />,
  completed: <CheckCircle2 className="h-3 w-3 text-emerald-400" />,
  failed: <XCircle className="h-3 w-3 text-red-400" />,
  blocked: <ShieldAlert className="h-3 w-3 text-red-400" />,
  rejected: <XCircle className="h-3 w-3 text-muted-foreground" />,
};
