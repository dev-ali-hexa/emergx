import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Card, Shell } from "@/components/mergex/Shell";
import {
  DEPT_CATALOG,
  distanceKm,
  LOCATION_PRESETS,
  mapsLink,
  matchDepartment,
  RESOURCE_FIELDS,
  SYMPTOM_PRESETS,
  urgencyBadge,
  useGeolocation,
  useStore,
  type DeptCode,
  type Hospital,
  type Urgency,
} from "@/lib/mergex";
import { emergxApi, type BackendBloodBank } from "@/lib/api";

export const Route = createFileRoute("/patient")({
  head: () => ({
    meta: [
      { title: "EmergX — Emergency Distress & Hinglish Voice Triage" },
      {
        name: "description",
        content:
          "Hinglish voice emergency triage, nearest Indore/Ujjain hospital ICU beds, blood bank discovery aur 1-Click Google Maps & SOS alerts.",
      },
      { property: "og:title", content: "EmergX — Emergency Distress & Voice Triage" },
      {
        property: "og:description",
        content: "5-second voice triage, live ICU bed counts, blood bank units aur 1-Click SOS alerts.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PatientPage,
});

const FIRST_AID_GUIDES: Record<DeptCode, { title: string; steps: string[]; alert: string }> = {
  CARDIAC: {
    title: "Cardiac Distress & Heart Attack Protocol",
    alert: "Keep patient calm. Do not allow them to walk or exert.",
    steps: [
      "Help patient sit in an upright position with knees bent (W-position on floor).",
      "Loosen tight clothing around neck, chest, and waist immediately.",
      "If patient has prescribed emergency heart medication (Aspirin/Sorbitrate), assist them.",
      "If patient becomes unresponsive, begin Hands-Only CPR: push hard & fast in center of chest (100-120 beats/min).",
    ],
  },
  STROKE: {
    title: "Stroke F.A.S.T Protocol",
    alert: "Golden Window is 4.5 hours for clot-dissolving treatment. Move immediately.",
    steps: [
      "F (Face): Ask patient to smile. Does one side of the face droop?",
      "A (Arms): Ask patient to raise both arms. Does one arm drift downward?",
      "S (Speech): Ask patient to repeat a simple phrase. Is their speech slurred?",
      "T (Time): Note the exact minute symptoms appeared to inform ER staff.",
      "Place patient in lateral recovery position. Do NOT give water, food, or aspirin.",
    ],
  },
  TRAUMA: {
    title: "Severe Bleeding & Fracture Protocol",
    alert: "Stop severe blood loss immediately to prevent hypovolemic shock.",
    steps: [
      "Apply firm, continuous direct pressure with a clean cloth or sterile gauze over the wound.",
      "If no fracture is suspected, elevate bleeding limb above heart level.",
      "If fracture is suspected, immobilize the limb as found. Do NOT try to realign bones.",
      "Cover patient with a warm jacket or blanket to prevent hypothermia.",
    ],
  },
  BURN: {
    title: "Thermal & Scald Burn Emergency",
    alert: "Never apply ice, turmeric, paste, or greasy ointments to burns.",
    steps: [
      "Gently flush the burned area under cool running tap water for 15-20 minutes.",
      "Remove jewelry, watches, and loose constrictive items before swelling begins.",
      "Do NOT break blisters or peel stuck clothing away from burned skin.",
      "Loosely cover the area with a clean non-adherent sterile dressing or plastic wrap.",
    ],
  },
  ICU: {
    title: "Critical Respiratory Distress Protocol",
    alert: "Ensure maximum airway opening and ventilation.",
    steps: [
      "Position patient seated upright leaning slightly forward (tripod position).",
      "Ensure windows are open for maximum fresh airflow.",
      "If patient has an emergency rescue inhaler (Salbutamol), administer 2-4 puffs.",
      "Keep patient reassured and calm to minimize oxygen consumption.",
    ],
  },
  PEDIATRIC: {
    title: "Pediatric Emergency Protocol",
    alert: "Keep child in parent's or caregiver's arms to avoid panic.",
    steps: [
      "For febrile seizure: lay child on their side on a soft surface, clear surrounding objects.",
      "Do NOT place fingers or objects into the child's mouth during convulsion.",
      "For choking: perform 5 firm back blows followed by 5 gentle chest thrusts.",
      "Offer small sips of ORS only if the child is fully conscious and alert.",
    ],
  },
  MATERNITY: {
    title: "Maternal & Labour Distress Protocol",
    alert: "Track contraction frequency and check for water break.",
    steps: [
      "Have mother rest on her left side to maximize placental oxygenation.",
      "Encourage steady, deep rhythmic breathing through contractions.",
      "Prepare clean towels, warm clothes, and maternal medical records file.",
      "Proceed immediately to the nearest maternity emergency labour suite.",
    ],
  },
  GENERAL: {
    title: "Emergency Care Immediate Steps",
    alert: "Monitor responsiveness and vital symptoms continuously.",
    steps: [
      "Check responsiveness and ensure the patient's airway is clear.",
      "Do NOT administer oral liquids or food if patient feels drowsy or nauseous.",
      "Place patient in a relaxed, comfortable recovery position.",
      "Navigate to the closest verified emergency triage facility.",
    ],
  },
};

const BLOOD_GROUPS = ["ALL", "O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"];

function PatientPage() {
  const { hospitals, addSos, contacts, addContact, removeContact } = useStore();
  const geo = useGeolocation(true);
  const [activeTab, setActiveTab] = useState<"hospital" | "blood">("hospital");
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<{
    urgency: Urgency;
    specialty: string;
    dept: DeptCode;
    source?: string;
  } | null>(null);
  const [deptOverride, setDeptOverride] = useState<DeptCode | "">("");
  const [manual, setManual] = useState({ lat: "", lng: "" });
  const [sosSent, setSosSent] = useState(false);
  const [contactsModalOpen, setContactsModalOpen] = useState(false);
  const [newContact, setNewContact] = useState({ name: "", phone: "", relation: "" });

  // Blood bank state
  const [selectedBloodGroup, setSelectedBloodGroup] = useState("ALL");
  const [bloodBanks, setBloodBanks] = useState<BackendBloodBank[]>([]);
  const [loadingBlood, setLoadingBlood] = useState(false);

  const recRef = useRef<any>(null);
  const activeDept: DeptCode = (deptOverride || result?.dept || "GENERAL") as DeptCode;

  // Load blood banks on tab change or filter
  useEffect(() => {
    if (activeTab === "blood") {
      setLoadingBlood(true);
      const lat = geo.coords?.lat ?? 22.7196;
      const lng = geo.coords?.lng ?? 75.8577;
      emergxApi
        .getBloodBanks(lat, lng, selectedBloodGroup, 30)
        .then((data) => setBloodBanks(data))
        .finally(() => setLoadingBlood(false));
    }
  }, [activeTab, selectedBloodGroup, geo.coords]);

  const startVoice = () => {
    setVoiceError(null);
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setVoiceError("Is browser me voice support nahi hai — neeche type karein ya chip tap karein.");
      return;
    }
    try {
      const rec = new SR();
      rec.lang = "hi-IN";
      rec.interimResults = true;
      rec.continuous = false;
      rec.onresult = (e: any) => {
        const t = Array.from(e.results)
          .map((r: any) => r[0].transcript)
          .join(" ");
        setText(t);
      };
      rec.onerror = (e: any) => {
        console.warn("Speech error:", e);
        setVoiceError("Mic access nahi mila. Type karke ya quick symptoms se bataiye.");
        setListening(false);
      };
      rec.onend = () => setListening(false);
      recRef.current = rec;
      setListening(true);
      rec.start();
    } catch {
      setVoiceError("Mic shuru nahi ho paaya. Kripya type karein.");
      setListening(false);
    }
  };

  const stopVoice = () => {
    recRef.current?.stop();
    setListening(false);
  };

  const runTriage = async (symptomText = text) => {
    if (!symptomText.trim()) return;
    setAnalyzing(true);
    setVoiceError(null);
    try {
      const res = await emergxApi.triage(symptomText);
      setResult({
        urgency: res.urgency,
        specialty: res.specialty,
        dept: res.dept,
        source: res.source === "fastapi_backend" ? "FastAPI Backend + AI Engine" : "EmergX Triage Engine (Offline)",
      });
      setDeptOverride("");
      setSosSent(false);
      if (!geo.coords) geo.locate();
    } finally {
      setAnalyzing(false);
    }
  };

  const selectPresetSymptom = (preset: string) => {
    setText(preset);
    runTriage(preset);
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

  const topHospitals = ranked.slice(0, 3);
  const targetHospital = topHospitals[0]?.h ?? null;

  const triggerSos = async () => {
    const payload = {
      hospitalId: targetHospital?.id ?? null,
      hospitalName: targetHospital?.name ?? "Nearest Emergency Center",
      urgency: result?.urgency ?? "CRITICAL",
      specialty: result?.specialty ?? "Emergency Care",
      deptCode: activeDept,
      transcript: text.trim() || "Emergency medical assistance needed",
      lat: geo.coords?.lat ?? null,
      lng: geo.coords?.lng ?? null,
      contacts: contacts.map((c) => ({ name: c.name, phone: c.phone })),
    };

    // Save to local store
    addSos({
      hospitalId: payload.hospitalId,
      urgency: payload.urgency,
      specialty: payload.specialty,
      deptCode: payload.deptCode,
      transcript: payload.transcript,
      lat: payload.lat,
      lng: payload.lng,
    });

    // Call backend API if available
    await emergxApi.sendSos(payload);
    setSosSent(true);
  };

  // Pre-filled SOS message for 1-Click Native SMS / WhatsApp Fallback
  const liveLocationUrl = geo.coords
    ? `https://maps.google.com/?q=${geo.coords.lat.toFixed(5)},${geo.coords.lng.toFixed(5)}`
    : "Location pending";
  const sosSmsBody = `EMERGENCY SOS: Medical distress alert! Condition: ${
    result?.specialty ?? "Medical Emergency"
  } (${result?.urgency ?? "CRITICAL"}). Live GPS: ${liveLocationUrl}. Heading to: ${
    targetHospital?.name ?? "Nearest Hospital"
  }. - via EmergX`;
  const contactPhones = contacts.map((c) => c.phone.replace(/[^0-9+]/g, "")).filter(Boolean);

  const badgeInfo = result ? urgencyBadge(result.urgency) : null;
  const firstAid = FIRST_AID_GUIDES[activeDept] || FIRST_AID_GUIDES.GENERAL;

  return (
    <Shell
      title="Emergency Triage & Navigation"
      subtitle="Bolein ya likhein — jaise “chest pain ho raha hai aur saans nahi aa rahi”."
      action={
        <button
          onClick={() => setContactsModalOpen(true)}
          className="flex items-center gap-1.5 rounded-lg border border-border bg-secondary/60 px-2.5 py-1 text-xs font-semibold text-foreground hover:border-primary/50"
        >
          <span>Family SOS</span>
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
            {contacts.length}
          </span>
        </button>
      }
    >
      {/* Feature Switcher: Hospital Triage vs Blood Bank Finder */}
      <div className="flex rounded-xl border border-border/80 bg-secondary/40 p-1">
        <button
          onClick={() => setActiveTab("hospital")}
          className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all ${
            activeTab === "hospital"
              ? "bg-card text-foreground shadow-xs border border-border/80"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          🏥 Emergency ICU & Hospital Navigation
        </button>
        <button
          onClick={() => setActiveTab("blood")}
          className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all ${
            activeTab === "blood"
              ? "bg-card text-foreground shadow-xs border border-border/80"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          🩸 Blood Bank & Depository Finder
        </button>
      </div>

      {activeTab === "blood" ? (
        /* ==================== BLOOD BANK FINDER TAB ==================== */
        <div className="space-y-4">
          <Card>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-display text-base font-bold text-foreground">
                  Verified Blood Banks & Depositories (Indore & Ujjain)
                </p>
                <p className="text-xs text-muted-foreground">
                  Trauma, surgery aur maternity ke liye verified blood units aur emergency contact numbers.
                </p>
              </div>
              <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-800 dark:text-emerald-300 border border-emerald-500/30">
                Live PostGIS
              </span>
            </div>

            <div className="mt-4">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Filter by Blood Group:
              </label>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {BLOOD_GROUPS.map((bg) => (
                  <button
                    key={bg}
                    onClick={() => setSelectedBloodGroup(bg)}
                    className={`rounded-lg px-3 py-1 text-xs font-bold transition-all ${
                      selectedBloodGroup === bg
                        ? "bg-primary text-white shadow-xs"
                        : "border border-border/80 bg-secondary/40 text-foreground hover:border-primary/50"
                    }`}
                  >
                    {bg}
                  </button>
                ))}
              </div>
            </div>
          </Card>

          {loadingBlood ? (
            <Card>
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <span className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span>Nearby blood banks search ho rahe hain…</span>
              </div>
            </Card>
          ) : bloodBanks.length === 0 ? (
            <Card>
              <p className="text-sm text-muted-foreground text-center py-4">
                Is blood group ke liye verified depository range me nahi mili. Dial 108 for emergency blood dispatch.
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {bloodBanks.map((bank) => (
                <Card key={bank.id} className="border-border/80 hover:border-primary/50 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-display text-base font-bold text-foreground">{bank.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {bank.address} • <strong className="text-primary">{bank.distance_km} KM away</strong>
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:text-emerald-300 border border-emerald-500/30">
                      Verified Active
                    </span>
                  </div>

                  <div className="mt-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Available Blood Groups:
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {bank.available_blood_groups.map((group) => (
                        <span
                          key={group}
                          className={`rounded px-1.5 py-0.5 text-[10px] font-extrabold ${
                            selectedBloodGroup === group
                              ? "bg-primary text-white"
                              : "bg-secondary text-foreground border border-border"
                          }`}
                        >
                          {group}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${bank.latitude},${bank.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 rounded-xl bg-primary py-2 text-center text-xs font-bold text-white shadow-xs hover:bg-primary/90"
                    >
                      Navigate to Blood Bank →
                    </a>
                    <a
                      href={`tel:${bank.phone || "108"}`}
                      className="flex-1 rounded-xl border border-input bg-secondary/40 py-2 text-center text-xs font-bold text-foreground hover:bg-secondary"
                    >
                      Call Blood Desk: {bank.phone || "108"}
                    </a>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* ==================== HOSPITAL TRIAGE & NAVIGATION TAB ==================== */
        <>
          {/* 1. Location & City Presets Card */}
          <Card>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  GPS Geolocation
                </p>
                <p className="mt-0.5 text-sm font-semibold text-foreground">
                  {geo.coords
                    ? `📍 ${geo.coords.lat.toFixed(4)}, ${geo.coords.lng.toFixed(4)}${
                        geo.accuracy ? ` (±${Math.round(geo.accuracy)}m)` : ""
                      }`
                    : geo.status === "locating"
                      ? "Locating your GPS coordinates…"
                      : "GPS location unavailable"}
                </p>
                {geo.message && <p className="mt-0.5 text-xs text-muted-foreground">{geo.message}</p>}
              </div>
              <button
                onClick={geo.locate}
                className="shrink-0 rounded-lg border border-input bg-secondary/50 px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary"
              >
                {geo.coords ? "Refresh GPS" : "Allow GPS"}
              </button>
            </div>

            {/* Indore & Ujjain Demo Location Presets */}
            <div className="mt-3 border-t border-border/50 pt-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Quick Presets for Live Testing (Indore & Ujjain):
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {LOCATION_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => geo.setManual(preset.lat, preset.lng)}
                    className="rounded-lg border border-border/80 bg-secondary/40 px-2.5 py-1 text-xs font-medium text-foreground/90 transition-colors hover:border-primary hover:bg-primary/10"
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Manual Fallback Input */}
            {!geo.coords && geo.status !== "locating" && (
              <div className="mt-3 flex gap-2">
                <input
                  value={manual.lat}
                  onChange={(e) => setManual({ ...manual, lat: e.target.value })}
                  placeholder="Latitude (e.g. 22.7533)"
                  className="w-full rounded-xl border border-input bg-background p-2 text-xs"
                />
                <input
                  value={manual.lng}
                  onChange={(e) => setManual({ ...manual, lng: e.target.value })}
                  placeholder="Longitude (e.g. 75.8937)"
                  className="w-full rounded-xl border border-input bg-background p-2 text-xs"
                />
                <button
                  onClick={() => {
                    const lat = Number(manual.lat);
                    const lng = Number(manual.lng);
                    if (!Number.isNaN(lat) && !Number.isNaN(lng) && (lat || lng))
                      geo.setManual(lat, lng);
                  }}
                  className="shrink-0 rounded-xl bg-primary px-3 text-xs font-semibold text-white"
                >
                  Set
                </button>
              </div>
            )}
          </Card>

          {/* 2. Big Red Mic Button & Voice / Text Input */}
          <Card>
            <div className="flex flex-col items-center gap-3 py-2">
              <div className="relative">
                {listening && (
                  <span className="absolute -inset-3 rounded-full bg-red-600/30 animate-ping pointer-events-none" />
                )}
                <button
                  onClick={listening ? stopVoice : startVoice}
                  className={`relative flex h-28 w-28 items-center justify-center rounded-full text-white shadow-2xl transition-all duration-200 active:scale-95 ${
                    listening
                      ? "bg-red-600 ring-8 ring-red-500/50 shadow-red-600/60"
                      : "bg-red-600 hover:bg-red-500 ring-4 ring-red-500/20 shadow-red-600/40 hover:scale-105"
                  }`}
                  aria-label={listening ? "Stop recording voice" : "Tap to start Hinglish voice input"}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`h-11 w-11 ${listening ? "animate-pulse" : ""}`}
                  >
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="22" />
                  </svg>
                </button>
              </div>

              <div className="text-center">
                <p className="font-display text-base font-bold text-foreground">
                  {listening ? "Sun raha hoon… Boliye" : "Tap to Speak (Hinglish/Hindi)"}
                </p>
                <p className="text-xs text-muted-foreground">
                  5-second instant AI symptom parsing & ICU bed search
                </p>
              </div>
            </div>

            <div className="mt-3">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={2}
                placeholder="Problem bol kar ya type karke bataiye (jaise: seene me dard, saans phool rahi hai)..."
                className="w-full rounded-xl border border-input bg-background/80 p-3 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>

            {voiceError && (
              <p className="mt-1.5 rounded-lg bg-destructive/15 p-2 text-xs font-semibold text-destructive">
                {voiceError}
              </p>
            )}

            {/* Quick Symptom Chips */}
            <div className="mt-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Or Tap a Common Emergency Symptom:
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {SYMPTOM_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    onClick={() => selectPresetSymptom(preset)}
                    className="rounded-lg border border-border bg-secondary/40 px-2.5 py-1 text-left text-xs font-medium text-foreground transition-colors hover:border-primary/80 hover:bg-primary/10"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => runTriage()}
              disabled={!text.trim() || analyzing}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 font-display text-base font-bold text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 disabled:opacity-50"
            >
              {analyzing ? (
                <>
                  <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Analyzing Symptoms via AI Engine…</span>
                </>
              ) : (
                <span>Check Urgency & Find ICU Beds</span>
              )}
            </button>
          </Card>

          {/* 3. Output 1 & 2: Urgency Badge & Suggested Care */}
          {result && (
            <>
              <Card className="border-border">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      AI Triage Assessment (Output 2)
                    </p>
                    <div className="mt-1.5 flex items-center gap-2.5">
                      <span
                        className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-1.5 font-display text-xl font-extrabold ${badgeInfo?.className}`}
                      >
                        <span>{badgeInfo?.icon}</span>
                        <span>{badgeInfo?.label}</span>
                      </span>
                    </div>
                  </div>
                  <span className="rounded-md bg-secondary px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                    {result.source}
                  </span>
                </div>

                <div className="mt-3.5 grid gap-2 sm:grid-cols-2">
                  <div className="rounded-xl border border-border/70 bg-secondary/30 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Required Care Unit
                    </p>
                    <p className="font-display text-base font-bold text-foreground">
                      {result.specialty}
                    </p>
                  </div>

                  <div className="rounded-xl border border-border/70 bg-secondary/30 p-3">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Target Department (Adjustable)
                    </label>
                    <select
                      value={activeDept}
                      onChange={(e) => setDeptOverride(e.target.value as DeptCode)}
                      className="mt-1 w-full rounded-lg border border-input bg-card p-1.5 text-xs font-semibold text-foreground"
                    >
                      {DEPT_CATALOG.map((d) => (
                        <option key={d.code} value={d.code}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </Card>

              {/* NEW FEATURE: Immediate Golden Hour First-Aid Action Guide */}
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-950/20 p-4 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-600 text-xs font-bold text-white">
                      ⛑️
                    </span>
                    <h3 className="font-display text-sm font-bold text-emerald-900 dark:text-emerald-200">
                      {firstAid.title}
                    </h3>
                  </div>
                  <span className="rounded bg-emerald-600/10 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800 dark:text-emerald-300">
                    Golden Hour Protocol
                  </span>
                </div>

                <p className="mt-1.5 text-xs font-bold text-destructive">
                  ⚠️ {firstAid.alert}
                </p>

                <div className="mt-2.5 space-y-1.5">
                  {firstAid.steps.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-foreground/90">
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-600/20 text-[10px] font-extrabold text-emerald-800 dark:text-emerald-300">
                        {idx + 1}
                      </span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 4. Output 3 & 4: Top 3 Nearest Hospital Cards */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-display text-base font-bold tracking-tight text-foreground">
                    Top 3 Nearest Verified Hospitals (Output 3)
                  </p>
                  <span className="text-xs text-muted-foreground">
                    Sorted by bed readiness & distance
                  </span>
                </div>

                {topHospitals.length === 0 && (
                  <Card>
                    <p className="text-sm text-muted-foreground">
                      No verified hospitals found in range.
                    </p>
                  </Card>
                )}

                {topHospitals.map(({ h, km, dept }, idx) => (
                  <HospitalCard
                    key={h.id}
                    rank={idx + 1}
                    hospital={h}
                    km={km}
                    dept={dept}
                    wanted={activeDept}
                    origin={geo.coords}
                  />
                ))}
              </div>

              {/* 5. Output 5: 1-Click Family SOS Alert Trigger */}
              <div className="rounded-2xl border border-destructive/60 bg-card p-5 shadow-lg shadow-destructive/10">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-3 w-3 rounded-full bg-destructive animate-ping" />
                    <h3 className="font-display text-lg font-extrabold text-foreground">
                      1-Click Family & Hospital SOS Alert (Output 5)
                    </h3>
                  </div>
                  <button
                    onClick={() => setContactsModalOpen(true)}
                    className="text-xs font-semibold text-primary underline hover:text-primary/80"
                  >
                    {contacts.length} Contacts Saved
                  </button>
                </div>

                <p className="mt-1.5 text-xs text-muted-foreground">
                  Tapping SOS transmits your live GPS coordinates, symptom severity, and targeted ICU facility to the hospital desk and dispatches emergency SMS to family.
                </p>

                <button
                  onClick={triggerSos}
                  className={`mt-4 w-full rounded-xl py-4 font-display text-lg font-extrabold text-white shadow-xl transition-all duration-200 active:scale-95 ${
                    sosSent
                      ? "bg-emerald-600 shadow-emerald-900/40"
                      : "bg-destructive hover:bg-destructive/90 shadow-destructive/40"
                  }`}
                >
                  {sosSent ? "✓ SOS ALERT DISPATCHED & NOTIFIED" : "🚨 SEND 1-CLICK SOS ALERT NOW"}
                </button>

                {sosSent && (
                  <div className="mt-4 rounded-xl border border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/40 p-4">
                    <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                      ✓ Alert broadcasted to {targetHospital?.name ?? "Hospital Desk"}.
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Live GPS coords ({geo.coords ? `${geo.coords.lat.toFixed(4)}, ${geo.coords.lng.toFixed(4)}` : "Indore"}) and triage profile attached.
                    </p>

                    {/* 1-Click Native SMS / WhatsApp Fallback Buttons */}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <a
                        href={`sms:${contactPhones.join(",")}?body=${encodeURIComponent(sosSmsBody)}`}
                        className="flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-center text-xs font-bold text-white hover:bg-emerald-500 shadow-xs"
                      >
                        Open Pre-filled SMS (1-Click)
                      </a>
                      <a
                        href={`https://wa.me/?text=${encodeURIComponent(sosSmsBody)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 rounded-lg border border-emerald-500/60 bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-200 px-3 py-2 text-center text-xs font-bold hover:bg-emerald-200 dark:hover:bg-emerald-900/50"
                      >
                        Share on WhatsApp
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Emergency Contacts Management Modal */}
          {contactsModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
              <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-2xl">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-lg font-bold text-foreground">
                    Emergency Family Contacts
                  </h3>
                  <button
                    onClick={() => setContactsModalOpen(false)}
                    className="rounded-lg p-1 text-muted-foreground hover:text-foreground"
                  >
                    ✕
                  </button>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  These phone numbers will receive 1-Click SOS emergency SMS with your live GPS location.
                </p>

                <div className="mt-4 space-y-2 max-h-48 overflow-y-auto">
                  {contacts.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between rounded-xl border border-border bg-secondary/30 p-2.5"
                    >
                      <div>
                        <p className="text-sm font-semibold text-foreground">{c.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {c.phone} · {c.relation}
                        </p>
                      </div>
                      <button
                        onClick={() => removeContact(c.id)}
                        className="text-xs font-bold text-destructive hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>

                <div className="mt-4 space-y-2 border-t border-border pt-3">
                  <p className="text-xs font-bold text-foreground">Add New Emergency Kin Contact</p>
                  <input
                    value={newContact.name}
                    onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                    placeholder="Full Name (e.g. Papa / Brother)"
                    className="w-full rounded-lg border border-input bg-background p-2 text-xs"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      value={newContact.phone}
                      onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                      placeholder="Mobile (e.g. 9826012345)"
                      className="w-full rounded-lg border border-input bg-background p-2 text-xs"
                    />
                    <input
                      value={newContact.relation}
                      onChange={(e) => setNewContact({ ...newContact, relation: e.target.value })}
                      placeholder="Relation (e.g. Father)"
                      className="w-full rounded-lg border border-input bg-background p-2 text-xs"
                    />
                  </div>
                  <button
                    onClick={() => {
                      if (newContact.name && newContact.phone) {
                        addContact({
                          name: newContact.name.trim(),
                          phone: newContact.phone.trim(),
                          relation: newContact.relation.trim() || "Family",
                        });
                        setNewContact({ name: "", phone: "", relation: "" });
                      }
                    }}
                    disabled={!newContact.name || !newContact.phone}
                    className="w-full rounded-lg bg-primary py-2 text-xs font-bold text-white disabled:opacity-40"
                  >
                    Save Contact
                  </button>
                </div>

                <button
                  onClick={() => setContactsModalOpen(false)}
                  className="mt-3 w-full rounded-xl border border-input py-2 text-xs font-semibold text-foreground hover:bg-secondary"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </Shell>
  );
}

function HospitalCard({
  rank,
  hospital: h,
  km,
  dept,
  wanted,
  origin,
}: {
  rank: number;
  hospital: Hospital;
  km: number | null;
  dept: ReturnType<typeof matchDepartment>;
  wanted: DeptCode;
  origin: { lat: number; lng: number } | null;
}) {
  const exact = dept?.code === wanted;
  const bedsCount = dept?.beds ?? h.beds;
  const etaMins = km !== null ? Math.max(2, Math.round((km / 30) * 60)) : null;

  return (
    <Card className="border-border/80 hover:border-primary/50 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/20 font-display text-xs font-black text-primary border border-primary/30">
            #{rank}
          </span>
          <div>
            <p className="font-display text-lg font-bold text-foreground">{h.name}</p>
            <p className="text-xs text-muted-foreground">
              {h.area}
              {km !== null && (
                <span className="font-bold text-primary">
                  {" "}
                  • {km.toFixed(1)} KM (~{etaMins} mins driving)
                </span>
              )}
            </p>
          </div>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${
            h.status === "FULL"
              ? "bg-destructive/15 text-destructive border border-destructive/30"
              : "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30"
          }`}
        >
          {h.status}
        </span>
      </div>

      {dept && (
        <div className="mt-3 rounded-xl border border-border/80 bg-secondary/30 p-3">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {exact ? "Target Unit Match" : "Nearest Backup Unit"}
            </p>
            {dept.ready24x7 && (
              <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:text-emerald-300 border border-emerald-500/30">
                24x7 Ready
              </span>
            )}
          </div>
          <div className="mt-1 flex items-center justify-between">
            <p className="font-display text-base font-bold text-foreground">{dept.name}</p>
            <span className="rounded-lg bg-primary/10 px-2.5 py-1 font-display text-sm font-extrabold text-primary border border-primary/25">
              {bedsCount} ICU Beds Free
            </span>
          </div>
          {dept.floor && (
            <p className="mt-1 text-[11px] text-muted-foreground">Gate / Floor: {dept.floor}</p>
          )}
        </div>
      )}

      {/* Emergency Resources */}
      <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
        {RESOURCE_FIELDS.map((f) => (
          <span
            key={f.key}
            className="rounded-lg border border-border/60 bg-secondary/20 px-2 py-0.5 text-muted-foreground"
          >
            {f.label}: <strong className="text-foreground">{h.resources[f.key]}</strong>
          </span>
        ))}
      </div>

      {/* Output 4: 1-Click Navigation & Direct Call Links */}
      <div className="mt-4 flex gap-2">
        <a
          href={mapsLink(h, dept, origin)}
          target="_blank"
          rel="noreferrer"
          className="flex-1 rounded-xl bg-primary py-2.5 text-center font-display text-sm font-bold text-white shadow-md shadow-primary/20 hover:bg-primary/90"
        >
          Start Navigation →
        </a>
        <a
          href={`tel:${dept?.helpline || h.phone}`}
          className="flex-1 rounded-xl border border-input bg-secondary/40 py-2.5 text-center font-display text-sm font-bold text-foreground hover:bg-secondary"
        >
          {dept?.helpline ? "Call Unit Desk" : "Call Hospital"}
        </a>
      </div>
    </Card>
  );
}
