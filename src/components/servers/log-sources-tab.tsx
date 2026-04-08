"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  FileText,
  Plus,
  Pencil,
  Trash2,
  Power,
  AlertTriangle,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useLogSources,
  useCreateLogSource,
  useUpdateLogSource,
  useDeleteLogSource,
} from "@/lib/hooks/use-logs";
import type { LogSource, LogParserType } from "@/lib/types";

type OSType = "linux" | "windows";

const PARSER_OPTIONS: { value: LogParserType; label: string }[] = [
  { value: "raw", label: "Raw text" },
  { value: "nginx", label: "Nginx" },
  { value: "apache", label: "Apache" },
  { value: "json", label: "JSON" },
];

// ── Path helpers (OS-aware) ──────────────────────────────────────────
function pathPlaceholder(os: OSType): string {
  return os === "windows"
    ? "C:\\inetpub\\logs\\LogFiles\\access.log"
    : "/var/log/nginx/access.log";
}

function normalizePath(raw: string, os: OSType): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  if (os === "windows") {
    // Windows: keep as-is but convert any forward slashes to backslashes
    return trimmed.replace(/\//g, "\\");
  }
  // Linux: convert backslashes to forward slashes, collapse doubles
  return trimmed.replace(/\\/g, "/").replace(/\/+/g, "/");
}

function validatePath(path: string, os: OSType): string | null {
  if (!path) return "File path is required";
  if (os === "windows") {
    // Accept "C:\..." or "\\server\share\..."
    const isDrive = /^[A-Za-z]:[\\/]/.test(path);
    const isUNC = path.startsWith("\\\\");
    if (!isDrive && !isUNC) {
      return "Windows path must start with a drive letter (e.g. C:\\) or UNC (\\\\server)";
    }
  } else {
    if (!path.startsWith("/")) {
      return "Linux path must be absolute (start with /)";
    }
    if (path.includes("\\")) {
      return "Linux path cannot contain backslashes";
    }
  }
  return null;
}

// ── Main tab ─────────────────────────────────────────────────────────
export function LogSourcesTab({
  serverId,
  osType,
}: {
  serverId: string;
  osType: OSType;
}) {
  const { data: sources, isLoading } = useLogSources(serverId);
  const deleteSource = useDeleteLogSource(serverId);
  const updateSource = useUpdateLogSource(serverId);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<LogSource | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LogSource | null>(null);

  const handleAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const handleEdit = (source: LogSource) => {
    setEditing(source);
    setFormOpen(true);
  };

  const handleToggleActive = async (source: LogSource) => {
    try {
      await updateSource.mutateAsync({
        id: source._id,
        data: { is_active: !source.is_active },
      });
      toast.success(source.is_active ? "Source paused" : "Source resumed");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteSource.mutateAsync(deleteTarget._id);
      toast.success("Log source deleted");
      setDeleteTarget(null);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            Log Sources
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Files this server is collecting logs from. Paths use{" "}
            <span className="font-mono text-foreground">
              {osType === "windows" ? "Windows" : "Linux"}
            </span>{" "}
            format.
          </p>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Source
        </button>
      </div>

      {/* List */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Loading sources...
          </div>
        ) : !sources || sources.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No log sources configured for this server yet.
            </p>
            <button
              onClick={handleAdd}
              className="mt-3 text-xs font-semibold text-primary hover:underline"
            >
              Add your first source →
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wider">
                <th className="text-left px-5 py-3">Name</th>
                <th className="text-left px-5 py-3">File Path</th>
                <th className="text-left px-5 py-3">Parser</th>
                <th className="text-left px-5 py-3">Status</th>
                <th className="text-right px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sources.map((source) => (
                <tr key={source._id} className="hover:bg-muted/20">
                  <td className="px-5 py-3 text-sm font-medium">
                    {source.name}
                  </td>
                  <td className="px-5 py-3 text-xs font-mono text-muted-foreground max-w-xs truncate">
                    {source.file_path}
                  </td>
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center rounded-md bg-muted/50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {source.parser_type}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    {source.is_active ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-green-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                        ACTIVE
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                        PAUSED
                      </span>
                    )}
                    {source.error_count > 0 && (
                      <span className="ml-2 inline-flex items-center gap-1 text-[10px] text-yellow-400">
                        <AlertTriangle className="h-3 w-3" />
                        {source.error_count} err
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleToggleActive(source)}
                        title={source.is_active ? "Pause" : "Resume"}
                        className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                      >
                        <Power className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleEdit(source)}
                        title="Edit"
                        className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(source)}
                        title="Delete"
                        className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-red-500/10 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Form modal */}
      {formOpen && (
        <LogSourceFormModal
          serverId={serverId}
          osType={osType}
          editing={editing}
          onClose={() => setFormOpen(false)}
        />
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-xl">
            <h2 className="text-lg font-bold mb-2">Delete Log Source</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Stop watching{" "}
              <span className="font-semibold text-foreground">
                {deleteTarget.name}
              </span>
              ? Logs already collected from{" "}
              <span className="font-mono text-xs">{deleteTarget.file_path}</span>{" "}
              will remain in the index.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 h-9 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteSource.isPending}
                className="flex-1 h-9 rounded-lg bg-red-500 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-50 transition-colors"
              >
                {deleteSource.isPending ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Form modal (create + edit) ───────────────────────────────────────
function LogSourceFormModal({
  serverId,
  osType,
  editing,
  onClose,
}: {
  serverId: string;
  osType: OSType;
  editing: LogSource | null;
  onClose: () => void;
}) {
  const create = useCreateLogSource(serverId);
  const update = useUpdateLogSource(serverId);

  const [name, setName] = useState(editing?.name ?? "");
  const [filePath, setFilePath] = useState(editing?.file_path ?? "");
  const [parserType, setParserType] = useState<LogParserType>(
    editing?.parser_type ?? "raw"
  );
  const [pathError, setPathError] = useState<string | null>(null);

  // Re-validate when path or os changes
  useEffect(() => {
    if (filePath === "") {
      setPathError(null);
      return;
    }
    setPathError(validatePath(filePath, osType));
  }, [filePath, osType]);

  const isEdit = !!editing;
  const isPending = create.isPending || update.isPending;

  const handlePathBlur = () => {
    if (filePath) setFilePath(normalizePath(filePath, osType));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    const normalized = normalizePath(filePath, osType);
    const err = validatePath(normalized, osType);
    if (err) {
      setPathError(err);
      toast.error(err);
      return;
    }

    try {
      if (isEdit && editing) {
        await update.mutateAsync({
          id: editing._id,
          data: {
            name: name.trim(),
            file_path: normalized,
            parser_type: parserType,
          },
        });
        toast.success("Log source updated");
      } else {
        await create.mutateAsync({
          server_id: serverId,
          name: name.trim(),
          file_path: normalized,
          parser_type: parserType,
        });
        toast.success("Log source added");
      }
      onClose();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold">
              {isEdit ? "Edit Log Source" : "Add Log Source"}
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              {osType === "windows" ? "Windows" : "Linux"} server — paths must
              use {osType === "windows" ? "backslashes" : "forward slashes"}.
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Display Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Nginx Access"
              className="mt-1 w-full h-9 rounded-lg border border-border bg-muted/50 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* File path */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              File Path
            </label>
            <input
              type="text"
              value={filePath}
              onChange={(e) => setFilePath(e.target.value)}
              onBlur={handlePathBlur}
              placeholder={pathPlaceholder(osType)}
              spellCheck={false}
              className={cn(
                "mt-1 w-full h-9 rounded-lg border bg-muted/50 px-3 text-sm font-mono text-foreground focus:outline-none focus:ring-2",
                pathError
                  ? "border-red-500/50 focus:ring-red-500/50"
                  : "border-border focus:ring-primary/50"
              )}
            />
            {pathError && (
              <p className="text-xs text-red-400 mt-1">{pathError}</p>
            )}
          </div>

          {/* Parser type */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Parser
            </label>
            <select
              value={parserType}
              onChange={(e) => setParserType(e.target.value as LogParserType)}
              className="mt-1 w-full h-9 rounded-lg border border-border bg-muted/50 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {PARSER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-9 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || !!pathError}
              className="flex-1 h-9 rounded-lg bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {isPending
                ? isEdit
                  ? "Saving..."
                  : "Adding..."
                : isEdit
                  ? "Save Changes"
                  : "Add Source"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
