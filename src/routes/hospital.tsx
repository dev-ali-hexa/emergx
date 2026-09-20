import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, Shell } from "@/components/mergex/Shell";
import {
  DEPT_CATALOG,
  deptName,
  RESOURCE_FIELDS,
  urgencyClass,
  urgencyLabel,
  useStore,
  type DeptCode,
} from "@/lib/mergex";

export const Route = createFileRoute("/hospital")({
  head: () => ({
    meta: [
      { title: "Hospital Dashboard — MergeX" },
      {
        name: "description",
        content:
          "Hospital staff department wise beds, O2, ventilators, OT, ambulance aur incoming SOS alerts manage karein.",
      },
      { property: "og:title", content: "Hospital Dashboard — MergeX" },
      {
        property: "og:description",
        content: "Live department beds aur emergency resources update karein, SOS feed dekhein.",
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
          className="h-9 w-9 rounded-full border border-input font-bold"
          aria-label={`${label} kam karo`}
        >
          −
        </button>
        <span className="font-display w-8 text-center text-xl font-bold">{value}</span>
        <button
          onClick={() => onChange(value + 1)}
          className="h-9 w-9 rounded-full bg-primary font-bold text-primary-foreground"
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

  const hospital = hospitals.find((h) => h.id === loggedIn) ?? null;

  const login = () => {
    const h = hospitals.find((x) => x.id === hospitalId);
    if (!h) return setError("Hospital chuno.");
    if (h.password !== pass) return setError("Password galat hai.");
    setError(null);
    setPass("");
    setLoggedIn(h.id);
  };

  if (!hospital) {
    return (
      <Shell title="Hospital staff login" subtitle="Apna hospital chuno aur password dalo.">
        <Card>
          {hospitals.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Abhi koi hospital register nahi hua. Admin panel se hospital add karwao.
            </p>
          ) : (
            <div className="space-y-3">
              <select
                value={hospitalId}
                onChange={(e) => setHospitalId(e.target.value)}
                className="w-full rounded-xl border border-input bg-background p-3 text-sm"
              >
                <option value="">Hospital select karo</option>
                {hospitals.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
              <input
                type="password"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                placeholder="Password"
                className="w-full rounded-xl border border-input bg-background p-3 text-sm"
              />
              {error && <p className="text-xs text-destructive">{error}</p>}
              <button
                onClick={login}
                className="w-full rounded-xl bg-primary py-3 font-semibold text-primary-foreground"
              >
                Login
              </button>
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
          className="rounded-lg border border-input px-3 py-1.5 text-sm font-medium"
        >
          Logout
        </button>
      }
    >
      <div className="flex gap-2">
        {(["departments", "resources", "sos"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-xl py-2 text-sm font-semibold capitalize ${
              tab === t ? "bg-primary text-primary-foreground" : "border border-input"
            }`}
          >
            {t === "sos" ? "SOS alerts" : t}
          </button>
        ))}
      </div>

      {tab === "departments" && (
        <>
          <Card>
            <button
              onClick={() =>
                patchHospital(hospital.id, {
                  status: hospital.status === "AVAILABLE" ? "FULL" : "AVAILABLE",
                })
              }
              className="w-full rounded-xl border border-input py-3 text-sm font-semibold"
            >
              Hospital status: {hospital.status} — tap to{" "}
              {hospital.status === "AVAILABLE" ? "FULL" : "AVAILABLE"}
            </button>
          </Card>

          {hospital.departments.map((d) => (
            <Card key={d.code}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-display text-lg font-semibold">{d.name}</p>
                  <p className="text-xs text-muted-foreground">{d.code}</p>
                </div>
                <button
                  onClick={() => removeDepartment(hospital.id, d.code)}
                  className="text-xs font-semibold text-destructive"
                >
                  Remove
                </button>
              </div>

              <div className="mt-3 space-y-2">
                <Stepper
                  label="Beds free"
                  value={d.beds}
                  onChange={(v) =>
                    patchDepartment(hospital.id, d.code, {
                      beds: v,
                      totalBeds: Math.max(d.totalBeds, v),
                    })
                  }
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

              <label className="mt-3 flex items-center gap-2 text-sm">
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
            <p className="font-display text-base font-semibold">Naya department add karo</p>
            <div className="mt-3 flex gap-2">
              <select
                value={newDept}
                onChange={(e) => setNewDept(e.target.value as DeptCode)}
                className="w-full rounded-xl border border-input bg-background p-3 text-sm"
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
                className="shrink-0 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
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
          <p className="font-display text-lg font-semibold">Emergency resources</p>
          <p className="text-sm text-muted-foreground">
            O2, ventilator, OT, ambulance aur blood units live update karo — patient ko yahi
            numbers dikhte hain.
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
          {myAlerts.length === 0 && (
            <Card>
              <p className="text-sm text-muted-foreground">Abhi koi alert nahi.</p>
            </Card>
          )}
          {myAlerts.map((a) => (
            <Card key={a.id}>
              <p
                className={`inline-block rounded-md px-2 py-0.5 text-sm font-bold ${urgencyClass(
                  a.urgency,
                )}`}
              >
                {urgencyLabel(a.urgency)}
              </p>
              <p className="text-sm text-muted-foreground">
                {a.specialty} • {deptName(a.deptCode)}
              </p>
              <p className="mt-1 text-sm">“{a.transcript}”</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {a.lat && a.lng
                  ? `GPS ${a.lat.toFixed(4)}, ${a.lng.toFixed(4)}`
                  : "GPS unavailable"}{" "}
                • {new Date(a.createdAt).toLocaleTimeString()}
              </p>
              {a.lat && a.lng && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${a.lat},${a.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block rounded-lg border border-input px-3 py-1.5 text-xs font-semibold"
                >
                  Patient location dekho
                </a>
              )}
            </Card>
          ))}
        </div>
      )}
    </Shell>
  );
}
