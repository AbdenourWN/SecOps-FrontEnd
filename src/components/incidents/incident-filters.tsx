"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import type { SeverityLevel, IncidentStatus, ServerResponse } from "@/lib/types";

interface IncidentFiltersProps {
  servers: ServerResponse[];
  serverId: string;
  severity: string;
  status: string;
  onServerChange: (v: string) => void;
  onSeverityChange: (v: string) => void;
  onStatusChange: (v: string) => void;
  onClear: () => void;
}

export function IncidentFilters({
  servers,
  serverId,
  severity,
  status,
  onServerChange,
  onSeverityChange,
  onStatusChange,
  onClear,
}: IncidentFiltersProps) {
  const hasFilters = serverId || severity || status;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select value={serverId} onValueChange={(v) => onServerChange(v ?? "")}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="All Servers" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Servers</SelectItem>
          {servers.map((s) => (
            <SelectItem key={s._id} value={s._id}>
              {s.hostname}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={severity} onValueChange={(v) => onSeverityChange(v ?? "")}>
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="All Severities" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Severities</SelectItem>
          {(["critical", "high", "medium", "low"] as SeverityLevel[]).map(
            (s) => (
              <SelectItem key={s} value={s} className="capitalize">
                {s}
              </SelectItem>
            )
          )}
        </SelectContent>
      </Select>

      <Select value={status} onValueChange={(v) => onStatusChange(v ?? "")}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="All Statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          {(
            [
              "open",
              "investigating",
              "resolved",
              "false_positive",
            ] as IncidentStatus[]
          ).map((s) => (
            <SelectItem key={s} value={s} className="capitalize">
              {s.replace("_", " ")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={onClear}>
          <X className="mr-1 h-3 w-3" />
          Clear
        </Button>
      )}
    </div>
  );
}
