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
import { Plus } from "lucide-react";
import { toast } from "sonner";

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
});

type FormData = z.infer<typeof schema>;

export function ServerForm() {
  const [open, setOpen] = useState(false);
  const createServer = useCreateServer();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { os_type: "linux" },
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
          type: "ssh_password",
          secret: data.secret,
        },
      });
      toast.success("Server added successfully");
      reset();
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add server");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button><Plus className="mr-2 h-4 w-4" />Add Server</Button>}
      />
      <DialogContent>
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
