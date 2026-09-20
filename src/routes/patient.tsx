import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { Card, Shell } from "@/components/mergex/Shell";
import {
  DEPT_CATALOG,
  distanceKm,
  mapsLink,
  matchDepartment,
  RESOURCE_FIELDS,
  triage,
  urgencyClass,
  urgencyLabel,
  useGeolocation,
  useStore,
  type DeptCode,
  type Hospital,
  type Urgency,
} from "@/lib/mergex";

export const Route = createFileRoute("/patient")({
  head: () => ({
    meta: [
      { title: "Emergency Help — MergeX" },
      {
        name: "description",
        content:
          "Hinglish me bolo, MergeX urgency batayega aur nearest hospital ke sahi department tak navigate karega.",
      },
      { property: "og:title", content: "Emergency Help — MergeX" },
      {
        property: "og:description",
        content: "Voice triage, live department beds, 1-click navigation aur SOS.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PatientPage,
});

function PatientPage() {
  const { hospitals, addSos } = useStore();
  const geo = useGeolocation(true);
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    urgency: Urgency;
    specialty: string;
    dept: DeptCode;
  } | null>(null);
  const [deptOverride, setDeptOverride] = useState<DeptCode | "">("");
  const [manual, setManual] = useState({ lat: "", lng: "" });
  const [sosSent, setSosSent] = useState(false);
  const recRef = useRef<any>(null);

  const activeDept: DeptCode = (deptOverride || result?.dept || "GENERAL") as DeptCode;

  const startVoice = () => {
    setVoiceError(null);
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setVoiceError("Is browser me voice support nahi hai — neeche type kar do.");
      return;
    }
    const rec = new SR();
    rec.lang = "hi-IN";
    rec.interimResults = true;
    rec.onresult = (e: any) => {
      const t = Array.from(e.results)
        .map((r: any) => r[0].transcript)
        .join(" ");
      setText(t);
    };
    rec.onerror = () => {
      setVoiceError("Mic access nahi mila. Type kar ke bhi bata sakte ho.");
      setListening(false);
    };
    rec.onend = () => setListening(false);
    recRef.current = rec;
    setListening(true);
    rec.start();
  };

  const stopVoice = () => {
    recRef.current?.stop();
    setListening(false);
  };

  const analyze = () => {
    if (!text.trim()) return;
    const r = triage(text);
    setResult({ urgency: r.urgency, specialty: r.specialty, dept: r.dept });
    setDeptOverride("");
    setSosSent(false);
    if (!geo.coords) geo.locate();
  };

  const ranked = useMemo(() => {
    const list = hospitals.map((h) => ({
      h,
      km: geo.coords ? distanceKm(geo.coords, h) : null,
      dept: matchDepartment(h, activeDept),
    }));
    return list.sort((a, b) => {
      const aExact = a.dept?.code === activeDept ? 0 : 1;
      const bExact = b.dept?.code === activeDept ? 0 : 1;
      if (aExact !== bExact) return aExact - bExact;
      return (a.km ?? 9999) - (b.km ?? 9999);
    });
  }, [hospitals, geo.coords, activeDept]);

  const top = ranked.slice(0, 3);

  const sendSos = () => {
    addSos({
      hospitalId: top[0]?.h.id ?? null,
      urgency: result?.urgency ?? "MODERATE",
      specialty: result?.specialty ?? "General Medicine",
      deptCode: activeDept,
      transcript: text.trim(),
      lat: geo.coords?.lat ?? null,
      lng: geo.coords?.lng ?? null,
    });
    setSosSent(true);
  };

  return (
    <Shell
      title="Emergency help"
      subtitle="Hinglish me bolo ya likho — jaise “chest pain ho raha hai, saans nahi aa rahi”."
    >
      <Card>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Aapki location
            </p>
            <p className="mt-1 text-sm">
              {geo.coords
                ? `${geo.coords.lat.toFixed(4)}, ${geo.coords.lng.toFixed(4)}${
                    geo.accuracy ? ` • ±${Math.round(geo.accuracy)} m` : ""
                  }`
                : geo.status === "locating"
                  ? "Location le rahe hain…"
                  : "Location abhi nahi mili"}
            </p>
            {geo.message && (
              <p className="mt-1 text-xs text-muted-foreground">{geo.message}</p>
            )}
          </div>
          <button
            onClick={geo.locate}
            className="rounded-lg border border-input px-3 py-1.5 text-sm font-semibold"
          >
            {geo.coords ? "Refresh" : "Allow location"}
          </button>
        </div>

        {!geo.coords && geo.status !== "locating" && (
          <div className="mt-3 flex gap-2">
            <input
              value={manual.lat}
              onChange={(e) => setManual({ ...manual, lat: e.target.value })}
              placeholder="Latitude"
              className="w-full rounded-xl border border-input bg-background p-2 text-sm"
            />
            <input
              value={manual.lng}
              onChange={(e) => setManual({ ...manual, lng: e.target.value })}
              placeholder="Longitude"
              className="w-full rounded-xl border border-input bg-background p-2 text-sm"
            />
            <button
              onClick={() => {
                const lat = Number(manual.lat);
                const lng = Number(manual.lng);
                if (!Number.isNaN(lat) && !Number.isNaN(lng) && (lat || lng))
                  geo.setManual(lat, lng);
              }}
              className="shrink-0 rounded-xl bg-primary px-3 text-sm font-semibold text-primary-foreground"
            >
              Set
            </button>
          </div>
        )}
      </Card>

      <Card>
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={listening ? stopVoice : startVoice}
            className={`flex h-24 w-24 items-center justify-center rounded-full text-3xl transition-transform ${
              listening
                ? "animate-pulse bg-destructive text-destructive-foreground"
                : "bg-primary text-primary-foreground hover:scale-105"
            }`}
            aria-label={listening ? "Stop recording" : "Start voice input"}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-9 w-9"
            >
              <rect x="9" y="3" width="6" height="11" rx="3" />
              <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
            </svg>
          </button>
          <p className="text-sm text-muted-foreground">
            {listening ? "Sun raha hoon… bol kar batao" : "Tap karke bolo"}
          </p>
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          placeholder="Kya problem ho rahi hai?"
          className="mt-4 w-full rounded-xl border border-input bg-background p-3 text-sm outline-none focus:border-primary"
        />
        {voiceError && <p className="mt-2 text-xs text-destructive">{voiceError}</p>}

        <button
          onClick={analyze}
          disabled={!text.trim()}
          className="mt-3 w-full rounded-xl bg-primary py-3 font-semibold text-primary-foreground disabled:opacity-50"
        >
          Check urgency & department
        </button>
      </Card>

      {result && (
        <>
          <Card>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Urgency
            </p>
            <p
              className={`mt-1 inline-block rounded-lg px-3 py-1 font-display text-2xl font-bold ${urgencyClass(
                result.urgency,
              )}`}
            >
              {urgencyLabel(result.urgency)}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Suggested care: {result.specialty}
            </p>

            <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Department (badal bhi sakte ho)
            </label>
            <select
              value={activeDept}
              onChange={(e) => setDeptOverride(e.target.value as DeptCode)}
              className="mt-1 w-full rounded-xl border border-input bg-background p-3 text-sm"
            >
              {DEPT_CATALOG.map((d) => (
                <option key={d.code} value={d.code}>
                  {d.name}
                </option>
              ))}
            </select>
          </Card>

          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Nearest hospitals — department wise
            </p>
            {top.length === 0 && (
              <Card>
                <p className="text-sm text-muted-foreground">
                  Abhi koi hospital add nahi hua. Admin panel se hospitals add karo.
                </p>
              </Card>
            )}
            {top.map(({ h, km, dept }) => (
              <HospitalCard
                key={h.id}
                hospital={h}
                km={km}
                dept={dept}
                wanted={activeDept}
                origin={geo.coords}
              />
            ))}
          </div>

          <button
            onClick={sendSos}
            className="w-full rounded-xl bg-destructive py-4 font-display text-lg font-bold text-destructive-foreground"
          >
            {sosSent ? "SOS alert bhej diya ✓" : "Send SOS alert"}
          </button>
          {sosSent && (
            <p className="text-center text-xs text-muted-foreground">
              Alert {top[0]?.h.name ?? "nearest hospital"} ke dashboard par dikh gaya.
            </p>
          )}
        </>
      )}
    </Shell>
  );
}

function HospitalCard({
  hospital: h,
  km,
  dept,
  wanted,
  origin,
}: {
  hospital: Hospital;
  km: number | null;
  dept: ReturnType<typeof matchDepartment>;
  wanted: DeptCode;
  origin: { lat: number; lng: number } | null;
}) {
  const exact = dept?.code === wanted;
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-lg font-semibold">{h.name}</p>
          <p className="text-sm text-muted-foreground">
            {h.area}
            {km !== null && ` • ${km.toFixed(1)} KM`}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
            h.status === "FULL"
              ? "bg-destructive/10 text-destructive"
              : "bg-secondary text-secondary-foreground"
          }`}
        >
          {h.status}
        </span>
      </div>

      {dept && (
        <div className="mt-3 rounded-xl border border-border bg-secondary/40 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {exact ? "Matched department" : "Closest available department"}
          </p>
          <p className="font-display text-base font-semibold">{dept.name}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-primary/10 px-2 py-0.5 font-semibold text-primary">
              {dept.beds}
              {dept.totalBeds ? ` / ${dept.totalBeds}` : ""} beds free
            </span>
            {dept.ready24x7 && (
              <span className="rounded-full bg-secondary px-2 py-0.5 font-semibold text-secondary-foreground">
                24x7 ready
              </span>
            )}
            {dept.floor && <span className="text-muted-foreground">{dept.floor}</span>}
          </div>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        {RESOURCE_FIELDS.map((f) => (
          <span key={f.key} className="rounded-full border border-border px-2 py-0.5">
            {f.label}: <span className="font-semibold">{h.resources[f.key]}</span>
          </span>
        ))}
      </div>

      {h.departments.length > 1 && (
        <p className="mt-3 text-xs text-muted-foreground">
          Other units:{" "}
          {h.departments
            .filter((d) => d.code !== dept?.code)
            .map((d) => `${d.name} (${d.beds})`)
            .join(", ")}
        </p>
      )}

      <div className="mt-3 flex gap-2">
        <a
          href={mapsLink(h, dept, origin)}
          target="_blank"
          rel="noreferrer"
          className="flex-1 rounded-xl bg-primary py-2 text-center text-sm font-semibold text-primary-foreground"
        >
          Navigate{dept ? ` → ${dept.name.split(" ")[0]}` : ""}
        </a>
        <a
          href={`tel:${dept?.helpline || h.phone}`}
          className="flex-1 rounded-xl border border-input py-2 text-center text-sm font-semibold"
        >
          {dept?.helpline ? "Call department" : "Call hospital"}
        </a>
      </div>
    </Card>
  );
}
