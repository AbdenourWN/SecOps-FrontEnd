"use client";

import { Badge } from "@/components/ui/badge";
import { severityColor, statusColor } from "@/lib/utils";
import type { SeverityLevel, IncidentStatus } from "@/lib/types";

export function SeverityBadge({ severity }: { severity: SeverityLevel }) {
  return (
    <Badge variant="outline" className={severityColor[severity]}>
      {severity}
    </Badge>
  );
}

export function StatusBadge({ status }: { status: IncidentStatus }) {
  return (
    <Badge variant="outline" className={statusColor[status]}>
      {status.replace("_", " ")}
    </Badge>
  );
}
