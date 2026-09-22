import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, Shell } from "@/components/mergex/Shell";
import {
  DEPT_CATALOG,
  deptName,
  RESOURCE_FIELDS,
  urgencyBadge,
  urgencyClass,
  urgencyLabel,
  useStore,
  type DeptCode,
} from "@/lib/mergex";
import { emergxApi, type BackendSosIncident } from "@/lib/api";

export const Route = createFileRoute("/hospital")({
  head: () => ({
    meta: [
      { title: "EmergX — Hospital Admin Dashboard (Panel 2)" },
      {
        name: "description",
        content:
          "Hospital ICU Staff Desk: real-time ICU bed count editor (+/-), hospital status toggle (Available/Full) aur incoming SOS alerts feed.",
      },
      { property: "og:title", content: "EmergX — Hospital Admin Dashboard (Panel 2)" },
      {
        property: "og:description",
        content: "Live ICU beds update karein aur incoming patient distress SOS feed dekhein.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HospitalPage,
});

function Stepper({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex items-center gap-3">
        <button
          onClick={() => onChange(Math.max(0, value - 1))}
          className="h-9 w-9 rounded-full border border-input font-bold hover:bg-secondary"
          aria-label={`${label} kam karo`}
        >
          −
        </button>
        <span className="font-display w-8 text-center text-xl font-bold">{value}</span>
        <button
          onClick={() => onChange(value + 1)}
          className="h-9 w-9 rounded-full bg-primary font-bold text-white shadow-xs hover:bg-primary/90"
          aria-label={`${label} badhao`}
        >
          +
        </button>
      </div>
    </div>
  );
}

function HospitalPage() {
  const {
    hospitals,
    sos,
    patchHospital,
    patchResources,
    patchDepartment,
    addDepartment,
    removeDepartment,
  } = useStore();
  const [hospitalId, setHospitalId] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loggedIn, setLoggedIn] = useState<string | null>(null);
  const [newDept, setNewDept] = useState<DeptCode | "">("");
  const [tab, setTab] = useState<"departments" | "resources" | "sos">("departments");
  const [backendSosList, setBackendSosList] = useState<BackendSosIncident[]>([]);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  const hospital = hospitals.find((h) => h.id === loggedIn) ?? null;

  // Poll real-time SOS alerts from backend
  useEffect(() => {
    if (!loggedIn) return;
    const fetchIncidents = () => {
      emergxApi.getRecentSos(10).then((list) => {
        if (list && list.length) setBackendSosList(list);
      });
    };
    fetchIncidents();
    const interval = setInterval(fetchIncidents, 6000);
    return () => clearInterval(interval);
  }, [loggedIn]);

  const login = () => {
    const h = hospitals.find((x) => x.id === hospitalId);
    if (!h) return setError("Hospital chuno.");
    if (h.password !== pass) return setError("Password galat hai.");
    setError(null);
    setPass("");
    setLoggedIn(h.id);
  };

  const handleBedChange = (code: DeptCode, nextBeds: number, totalBeds: number) => {
    if (!hospital) return;
    patchDepartment(hospital.id, code, {
      beds: nextBeds,
      totalBeds: Math.max(totalBeds, nextBeds),
    });

    const sumBeds = hospital.departments.reduce(
      (acc, d) => acc + (d.code === code ? nextBeds : d.beds),
      0,
    );
    emergxApi.updateBeds(hospital.id, sumBeds, hospital.status).then((ok) => {
      if (ok) {
        setSyncStatus("✓ Live beds synced to backend API & PostGIS");
        setTimeout(() => setSyncStatus(null), 3000);
      }
    });
  };

  const handleStatusToggle = () => {
    if (!hospital) return;
    const nextStatus = hospital.status === "AVAILABLE" ? "FULL" : "AVAILABLE";
    patchHospital(hospital.id, { status: nextStatus });
    emergxApi.updateBeds(hospital.id, hospital.beds, nextStatus).then((ok) => {
      if (ok) {
        setSyncStatus(`✓ Status updated to ${nextStatus} on backend`);
        setTimeout(() => setSyncStatus(null), 3000);
      }
    });
  };

  if (!hospital) {
    return (
      <Shell
        title="Hospital Desk Manager Login (Panel 2)"
        subtitle="Apna hospital select karke staff password daalein (Demo Password: staff)."
      >
        <Card>
          {hospitals.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Abhi koi hospital register nahi hua. Master Admin panel se hospitals verify karein.
            </p>
          ) : (
            <div className="space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Select Hospital Facility (Indore & Ujjain)
              </label>
              <select
                value={hospitalId}
                onChange={(e) => setHospitalId(e.target.value)}
                className="w-full rounded-xl border border-input bg-background p-3 text-sm font-medium text-foreground"
              >
                <option value="">Hospital chuno...</option>
                {hospitals.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name} — {h.area}
                  </option>
                ))}
              </select>
              <input
                type="password"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                placeholder="Staff Password (demo: staff)"
                className="w-full rounded-xl border border-input bg-background p-3 text-sm text-foreground"
              />
              {error && <p className="text-xs font-semibold text-destructive">{error}</p>}
              <button
                onClick={login}
                className="w-full rounded-xl bg-primary py-3 font-display font-bold text-white shadow-md shadow-primary/20 hover:bg-primary/90"
              >
                Access Hospital Desk Dashboard →
              </button>
              <p className="text-center text-[11px] text-muted-foreground">
                🔒 Data Isolation Active: Admin can only modify bed counts for their specific facility.
              </p>
            </div>
          )}
        </Card>
      </Shell>
    );
  }

  const myAlerts = sos.filter((s) => s.hospitalId === hospital.id);
  const available = DEPT_CATALOG.filter(
    (d) => !hospital.departments.some((x) => x.code === d.code),
  );

  return (
    <Shell
      title={hospital.name}
      subtitle={`${hospital.area} • department beds aur resources live update karo`}
      action={
        <button
          onClick={() => setLoggedIn(null)}
          className="rounded-lg border border-input px-3 py-1.5 text-sm font-medium hover:bg-secondary"
        >
          Logout
        </button>
      }
    >
      {syncStatus && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/40 px-3.5 py-2 text-xs font-bold text-emerald-800 dark:text-emerald-300">
          {syncStatus}
        </div>
      )}

      <div className="flex gap-2">
        {(["departments", "resources", "sos"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-xl py-2 text-sm font-semibold capitalize transition-all ${
              tab === t
                ? "bg-primary text-white shadow-xs"
                : "border border-input bg-card text-foreground hover:bg-secondary"
            }`}
          >
            {t === "sos" ? `SOS alerts (${myAlerts.length + backendSosList.length})` : t}
          </button>
        ))}
      </div>

      {tab === "departments" && (
        <>
          <Card>
            <button
              onClick={handleStatusToggle}
              className={`w-full rounded-xl border py-3 text-sm font-bold transition-all ${
                hospital.status === "AVAILABLE"
                  ? "border-emerald-500/40 bg-emerald-50/60 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                  : "border-destructive/40 bg-destructive/10 text-destructive"
              }`}
            >
              Hospital status: {hospital.status} — tap to change to{" "}
              {hospital.status === "AVAILABLE" ? "FULL" : "AVAILABLE"}
            </button>
          </Card>

          {hospital.departments.map((d) => (
            <Card key={d.code}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-display text-lg font-semibold text-foreground">{d.name}</p>
                  <p className="text-xs text-muted-foreground">{d.code}</p>
                </div>
                <button
                  onClick={() => removeDepartment(hospital.id, d.code)}
                  className="text-xs font-semibold text-destructive hover:underline"
                >
                  Remove
                </button>
              </div>

              <div className="mt-3 space-y-2">
                <Stepper
                  label="Beds free"
                  value={d.beds}
                  onChange={(v) => handleBedChange(d.code, v, d.totalBeds)}
                />
                <Stepper
                  label="Total beds"
                  value={d.totalBeds}
                  onChange={(v) =>
                    patchDepartment(hospital.id, d.code, {
                      totalBeds: v,
                      beds: Math.min(d.beds, v),
                    })
                  }
                />
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <input
                  value={d.helpline}
                  onChange={(e) =>
                    patchDepartment(hospital.id, d.code, { helpline: e.target.value })
                  }
                  placeholder="Department helpline"
                  className="w-full rounded-xl border border-input bg-background p-3 text-sm"
                />
                <input
                  value={d.floor}
                  onChange={(e) =>
                    patchDepartment(hospital.id, d.code, { floor: e.target.value })
                  }
                  placeholder="Gate / floor (e.g. Gate 2, 1st floor)"
                  className="w-full rounded-xl border border-input bg-background p-3 text-sm"
                />
              </div>

              <label className="mt-3 flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={d.ready24x7}
                  onChange={(e) =>
                    patchDepartment(hospital.id, d.code, { ready24x7: e.target.checked })
                  }
                />
                24x7 emergency ready
              </label>
            </Card>
          ))}

          <Card>
            <p className="font-display text-base font-semibold text-foreground">
              Naya department add karo
            </p>
            <div className="mt-3 flex gap-2">
              <select
                value={newDept}
                onChange={(e) => setNewDept(e.target.value as DeptCode)}
                className="w-full rounded-xl border border-input bg-background p-3 text-sm text-foreground"
              >
                <option value="">Department chuno</option>
                {available.map((d) => (
                  <option key={d.code} value={d.code}>
                    {d.name}
                  </option>
                ))}
              </select>
              <button
                onClick={() => {
                  if (!newDept) return;
                  addDepartment(hospital.id, newDept);
                  setNewDept("");
                }}
                className="shrink-0 rounded-xl bg-primary px-4 text-sm font-semibold text-white hover:bg-primary/90"
              >
                Add
              </button>
            </div>
            {available.length === 0 && (
              <p className="mt-2 text-xs text-muted-foreground">
                Saare departments already add ho gaye hain.
              </p>
            )}
          </Card>
        </>
      )}

      {tab === "resources" && (
        <Card>
          <p className="font-display text-lg font-semibold text-foreground">Emergency resources</p>
          <p className="text-sm text-muted-foreground">
            O2, ventilator, OT, ambulance aur blood units live update karo — patient ko yahi numbers dikhte hain.
          </p>
          <div className="mt-3 space-y-2">
            {RESOURCE_FIELDS.map((f) => (
              <Stepper
                key={f.key}
                label={f.label}
                value={hospital.resources[f.key]}
                onChange={(v) => patchResources(hospital.id, { [f.key]: v })}
              />
            ))}
          </div>
        </Card>
      )}

      {tab === "sos" && (
        <div className="space-y-3">
          {myAlerts.length === 0 && backendSosList.length === 0 && (
            <Card>
              <p className="text-sm text-muted-foreground text-center py-4">
                Abhi koi active emergency SOS alert nahi hai.
              </p>
            </Card>
          )}

          {/* Targeted Hospital SOS Alerts */}
          {myAlerts.map((a) => (
            <Card key={a.id} className="border-destructive/40 shadow-xs">
              <div className="flex items-center justify-between">
                <span
                  className={`inline-block rounded-md px-2 py-0.5 text-xs font-extrabold ${urgencyClass(
                    a.urgency,
                  )}`}
                >
                  {urgencyLabel(a.urgency)}
                </span>
                <span className="text-[11px] font-bold text-destructive">
                  TARGETED TO THIS FACILITY
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {a.specialty} • {deptName(a.deptCode)}
              </p>
              <p className="mt-1 text-sm font-semibold text-foreground">“{a.transcript}”</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {a.lat && a.lng
                  ? `📍 GPS ${a.lat.toFixed(4)}, ${a.lng.toFixed(4)}`
                  : "GPS unavailable"}{" "}
                • {new Date(a.createdAt).toLocaleTimeString()}
              </p>
              {a.lat && a.lng && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${a.lat},${a.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block rounded-lg border border-input bg-secondary/50 px-3 py-1.5 text-xs font-semibold hover:bg-secondary"
                >
                  Open Patient GPS Location →
                </a>
              )}
            </Card>
          ))}

          {/* Real-Time Live Backend Broadcast SOS Alerts */}
          {backendSosList.map((inc) => (
            <Card key={inc.id} className="border-border/80 bg-secondary/20">
              <div className="flex items-center justify-between">
                <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-bold text-amber-800 dark:text-amber-300 border border-amber-500/30">
                  DISPATCH AUDIT LOG
                </span>
                <span className="text-[10px] text-muted-foreground">
                  Status: {inc.status}
                </span>
              </div>
              <p className="mt-2 text-sm font-medium text-foreground">
                {inc.message || "Emergency distress assistance requested"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                📍 GPS: {inc.latitude.toFixed(4)}, {inc.longitude.toFixed(4)}
                {inc.created_at && ` • ${new Date(inc.created_at).toLocaleTimeString()}`}
              </p>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${inc.latitude},${inc.longitude}`}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block rounded-lg border border-input bg-card px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-secondary"
              >
                Track Coordinates on Maps →
              </a>
            </Card>
          ))}
        </div>
      )}
    </Shell>
  );
}
