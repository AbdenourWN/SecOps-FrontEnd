"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateServer } from "@/lib/hooks/use-servers";
import { ChevronDown, ChevronUp, Plus, Telescope } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { WarmupDurationPicker } from "@/components/servers/warmup-duration-picker";

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

const schema = z.object({
  hostname: z.string().min(1, "Hostname is required"),
  ip_address: z
    .string()
    .min(1, "IP address is required")
    .regex(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/, "Invalid IP address"),
  os_type: z.enum(["linux", "windows"]),
  port: z.string().optional(),
  username: z.string().min(1, "Username is required"),
  secret: z.string().min(1, "Password is required"),
  // Anomaly detection
  bh_start: z.string().regex(TIME_RE, "Use HH:MM"),
  bh_end: z.string().regex(TIME_RE, "Use HH:MM"),
  bh_tz: z.string().min(1),
});

type FormData = z.infer<typeof schema>;

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]; // ISO 1..7

export function ServerForm() {
  const [open, setOpen] = useState(false);
  // Default-open so the user actually sees the anomaly settings on create.
  const [anomalyOpen, setAnomalyOpen] = useState(true);
  const [bhDays, setBhDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [warmupMinutes, setWarmupMinutes] = useState(60);   // default 1h
  const createServer = useCreateServer();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      os_type: "linux",
      bh_start: "09:00",
      bh_end: "18:00",
      bh_tz: "UTC",
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      await createServer.mutateAsync({
        hostname: data.hostname,
        ip_address: data.ip_address,
        os_type: data.os_type,
        port: data.port ? Number(data.port) : undefined,
        credential: {
          username: data.username,
          type: "password",
          secret: data.secret,
        },
        business_hours: {
          start: data.bh_start,
          end: data.bh_end,
          days: bhDays,
          tz: data.bh_tz,
        },
        warmup_minutes: warmupMinutes,
      });
      toast.success("Server added successfully");
      reset();
      setBhDays([1, 2, 3, 4, 5]);
      setWarmupMinutes(60);
      setAnomalyOpen(true);
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add server");
    }
  };

  const toggleDay = (d: number) => {
    setBhDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button><Plus className="mr-2 h-4 w-4" />Add Server</Button>}
      />
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Server</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Hostname</label>
              <Input {...register("hostname")} placeholder="web-server-01" />
              {errors.hostname && (
                <p className="text-xs text-red-400">{errors.hostname.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">IP Address</label>
              <Input {...register("ip_address")} placeholder="192.168.1.100" />
              {errors.ip_address && (
                <p className="text-xs text-red-400">
                  {errors.ip_address.message}
                </p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">OS Type</label>
              <Select
                defaultValue="linux"
                onValueChange={(v) =>
                  setValue("os_type", v as "linux" | "windows")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="linux">Linux</SelectItem>
                  <SelectItem value="windows">Windows</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Port (optional)</label>
              <Input
                {...register("port")}
                type="text"
                placeholder="22 / 5985"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Username</label>
              <Input {...register("username")} placeholder="root" />
              {errors.username && (
                <p className="text-xs text-red-400">
                  {errors.username.message}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Password</label>
              <Input
                {...register("secret")}
                type="password"
                placeholder="********"
              />
              {errors.secret && (
                <p className="text-xs text-red-400">{errors.secret.message}</p>
              )}
            </div>
          </div>

          {/* Anomaly detection settings (default-open) */}
          <div className="border border-cyan-500/30 bg-cyan-500/5 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setAnomalyOpen((v) => !v)}
              className="w-full flex items-center justify-between px-3 py-2 hover:bg-cyan-500/10 transition-colors text-sm font-semibold"
            >
              <span className="flex items-center gap-2">
                <Telescope className="h-3.5 w-3.5 text-cyan-400" />
                Anomaly Detection
              </span>
              {anomalyOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
            {anomalyOpen && (
              <div className="p-3 space-y-4 bg-card">
                {/* Business hours */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                    Business hours (time-of-day heuristic)
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground">Start</label>
                      <Input {...register("bh_start")} placeholder="09:00" />
                      {errors.bh_start && (
                        <p className="text-[10px] text-red-400">{errors.bh_start.message}</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground">End</label>
                      <Input {...register("bh_end")} placeholder="18:00" />
                      {errors.bh_end && (
                        <p className="text-[10px] text-red-400">{errors.bh_end.message}</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground">Timezone</label>
                      <Input {...register("bh_tz")} placeholder="UTC" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-1">
                    {DAY_NAMES.map((name, idx) => {
                      const day = idx + 1;
                      const active = bhDays.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleDay(day)}
                          className={cn(
                            "h-7 w-9 text-[11px] font-semibold rounded-md border transition-all",
                            active
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-card text-muted-foreground border-border hover:text-foreground"
                          )}
                        >
                          {name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Pattern warm-up duration */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                    Pattern warm-up duration
                  </label>
                  <WarmupDurationPicker
                    valueMinutes={warmupMinutes}
                    onChange={setWarmupMinutes}
                  />
                  <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed">
                    During warm-up, novel log patterns are recorded silently
                    without flagging — preventing day-1 noise. Pick longer for
                    busy servers (days/weeks) or 0 to flag from the very first
                    log. Default: 1 hour.
                  </p>
                </div>
              </div>
            )}
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={createServer.isPending}
          >
            {createServer.isPending ? "Adding..." : "Add Server"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
