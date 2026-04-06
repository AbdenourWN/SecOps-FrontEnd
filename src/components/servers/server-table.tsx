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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { serverStatusColor, timeAgo } from "@/lib/utils";
import { Eye, Monitor } from "lucide-react";
import type { ServerResponse } from "@/lib/types";

interface ServerTableProps {
  servers: ServerResponse[];
}

export function ServerTable({ servers }: ServerTableProps) {
  if (servers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12">
        <Monitor className="h-10 w-10 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">No servers registered yet</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Status</TableHead>
            <TableHead>Hostname</TableHead>
            <TableHead>IP Address</TableHead>
            <TableHead>OS</TableHead>
            <TableHead>Port</TableHead>
            <TableHead>Last Check</TableHead>
            <TableHead className="w-[80px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {servers.map((server) => (
            <TableRow key={server._id}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <div
                    className={`h-2.5 w-2.5 rounded-full ${
                      serverStatusColor[server.status]
                    }`}
                  />
                  <span className="text-xs capitalize text-muted-foreground">
                    {server.status}
                  </span>
                </div>
              </TableCell>
              <TableCell className="font-medium">{server.hostname}</TableCell>
              <TableCell className="font-mono text-sm">
                {server.ip_address}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="capitalize">
                  {server.os_type}
                </Badge>
              </TableCell>
              <TableCell>{server.port || "-"}</TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {timeAgo(server.last_health_check)}
              </TableCell>
              <TableCell>
                <Link href={`/servers/${server._id}`}>
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
