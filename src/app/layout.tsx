import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { QueryProvider } from "@/providers/query-provider";
import { AuthProvider } from "@/providers/auth-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sentinel Core — SecOps Intelligence",
  description:
    "Security Operations automation platform — server monitoring, incident management, and automated threat response.",
  icons: {
    icon: "/logo.webp",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider>
          <QueryProvider>
            <AuthProvider>
              {children}
              {/* Default toaster — app feedback toasts (errors, confirmations). */}
              <Toaster
                position="bottom-right"
                richColors
                toastOptions={{
                  classNames: {
                    toast: "border border-border bg-card text-foreground",
                  },
                }}
              />
              {/* Dedicated toaster for in-app notification pop-ups (top-right).
                  Routed to via toast.custom(..., { toasterId: "notifications" }). */}
              <Toaster id="notifications" position="top-right" closeButton />
            </AuthProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
