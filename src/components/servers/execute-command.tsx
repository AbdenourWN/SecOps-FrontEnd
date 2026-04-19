"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useExecuteCommand } from "@/lib/hooks/use-servers";
import { Play } from "lucide-react";
import { toast } from "sonner";

interface ExecuteCommandProps {
  serverId: string;
}

export function ExecuteCommand({ serverId }: ExecuteCommandProps) {
  const [command, setCommand] = useState("");
  const [output, setOutput] = useState<string | null>(null);
  const execute = useExecuteCommand();

  const handleExecute = async () => {
    if (!command.trim()) return;
    try {
      const result = await execute.mutateAsync({
        id: serverId,
        command: command.trim(),
      });
      setOutput(result.output ?? result.error ?? "");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to execute command"
      );
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Execute Command</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder="Enter command..."
            className="font-mono text-sm"
            onKeyDown={(e) => e.key === "Enter" && handleExecute()}
          />
          <Button
            onClick={handleExecute}
            disabled={execute.isPending || !command.trim()}
            size="sm"
          >
            <Play className="mr-1 h-3 w-3" />
            {execute.isPending ? "Running..." : "Run"}
          </Button>
        </div>
        {output !== null && (
          <ScrollArea className="h-[200px] rounded-md border border-border bg-muted/50 p-3">
            <pre className="whitespace-pre-wrap font-mono text-xs">{output || "(no output)"}</pre>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
