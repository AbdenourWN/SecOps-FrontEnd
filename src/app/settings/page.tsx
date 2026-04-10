"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { useAuth } from "@/providers/auth-provider";
import { useTheme } from "next-themes";
import {
  useSaveNotificationConfig,
  useNotificationConfigs,
  useTestNotification,
} from "@/lib/hooks/use-notifications";
import { toast } from "sonner";
import {
  Settings,
  User,
  Palette,
  Bell,
  Globe,
  Mail,
  Send,
  Save,
  Sun,
  Moon,
  Monitor,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SeverityLevel } from "@/lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Tab = "profile" | "appearance" | "notifications" | "api";

const tabs: { id: Tab; label: string; icon: typeof Settings }[] = [
  { id: "profile", label: "Profile", icon: User },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "api", label: "API & Integrations", icon: Globe },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("profile");

  return (
    <AppShell>
      <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted text-muted-foreground text-xs font-bold mb-4 border border-border">
            <Settings className="h-3.5 w-3.5" />
            CONFIGURATION
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
            Settings
          </h1>
          <p className="text-muted-foreground mt-2 max-w-xl leading-relaxed">
            Manage your account, appearance preferences, notification channels,
            and API connectivity.
          </p>
        </div>

        {/* Tab Navigation + Content */}
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Tabs */}
          <nav className="lg:w-56 shrink-0 flex lg:flex-col gap-1 overflow-x-auto pb-2 lg:pb-0">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all whitespace-nowrap",
                  activeTab === id
                    ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </button>
            ))}
          </nav>

          {/* Tab Content */}
          <div className="flex-1 min-w-0">
            {activeTab === "profile" && <ProfileSection />}
            {activeTab === "appearance" && <AppearanceSection />}
            {activeTab === "notifications" && <NotificationsSection />}
            {activeTab === "api" && <ApiSection />}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

/* ─── Profile ──────────────────────────────────────────────── */

function ProfileSection() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <SectionCard title="Account" description="Your identity on the platform.">
        <div className="flex items-center gap-5 mb-6">
          <div className="h-16 w-16 rounded-2xl bg-primary/20 text-primary flex items-center justify-center text-2xl font-black">
            {user.username.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="text-lg font-bold">{user.username}</h3>
            <span className="text-sm text-muted-foreground capitalize">
              {user.role}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FieldGroup label="Username">
            <input
              defaultValue={user.username}
              disabled
              className="w-full px-4 py-2.5 rounded-xl bg-muted/50 border border-border text-sm text-muted-foreground cursor-not-allowed"
            />
          </FieldGroup>
          <FieldGroup label="Role">
            <input
              defaultValue={user.role}
              disabled
              className="w-full px-4 py-2.5 rounded-xl bg-muted/50 border border-border text-sm text-muted-foreground cursor-not-allowed"
            />
          </FieldGroup>
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          Account management will be available once the authentication module is
          deployed (Phase 4).
        </p>
      </SectionCard>
    </div>
  );
}

/* ─── Appearance ───────────────────────────────────────────── */

function AppearanceSection() {
  const { theme, setTheme } = useTheme();

  const options = [
    { id: "light", label: "Light", icon: Sun },
    { id: "dark", label: "Dark", icon: Moon },
    { id: "system", label: "System", icon: Monitor },
  ] as const;

  return (
    <div className="space-y-6">
      <SectionCard
        title="Theme"
        description="Choose how Sentinel Core looks for you."
      >
        <div className="grid grid-cols-3 gap-4">
          {options.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTheme(id)}
              className={cn(
                "flex flex-col items-center gap-3 rounded-2xl border-2 p-6 transition-all",
                theme === id
                  ? "border-primary bg-primary/5 shadow-sm shadow-primary/10"
                  : "border-border hover:border-primary/40 hover:bg-muted/50"
              )}
            >
              <Icon
                className={cn(
                  "h-6 w-6",
                  theme === id ? "text-primary" : "text-muted-foreground"
                )}
              />
              <span
                className={cn(
                  "text-sm font-semibold",
                  theme === id ? "text-primary" : "text-muted-foreground"
                )}
              >
                {label}
              </span>
              {theme === id && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </button>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

/* ─── Notifications ────────────────────────────────────────── */

function NotificationsSection() {
  const { data: configs, isLoading } = useNotificationConfigs();
  const saveConfig = useSaveNotificationConfig();
  const testNotification = useTestNotification();

  const existing = configs?.[0];

  const [enabled, setEnabled] = useState(true);
  const [recipients, setRecipients] = useState("");
  const [minSeverity, setMinSeverity] = useState<SeverityLevel>("medium");
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPassword, setSmtpPassword] = useState("");
  const [initialized, setInitialized] = useState(false);

  // Populate form with existing config once loaded
  if (existing && !initialized) {
    setEnabled(existing.enabled);
    setRecipients(existing.recipients.join(", "));
    setMinSeverity(existing.min_severity);
    if (existing.smtp_host) setSmtpHost(existing.smtp_host);
    if (existing.smtp_port) setSmtpPort(String(existing.smtp_port));
    if (existing.smtp_user) setSmtpUser(existing.smtp_user);
    setInitialized(true);
  }

  const handleSave = async () => {
    const recipientList = recipients
      .split(",")
      .map((r) => r.trim())
      .filter(Boolean);

    if (recipientList.length === 0) {
      toast.error("At least one recipient email is required");
      return;
    }

    try {
      await saveConfig.mutateAsync({
        channel: "email",
        enabled,
        recipients: recipientList,
        min_severity: minSeverity,
        smtp_host: smtpHost || undefined,
        smtp_port: smtpPort ? Number(smtpPort) : undefined,
        smtp_user: smtpUser || undefined,
        smtp_password: smtpPassword || undefined,
      });
      toast.success("Notification config saved");
    } catch {
      toast.error("Failed to save notification config");
    }
  };

  const handleTest = async () => {
    try {
      await testNotification.mutateAsync();
      toast.success("Test alert sent — check your inbox");
    } catch {
      toast.error("Failed to send test alert");
    }
  };

  return (
    <div className="space-y-6">
      <SectionCard
        title="Email Alerts"
        description="Get notified when incidents are detected."
      >
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-12 rounded-xl bg-muted/60 animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="space-y-5">
            {/* Enable toggle */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-semibold">
                  Enable Email Notifications
                </span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Send alerts to configured recipients on incident detection
                </p>
              </div>
              <button
                onClick={() => setEnabled(!enabled)}
                className={cn(
                  "relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors",
                  enabled ? "bg-primary" : "bg-muted-foreground/30"
                )}
              >
                <span
                  className={cn(
                    "inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform mt-0.5",
                    enabled ? "translate-x-[22px]" : "translate-x-0.5"
                  )}
                />
              </button>
            </div>

            <div className="border-t border-border pt-5 space-y-4">
              <FieldGroup label="Recipients">
                <input
                  value={recipients}
                  onChange={(e) => setRecipients(e.target.value)}
                  placeholder="admin@company.com, soc@company.com"
                  className="w-full px-4 py-2.5 rounded-xl bg-muted/50 border border-border focus:border-primary/50 outline-none text-sm"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Comma-separated list of email addresses
                </p>
              </FieldGroup>

              <FieldGroup label="Minimum Severity">
                <Select
                  value={minSeverity}
                  onValueChange={(v) => setMinSeverity(v as SeverityLevel)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Only send alerts for incidents at or above this severity
                </p>
              </FieldGroup>
            </div>

            {/* SMTP Override section */}
            <div className="border-t border-border pt-5">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 border border-border mb-4">
                <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                  <Mail className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-xs font-bold block">SMTP Override (optional)</span>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                    SMTP credentials are configured securely in the server&apos;s <code className="px-1 py-0.5 rounded bg-muted font-mono text-[10px]">.env</code> file.
                    Only fill these fields if you need to override the defaults for this notification channel.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FieldGroup label="SMTP Host">
                  <input
                    value={smtpHost}
                    onChange={(e) => setSmtpHost(e.target.value)}
                    placeholder="smtp.gmail.com"
                    className="w-full px-4 py-2.5 rounded-xl bg-muted/50 border border-border focus:border-primary/50 outline-none text-sm"
                  />
                </FieldGroup>
                <FieldGroup label="SMTP Port">
                  <input
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(e.target.value)}
                    placeholder="587"
                    className="w-full px-4 py-2.5 rounded-xl bg-muted/50 border border-border focus:border-primary/50 outline-none text-sm"
                  />
                </FieldGroup>
                <FieldGroup label="SMTP User">
                  <input
                    value={smtpUser}
                    onChange={(e) => setSmtpUser(e.target.value)}
                    placeholder="alerts@company.com"
                    className="w-full px-4 py-2.5 rounded-xl bg-muted/50 border border-border focus:border-primary/50 outline-none text-sm"
                  />
                </FieldGroup>
                <FieldGroup label="SMTP Password">
                  <input
                    type="password"
                    value={smtpPassword}
                    onChange={(e) => setSmtpPassword(e.target.value)}
                    placeholder="********"
                    className="w-full px-4 py-2.5 rounded-xl bg-muted/50 border border-border focus:border-primary/50 outline-none text-sm"
                  />
                </FieldGroup>
              </div>
              <p className="text-[11px] text-muted-foreground mt-3">
                Leave blank to use the server&apos;s default SMTP settings from the
                environment.
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleSave}
                disabled={saveConfig.isPending}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all text-sm font-semibold shadow-lg shadow-primary/20 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {saveConfig.isPending ? "Saving..." : "Save Configuration"}
              </button>
              <button
                onClick={handleTest}
                disabled={testNotification.isPending}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-card border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-sm font-semibold shadow-sm disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                {testNotification.isPending ? "Sending..." : "Send Test Alert"}
              </button>
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  );
}

/* ─── API & Integrations ───────────────────────────────────── */

function ApiSection() {
  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:8500";

  return (
    <div className="space-y-6">
      <SectionCard
        title="Backend API"
        description="Connection details for the SecOps engine."
      >
        <div className="space-y-4">
          <FieldGroup label="API Base URL">
            <div className="flex items-center gap-3">
              <input
                value={apiUrl}
                disabled
                className="flex-1 px-4 py-2.5 rounded-xl bg-muted/50 border border-border text-sm font-mono text-muted-foreground cursor-not-allowed"
              />
              <span className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-success/10 text-success text-xs font-bold border border-success/20">
                <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                Connected
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1.5">
              Configured via <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-[10px]">NEXT_PUBLIC_API_URL</code> environment variable.
            </p>
          </FieldGroup>

          <FieldGroup label="Available Endpoints">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                "Servers",
                "Incidents",
                "Logs",
                "Metrics",
                "Rules",
                "Scripts",
                "Notifications",
                "Dashboard",
                "Analysis",
              ].map((ep) => (
                <div
                  key={ep}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-muted/30 text-xs font-semibold"
                >
                  <Mail className="h-3 w-3 text-primary" />
                  {ep}
                </div>
              ))}
            </div>
          </FieldGroup>
        </div>
      </SectionCard>

      <SectionCard
        title="Authentication"
        description="JWT-based access control for the platform."
      >
        <div className="flex items-start gap-4 p-4 rounded-xl bg-muted/30 border border-border">
          <div className="h-10 w-10 rounded-xl bg-warning/10 text-warning flex items-center justify-center shrink-0">
            <Globe className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold">Coming in Phase 4</h4>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              JWT authentication, role-based access control, and session
              management are planned for the next release phase. The platform
              currently operates with a mock admin identity.
            </p>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

/* ─── Shared helpers ───────────────────────────────────────── */

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 lg:p-8">
      <h2 className="text-xl font-bold tracking-tight">{title}</h2>
      <p className="text-sm text-muted-foreground mt-1 mb-6">{description}</p>
      {children}
    </div>
  );
}

function FieldGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
        {label}
      </label>
      {children}
    </div>
  );
}
