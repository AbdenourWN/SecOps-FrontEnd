"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { logLevelColor, formatDate } from "@/lib/utils";
import { FileText } from "lucide-react";
import type { LogEntry } from "@/lib/types";

interface LogTableProps {
  logs: LogEntry[];
}

export function LogTable({ logs }: LogTableProps) {
  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12">
        <FileText className="h-10 w-10 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">No logs found</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[180px]">Timestamp</TableHead>
            <TableHead className="w-[80px]">Level</TableHead>
            <TableHead className="w-[100px]">Service</TableHead>
            <TableHead>Message</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => (
            <TableRow key={log._id}>
              <TableCell className="text-xs text-muted-foreground whitespace-nowrap font-mono">
                {formatDate(log.timestamp)}
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={`text-xs ${logLevelColor[log.level]}`}
                >
                  {log.level}
                </Badge>
              </TableCell>
              <TableCell className="text-xs">{log.service}</TableCell>
              <TableCell className="max-w-[500px] truncate font-mono text-xs">
                {log.message}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
