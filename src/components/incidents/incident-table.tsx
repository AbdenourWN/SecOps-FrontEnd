"use client";

import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { SeverityBadge, StatusBadge } from "./status-badge";
import { timeAgo } from "@/lib/utils";
import { Eye, AlertTriangle } from "lucide-react";
import type { IncidentResponse } from "@/lib/types";

interface IncidentTableProps {
  incidents: IncidentResponse[];
}

export function IncidentTable({ incidents }: IncidentTableProps) {
  if (incidents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12">
        <AlertTriangle className="h-10 w-10 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">No incidents found</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Detected</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Severity</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[80px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {incidents.map((inc) => (
            <TableRow key={inc._id}>
              <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                {timeAgo(inc.detected_at)}
              </TableCell>
              <TableCell className="max-w-[400px] truncate text-sm">
                {inc.description}
              </TableCell>
              <TableCell>
                <SeverityBadge severity={inc.severity} />
              </TableCell>
              <TableCell>
                <StatusBadge status={inc.status} />
              </TableCell>
              <TableCell>
                <Link href={`/incidents/${inc._id}`}>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Eye className="h-4 w-4" />
                  </Button>
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
