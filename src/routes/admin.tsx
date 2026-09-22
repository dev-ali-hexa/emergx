import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, Shell } from "@/components/mergex/Shell";
import {
  ADMIN_PASS,
  ADMIN_USER,
  DEPT_CATALOG,
  deptName,
  EMPTY_RESOURCES,
  RESOURCE_FIELDS,
  urgencyClass,
  urgencyLabel,
  useGeolocation,
  useStore,
  type DeptCode,
  type Department,
} from "@/lib/mergex";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Panel — EmergX" },
      {
        name: "description",
        content: "EmergX admin: hospitals add karein, ICU beds aur status manage karein, saare SOS alerts dekhein.",
      },
      { property: "og:title", content: "Admin Panel — EmergX" },
      {
        property: "og:description",
        content: "Hospital registry, bed management aur full SOS alert feed ek jagah.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminPage,
});

const BLANK = {
  name: "",
  area: "",
  phone: "",
  lat: "",
  lng: "",
  beds: "0",
  password: "",
};

function AdminPage() {
  const { hospitals, sos, addHospital, patchHospital, removeHospital } = useStore();
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [authed, setAuthed] = useState(false);
  const [tab, setTab] = useState<"hospitals" | "sos">("hospitals");
  const [form, setForm] = useState(BLANK);

  if (!authed) {
    return (
      <Shell title="Admin login" subtitle="Demo credentials: admin / admin123">
        <Card>
          <div className="space-y-3">
            <input
              value={user}
              onChange={(e) => setUser(e.target.value)}
              placeholder="Username"
              className="w-full rounded-xl border border-input bg-background p-3 text-sm"
            />
            <input
              type="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              placeholder="Password"
              className="w-full rounded-xl border border-input bg-background p-3 text-sm"
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
            <button
              onClick={() =>
                user === ADMIN_USER && pass === ADMIN_PASS
                  ? (setAuthed(true), setError(null))
                  : setError("Galat username ya password.")
              }
              className="w-full rounded-xl bg-primary py-3 font-semibold text-primary-foreground"
            >
              Login
            </button>
          </div>
        </Card>
      </Shell>
    );
  }

  const submit = () => {
    if (!form.name.trim() || !form.password.trim()) {
      setError("Hospital name aur staff password zaroori hai.");
      return;
    }
    setError(null);
    addHospital({
      name: form.name.trim(),
      area: form.area.trim() || "—",
      phone: form.phone.trim() || "108",
      lat: Number(form.lat) || 0,
      lng: Number(form.lng) || 0,
      beds: Number(form.beds) || 0,
      status: "AVAILABLE",
      specialties: [],
      password: form.password.trim(),
    });
    setForm(BLANK);
  };

  return (
    <Shell
      title="Admin panel"
      subtitle="Hospitals manage karo aur saare SOS alerts dekho."
      action={
        <button
          onClick={() => setAuthed(false)}
          className="rounded-lg border border-input px-3 py-1.5 text-sm font-medium"
        >
          Logout
        </button>
      }
    >
      <div className="flex gap-2">
        {(["hospitals", "sos"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-xl py-2 text-sm font-semibold capitalize ${
              tab === t
                ? "bg-primary text-primary-foreground"
                : "border border-input text-foreground"
            }`}
          >
            {t === "sos" ? "SOS alerts" : "Hospitals"}
          </button>
        ))}
      </div>

      {tab === "hospitals" ? (
        <>
          <Card>
            <p className="font-display text-lg font-semibold">Add hospital</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {(
                [
                  ["name", "Hospital name"],
                  ["area", "Area / city"],
                  ["phone", "Phone"],
                  ["lat", "Latitude (e.g. 22.7196)"],
                  ["lng", "Longitude (e.g. 75.8577)"],
                  ["beds", "ICU beds"],
                  ["password", "Staff login password"],
                ] as const
              ).map(([key, label]) => (
                <input
                  key={key}
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  placeholder={label}
                  className="w-full rounded-xl border border-input bg-background p-3 text-sm"
                />
              ))}
            </div>
            {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
            <button
              onClick={submit}
              className="mt-3 w-full rounded-xl bg-primary py-3 font-semibold text-primary-foreground"
            >
              Add hospital
            </button>
          </Card>

          {hospitals.length === 0 && (
            <Card>
              <p className="text-sm text-muted-foreground">Abhi list khaali hai.</p>
            </Card>
          )}
          {hospitals.map((h) => (
            <Card key={h.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-display text-lg font-semibold">{h.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {h.area} • {h.phone} • {h.lat}, {h.lng}
                  </p>
                </div>
                <button
                  onClick={() => removeHospital(h.id)}
                  className="text-xs font-semibold text-destructive"
                >
                  Remove
                </button>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <button
                  onClick={() => patchHospital(h.id, { beds: Math.max(0, h.beds - 1) })}
                  className="h-10 w-10 rounded-full border border-input font-bold"
                >
                  −
                </button>
                <span className="font-display text-2xl font-bold">{h.beds}</span>
                <button
                  onClick={() => patchHospital(h.id, { beds: h.beds + 1 })}
                  className="h-10 w-10 rounded-full bg-primary font-bold text-primary-foreground"
                >
                  +
                </button>
                <button
                  onClick={() =>
                    patchHospital(h.id, {
                      status: h.status === "AVAILABLE" ? "FULL" : "AVAILABLE",
                    })
                  }
                  className="ml-auto rounded-xl border border-input px-3 py-2 text-sm font-semibold"
                >
                  {h.status}
                </button>
              </div>
            </Card>
          ))}
        </>
      ) : (
        <>
          {sos.length === 0 && (
            <Card>
              <p className="text-sm text-muted-foreground">Koi SOS alert nahi aaya.</p>
            </Card>
          )}
          {sos.map((a) => {
            const h = hospitals.find((x) => x.id === a.hospitalId);
            return (
              <Card key={a.id}>
                <p className={`inline-block rounded-md px-2 py-0.5 text-sm font-bold ${urgencyClass(a.urgency)}`}>{urgencyLabel(a.urgency)}</p>
                <p className="text-sm text-muted-foreground">
                  {a.specialty} • routed to {h?.name ?? "—"}
                </p>
                <p className="mt-1 text-sm">“{a.transcript}”</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {a.lat && a.lng ? `GPS ${a.lat.toFixed(4)}, ${a.lng.toFixed(4)}` : "GPS unavailable"} •{" "}
                  {new Date(a.createdAt).toLocaleString()}
                </p>
              </Card>
            );
          })}
        </>
      )}
    </Shell>
  );
}
