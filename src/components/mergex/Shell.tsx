import { Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { emergxApi } from "@/lib/api";

export function Shell({
  title,
  subtitle,
  children,
  action,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);

  useEffect(() => {
    emergxApi.checkHealth().then((h) => setBackendOnline(h.online));
    const interval = setInterval(() => {
      emergxApi.checkHealth().then((h) => setBackendOnline(h.online));
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Output 6: Persistent Non-Diagnostic Safety Disclaimer Banner */}
      <div className="sticky top-0 z-50 border-b border-destructive/30 bg-destructive/15 px-4 py-2 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-2 text-xs font-semibold text-destructive-foreground sm:text-sm">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-destructive animate-pulse" />
            <span>Non-diagnostic AI Assistant — Navigational Guidance Only</span>
          </span>
          <a
            href="tel:108"
            className="shrink-0 rounded-full bg-destructive px-2.5 py-0.5 text-xs font-bold text-white shadow-sm hover:bg-destructive/90"
          >
            Call 108
          </a>
        </div>
      </div>

      <header className="border-b border-border/80 bg-card/90 backdrop-blur-sm shadow-xs">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3.5">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary font-display text-base font-extrabold text-white shadow-md shadow-primary/30">
              ⚡
            </span>
            <span className="font-display text-xl font-extrabold tracking-tight text-foreground">
              Emerg<span className="text-primary">X</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            {/* Live Backend Connection Indicator */}
            <div
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold border ${
                backendOnline
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
                  : backendOnline === false
                  ? "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300"
                  : "border-border bg-secondary text-muted-foreground"
              }`}
              title={
                backendOnline
                  ? "Connected to FastAPI Backend (port 8000)"
                  : "Backend offline. Running on client-side local fallback."
              }
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  backendOnline
                    ? "bg-emerald-500 animate-pulse"
                    : backendOnline === false
                    ? "bg-amber-500"
                    : "bg-muted-foreground animate-ping"
                }`}
              />
              <span className="hidden sm:inline">
                {backendOnline === null
                  ? "Connecting..."
                  : backendOnline
                  ? "Backend Live"
                  : "Local Offline"}
              </span>
            </div>

            <Link
              to="/"
              className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
            >
              Switch Role
            </Link>
            {action}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {title}
        </h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
        <div className="mt-6 space-y-5">{children}</div>
      </main>

      <footer className="mt-auto border-t border-border/40 bg-card/40 px-4 py-6">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs text-muted-foreground">
            EmergX Healthcare & Assistive Intelligence · Track 3: Automate The Ordinary.
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground/80">
            For critical life-threatening situations, dial 108 or 112 immediately.
          </p>
        </div>
      </footer>
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-border/90 bg-card p-4 shadow-sm transition-all duration-200 ${className}`}
    >
      {children}
    </div>
  );
}
