import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

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

      <header className="border-b border-border bg-card/80 backdrop-blur-sm">
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

      <footer className="mt-auto border-t border-border/40 bg-card/30 px-4 py-6">
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
      className={`rounded-2xl border border-border bg-card p-4 shadow-sm transition-all duration-200 ${className}`}
    >
      {children}
    </div>
  );
}
