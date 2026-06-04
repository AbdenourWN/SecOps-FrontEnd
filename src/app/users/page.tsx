"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, ShieldCheck, Trash2, KeyRound, Users as UsersIcon } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/providers/auth-provider";
import { useServers } from "@/lib/hooks/use-servers";
import {
  useUsers,
  useCreateUser,
  useUpdateUser,
  useResetUserPassword,
  useDeleteUser,
} from "@/lib/hooks/use-users";
import type { ManagedUser, ManagedUserRole } from "@/lib/api/users";
import { getFriendlyMessage } from "@/lib/errors";

const ROLE_BADGE: Record<ManagedUserRole, string> = {
  admin: "bg-primary/15 text-primary",
  operator: "bg-amber-500/15 text-amber-400",
  viewer: "bg-muted text-muted-foreground",
};

export default function UsersPage() {
  const { isAdmin } = useAuth();
  const { data: users, isLoading } = useUsers();
  const { data: serversData } = useServers({ page_size: 100 });
  const servers = useMemo(
    () => (serversData?.results ?? []).map((s) => ({ id: s._id, hostname: s.hostname })),
    [serversData],
  );

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ManagedUser | null>(null);
  const [resetting, setResetting] = useState<ManagedUser | null>(null);

  if (!isAdmin) {
    return (
      <AppShell>
        <div className="mx-auto max-w-md py-20 text-center text-sm text-muted-foreground">
          You don&apos;t have permission to manage users.
        </div>
      </AppShell>
    );
  }

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (u: ManagedUser) => {
    setEditing(u);
    setDialogOpen(true);
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-6 pb-16">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <UsersIcon className="h-5 w-5 text-primary" />
              <h1 className="text-xl font-bold">Users</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Manage accounts, roles, and per-server access. Operators and viewers only see and
              act on the servers assigned to them.
            </p>
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            New user
          </Button>
        </div>

        <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">User</th>
                <th className="px-3 py-2 font-medium">Role</th>
                <th className="px-3 py-2 font-medium">Servers</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                  </td>
                </tr>
              )}
              {!isLoading && (users ?? []).length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                    No users yet.
                  </td>
                </tr>
              )}
              {(users ?? []).map((u) => (
                <tr key={u.id} className="border-t border-border/60">
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2 font-medium">
                      {u.username}
                      {u.is_protected && (
                        <ShieldCheck className="h-3.5 w-3.5 text-primary" aria-label="Protected admin" />
                      )}
                    </div>
                    {u.email && <div className="text-xs text-muted-foreground">{u.email}</div>}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${ROLE_BADGE[u.role]}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">
                    {u.role === "admin" ? "All servers" : `${u.server_ids.length} assigned`}
                  </td>
                  <td className="px-3 py-2.5">
                    <Badge variant={u.is_active ? "default" : "secondary"}>
                      {u.is_active ? "Active" : "Disabled"}
                    </Badge>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(u)}>
                        Edit
                      </Button>
                      <Button size="icon-sm" variant="ghost" title="Reset password" onClick={() => setResetting(u)}>
                        <KeyRound className="h-4 w-4" />
                      </Button>
                      <DeleteButton user={u} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <UserDialog
        // Remount on each open so the form re-initialises from the target user.
        key={dialogOpen ? (editing?.id ?? "new") : "closed"}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        servers={servers}
      />
      <ResetPasswordDialog user={resetting} onClose={() => setResetting(null)} />
    </AppShell>
  );
}

function DeleteButton({ user }: { user: ManagedUser }) {
  const del = useDeleteUser();
  const [open, setOpen] = useState(false);
  if (user.is_protected) return null;
  return (
    <>
      <Button size="icon-sm" variant="ghost" title="Delete user" onClick={() => setOpen(true)}>
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {user.username}?</DialogTitle>
            <DialogDescription>
              This permanently removes the account and signs out all its sessions. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={del.isPending}
              onClick={() =>
                del.mutate(user.id, {
                  onSuccess: () => {
                    toast.success(`Deleted ${user.username}`);
                    setOpen(false);
                  },
                  onError: (e) => toast.error(getFriendlyMessage(e)),
                })
              }
            >
              {del.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ResetPasswordDialog({ user, onClose }: { user: ManagedUser | null; onClose: () => void }) {
  const reset = useResetUserPassword();
  const [password, setPassword] = useState("");
  const open = user !== null;

  const submit = () => {
    if (!user || password.length < 8) return;
    reset.mutate(
      { id: user.id, password },
      {
        onSuccess: () => {
          toast.success(`Password reset for ${user.username} — their sessions were signed out.`);
          setPassword("");
          onClose();
        },
        onError: (e) => toast.error(getFriendlyMessage(e)),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setPassword(""); onClose(); } }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset password</DialogTitle>
          <DialogDescription>
            Set a new password for <span className="font-medium text-foreground">{user?.username}</span>.
            All of their existing sessions will be revoked.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">New password (min 8 chars)</label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setPassword(""); onClose(); }}>
            Cancel
          </Button>
          <Button disabled={password.length < 8 || reset.isPending} onClick={submit}>
            {reset.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Reset password
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UserDialog({
  open,
  onOpenChange,
  editing,
  servers,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: ManagedUser | null;
  servers: { id: string; hostname: string }[];
}) {
  const create = useCreateUser();
  const update = useUpdateUser();

  // Form state is (re)initialised whenever the dialog opens via the `key` below.
  const [username, setUsername] = useState(editing?.username ?? "");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState(editing?.email ?? "");
  const [role, setRole] = useState<ManagedUserRole>(editing?.role ?? "viewer");
  const [serverIds, setServerIds] = useState<string[]>(editing?.server_ids ?? []);
  const [isActive, setIsActive] = useState(editing?.is_active ?? true);

  const isEdit = editing !== null;
  const pending = create.isPending || update.isPending;

  const toggleServer = (id: string) =>
    setServerIds((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));

  const submit = () => {
    if (!isEdit && (!username || password.length < 8)) {
      toast.error("Username and a password of at least 8 characters are required.");
      return;
    }
    const scopedServers = role === "admin" ? [] : serverIds;
    if (isEdit && editing) {
      update.mutate(
        { id: editing.id, data: { email: email || null, role, server_ids: scopedServers, is_active: isActive } },
        {
          onSuccess: () => { toast.success(`Updated ${editing.username}`); onOpenChange(false); },
          onError: (e) => toast.error(getFriendlyMessage(e)),
        },
      );
    } else {
      create.mutate(
        { username, password, email: email || null, role, server_ids: scopedServers },
        {
          onSuccess: () => { toast.success(`Created ${username}`); onOpenChange(false); },
          onError: (e) => toast.error(getFriendlyMessage(e)),
        },
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Edit ${editing?.username}` : "New user"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Change the role, server assignments, or account status."
              : "Create an account and assign its role and servers. No public sign-up exists."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {!isEdit && (
            <>
              <Field label="Username">
                <Input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="off" />
              </Field>
              <Field label="Password (min 8 chars)">
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </Field>
            </>
          )}

          <Field label="Email (optional)">
            <Input type="email" value={email ?? ""} onChange={(e) => setEmail(e.target.value)} />
          </Field>

          <Field label="Role">
            <Select value={role} onValueChange={(v) => setRole(v as ManagedUserRole)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="viewer">Viewer — read-only on assigned servers</SelectItem>
                <SelectItem value="operator">Operator — act on assigned servers</SelectItem>
                <SelectItem value="admin">Admin — full access</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          {role !== "admin" && (
            <Field label="Assigned servers">
              <div className="max-h-44 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
                {servers.length === 0 && (
                  <p className="px-1 py-2 text-xs text-muted-foreground">No servers available.</p>
                )}
                {servers.map((s) => (
                  <label key={s.id} className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm hover:bg-muted/50">
                    <input
                      type="checkbox"
                      checked={serverIds.includes(s.id)}
                      onChange={() => toggleServer(s.id)}
                    />
                    {s.hostname || s.id}
                  </label>
                ))}
              </div>
            </Field>
          )}

          {isEdit && !editing?.is_protected && (
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
              Account active
            </label>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={pending} onClick={submit}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? "Save changes" : "Create user"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
