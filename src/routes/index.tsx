import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EmergX — Emergency Hospital & Assistive Intelligence" },
      {
        name: "description",
        content:
          "EmergX: Hinglish voice se emergency triage, nearest hospital beds aur 1-click SOS. Patient, hospital aur admin panels.",
      },
      { property: "og:title", content: "EmergX — Emergency Hospital & Assistive Intelligence" },
      {
        property: "og:description",
        content: "Hinglish voice triage, live ICU bed status aur 1-click SOS alerts.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RoleSelect,
});

const ROLES = [
  {
    to: "/patient" as const,
    badge: "PATIENT MODE",
    badgeColor: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30",
    title: "Patient / Distressed User",
    desc: "Zero login. 5-second Hinglish voice input, real-time Urgency Badge, nearest ICU beds & 1-Click SOS.",
    cta: "Launch Emergency Mode →",
  },
  {
    to: "/hospital" as const,
    badge: "HOSPITAL DESK",
    badgeColor: "bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30",
    title: "Hospital Admin / ICU Desk",
    desc: "Single-hospital view: live ICU bed counters (+ / −), hospital status toggle (Available / Full) & incoming SOS alerts feed.",
    cta: "Open Desk Dashboard →",
  },
  {
    to: "/admin" as const,
    badge: "MASTER REGISTRY",
    badgeColor: "bg-emerald-600/15 text-emerald-800 dark:text-emerald-200 border border-emerald-600/30",
    title: "Master Admin & Hospital Registry",
    desc: "Manage seeded Indore & Ujjain hospitals, configure verified healthcare facilities, and monitor city-wide distress logs.",
    cta: "Open Master Admin →",
  },
];

function RoleSelect() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between">
      {/* Top safety disclaimer */}
      <div className="border-b border-destructive/30 bg-destructive/15 px-4 py-2 text-center text-xs font-semibold text-destructive-foreground">
        ⚠️ Non-diagnostic AI Assistant — Navigational Guidance Only. For immediate medical emergency, dial 108.
      </div>

      <div className="mx-auto w-full max-w-2xl px-4 py-10">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-primary/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary border border-primary/30">
            Track 3 · Healthcare & Assistive Intelligence
          </span>
          <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-muted-foreground border border-border">
            Automate The Ordinary
          </span>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-2xl shadow-lg shadow-primary/30">
            ⚡
          </span>
          <div>
            <h1 className="font-display text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
              Emerg<span className="text-primary">X</span>
            </h1>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Emergency Healthcare Navigation Pipeline
            </p>
          </div>
        </div>

        <p className="mt-4 text-base text-muted-foreground leading-relaxed">
          Beating the <strong className="text-foreground">Golden Hour Delay</strong> in 5 seconds.
          Hinglish voice symptom triage, real-time verified ICU bed counts, 1-Click Google Maps turn-by-turn routing, and instant 1-Click Family SOS dispatch.
        </p>

        <p className="mt-8 text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Select Active Portal / Demo Panel
        </p>

        <div className="mt-3 space-y-3">
          {ROLES.map((r) => (
            <Link
              key={r.to}
              to={r.to}
              className="group block rounded-2xl border border-border bg-card p-5 shadow-sm transition-all duration-200 hover:border-primary/60 hover:bg-card/90 hover:shadow-md"
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${r.badgeColor}`}
                >
                  {r.badge}
                </span>
                <span className="text-xs font-semibold text-primary opacity-80 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all">
                  {r.cta}
                </span>
              </div>
              <h2 className="mt-2 font-display text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                {r.title}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground leading-normal">{r.desc}</p>
            </Link>
          ))}
        </div>
      </div>

      <div className="border-t border-border/40 py-6 text-center text-xs text-muted-foreground">
        EmergX · Hack It Bros '26 Blueprint Execution
      </div>
    </div>
  );
}
