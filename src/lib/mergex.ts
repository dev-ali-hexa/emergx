import { useCallback, useEffect, useState } from "react";

export type Urgency = "CRITICAL" | "HIGH" | "MODERATE";

export type DeptCode =
  | "CARDIAC"
  | "TRAUMA"
  | "STROKE"
  | "ICU"
  | "PEDIATRIC"
  | "MATERNITY"
  | "BURN"
  | "GENERAL";

export const DEPT_CATALOG: { code: DeptCode; name: string }[] = [
  { code: "CARDIAC", name: "Cardiology & Cath Lab" },
  { code: "TRAUMA", name: "Trauma & Orthopedics" },
  { code: "STROKE", name: "Stroke & Neurology" },
  { code: "ICU", name: "Critical Care ICU" },
  { code: "PEDIATRIC", name: "Pediatric Emergency" },
  { code: "MATERNITY", name: "Maternity & Labour Room" },
  { code: "BURN", name: "Burn Unit" },
  { code: "GENERAL", name: "General Emergency" },
];

export function deptName(code: DeptCode) {
  return DEPT_CATALOG.find((d) => d.code === code)?.name ?? code;
}

export type Department = {
  code: DeptCode;
  name: string;
  beds: number;
  totalBeds: number;
  ready24x7: boolean;
  helpline: string;
  floor: string;
};

export type Resources = {
  oxygen: number;
  ventilators: number;
  otFree: number;
  ambulances: number;
  bloodUnits: number;
};

export const RESOURCE_FIELDS: { key: keyof Resources; label: string }[] = [
  { key: "oxygen", label: "O2 cylinders" },
  { key: "ventilators", label: "Ventilators free" },
  { key: "otFree", label: "OT (operation theatre) free" },
  { key: "ambulances", label: "Ambulances ready" },
  { key: "bloodUnits", label: "Blood units" },
];

export const EMPTY_RESOURCES: Resources = {
  oxygen: 0,
  ventilators: 0,
  otFree: 0,
  ambulances: 0,
  bloodUnits: 0,
};

export type Hospital = {
  id: string;
  name: string;
  area: string;
  phone: string;
  lat: number;
  lng: number;
  beds: number;
  status: "AVAILABLE" | "FULL";
  specialties: string[];
  password: string;
  departments: Department[];
  resources: Resources;
};

export type SosLog = {
  id: string;
  hospitalId: string | null;
  urgency: Urgency;
  specialty: string;
  deptCode: DeptCode;
  transcript: string;
  lat: number | null;
  lng: number | null;
  createdAt: string;
};

type Store = { hospitals: Hospital[]; sos: SosLog[] };

const KEY = "mergex-store-v1";
const EMPTY: Store = { hospitals: [], sos: [] };

export function defaultDepartments(icuBeds = 0): Department[] {
  return [
    {
      code: "GENERAL",
      name: deptName("GENERAL"),
      beds: Math.max(0, icuBeds),
      totalBeds: Math.max(icuBeds, 6),
      ready24x7: true,
      helpline: "",
      floor: "Ground floor",
    },
  ];
}

function normalizeHospital(h: any): Hospital {
  const departments: Department[] = Array.isArray(h.departments) && h.departments.length
    ? h.departments.map((d: any) => ({
        code: (d.code ?? "GENERAL") as DeptCode,
        name: d.name ?? deptName((d.code ?? "GENERAL") as DeptCode),
        beds: Number(d.beds) || 0,
        totalBeds: Number(d.totalBeds) || Number(d.beds) || 0,
        ready24x7: Boolean(d.ready24x7),
        helpline: d.helpline ?? "",
        floor: d.floor ?? "",
      }))
    : defaultDepartments(Number(h.beds) || 0);

  return {
    id: h.id,
    name: h.name ?? "—",
    area: h.area ?? "—",
    phone: h.phone ?? "108",
    lat: Number(h.lat) || 0,
    lng: Number(h.lng) || 0,
    beds: Number(h.beds) || 0,
    status: h.status === "FULL" ? "FULL" : "AVAILABLE",
    specialties: Array.isArray(h.specialties) ? h.specialties : [],
    password: h.password ?? "",
    departments,
    resources: { ...EMPTY_RESOURCES, ...(h.resources ?? {}) },
  };
}

function read(): Store {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as any;
    return {
      hospitals: (parsed.hospitals ?? []).map(normalizeHospital),
      sos: (parsed.sos ?? []).map((s: any) => ({
        ...s,
        deptCode: (s.deptCode ?? "GENERAL") as DeptCode,
      })),
    };
  } catch {
    return EMPTY;
  }
}

const listeners = new Set<(s: Store) => void>();

function write(next: Store) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  }
  listeners.forEach((l) => l(next));
}

export function useStore() {
  const [store, setStore] = useState<Store>(EMPTY);

  useEffect(() => {
    setStore(read());
    const listener = (s: Store) => setStore(s);
    listeners.add(listener);
    const onStorage = () => setStore(read());
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const update = useCallback((fn: (s: Store) => Store) => {
    write(fn(read()));
  }, []);

  const addHospital = useCallback(
    (h: Omit<Hospital, "id">) =>
      update((s) => ({
        ...s,
        hospitals: [...s.hospitals, { ...h, id: crypto.randomUUID() }],
      })),
    [update],
  );

  const patchHospital = useCallback(
    (id: string, patch: Partial<Hospital>) =>
      update((s) => ({
        ...s,
        hospitals: s.hospitals.map((h) => (h.id === id ? { ...h, ...patch } : h)),
      })),
    [update],
  );

  const patchResources = useCallback(
    (id: string, patch: Partial<Resources>) =>
      update((s) => ({
        ...s,
        hospitals: s.hospitals.map((h) =>
          h.id === id ? { ...h, resources: { ...h.resources, ...patch } } : h,
        ),
      })),
    [update],
  );

  const patchDepartment = useCallback(
    (id: string, code: DeptCode, patch: Partial<Department>) =>
      update((s) => ({
        ...s,
        hospitals: s.hospitals.map((h) =>
          h.id === id
            ? {
                ...h,
                departments: h.departments.map((d) =>
                  d.code === code ? { ...d, ...patch } : d,
                ),
              }
            : h,
        ),
      })),
    [update],
  );

  const addDepartment = useCallback(
    (id: string, code: DeptCode) =>
      update((s) => ({
        ...s,
        hospitals: s.hospitals.map((h) =>
          h.id === id && !h.departments.some((d) => d.code === code)
            ? {
                ...h,
                departments: [
                  ...h.departments,
                  {
                    code,
                    name: deptName(code),
                    beds: 0,
                    totalBeds: 0,
                    ready24x7: true,
                    helpline: "",
                    floor: "",
                  },
                ],
              }
            : h,
        ),
      })),
    [update],
  );

  const removeDepartment = useCallback(
    (id: string, code: DeptCode) =>
      update((s) => ({
        ...s,
        hospitals: s.hospitals.map((h) =>
          h.id === id
            ? { ...h, departments: h.departments.filter((d) => d.code !== code) }
            : h,
        ),
      })),
    [update],
  );

  const removeHospital = useCallback(
    (id: string) =>
      update((s) => ({ ...s, hospitals: s.hospitals.filter((h) => h.id !== id) })),
    [update],
  );

  const addSos = useCallback(
    (log: Omit<SosLog, "id" | "createdAt">) =>
      update((s) => ({
        ...s,
        sos: [
          { ...log, id: crypto.randomUUID(), createdAt: new Date().toISOString() },
          ...s.sos,
        ].slice(0, 100),
      })),
    [update],
  );

  return {
    ...store,
    addHospital,
    patchHospital,
    patchResources,
    patchDepartment,
    addDepartment,
    removeDepartment,
    removeHospital,
    addSos,
  };
}

/* ---------- Hinglish triage (rule based, non-diagnostic) ---------- */

type Rule = { words: string[]; urgency: Urgency; specialty: string; dept: DeptCode };

const RULES: Rule[] = [
  {
    words: ["chest pain", "seene", "seena", "chaati", "heart", "dil", "attack"],
    urgency: "CRITICAL",
    specialty: "Cardiology / Emergency",
    dept: "CARDIAC",
  },
  {
    words: ["saans nahi", "saans", "breath", "dum ghut", "asthma", "oxygen", "ventilator"],
    urgency: "CRITICAL",
    specialty: "Pulmonary / Critical Care",
    dept: "ICU",
  },
  {
    words: ["behosh", "unconscious", "faint", "coma", "jhatke", "seizure", "mirgi", "stroke", "lakwa", "paralysis"],
    urgency: "CRITICAL",
    specialty: "Neurology / Stroke",
    dept: "STROKE",
  },
  {
    words: ["khoon", "blood", "bleeding", "accident", "takkar", "haddi", "fracture", "tuut"],
    urgency: "CRITICAL",
    specialty: "Trauma / Orthopedics",
    dept: "TRAUMA",
  },
  {
    words: ["jal gaya", "burn", "jal", "aag", "scald"],
    urgency: "CRITICAL",
    specialty: "Burn Care",
    dept: "BURN",
  },
  {
    words: ["pregnan", "delivery", "prasav", "labour", "labor pain"],
    urgency: "HIGH",
    specialty: "Obstetrics",
    dept: "MATERNITY",
  },
  {
    words: ["bacha", "baby", "bacche", "child", "newborn"],
    urgency: "HIGH",
    specialty: "Pediatrics",
    dept: "PEDIATRIC",
  },
  {
    words: ["pet dard", "stomach", "ulti", "vomit", "dast", "diarrhea", "dehydration", "pani ki kami"],
    urgency: "HIGH",
    specialty: "General Medicine",
    dept: "GENERAL",
  },
  {
    words: ["bukhar", "fever", "sardi", "khansi", "cough", "sar dard", "headache", "kamzori", "weakness", "dard"],
    urgency: "MODERATE",
    specialty: "General Medicine",
    dept: "GENERAL",
  },
];

export function triage(text: string): {
  urgency: Urgency;
  specialty: string;
  dept: DeptCode;
  matched: string[];
} {
  const t = text.toLowerCase();
  const matched: string[] = [];
  let best: Rule | null = null;

  for (const rule of RULES) {
    const hits = rule.words.filter((w) => t.includes(w));
    if (hits.length) {
      matched.push(...hits);
      if (!best || rank(rule.urgency) > rank(best.urgency)) best = rule;
    }
  }

  if (!best)
    return { urgency: "MODERATE", specialty: "General Medicine", dept: "GENERAL", matched: [] };
  return { urgency: best.urgency, specialty: best.specialty, dept: best.dept, matched };
}

function rank(u: Urgency) {
  return u === "CRITICAL" ? 3 : u === "HIGH" ? 2 : 1;
}

/** Best matching department in a hospital for a triage dept code. */
export function matchDepartment(h: Hospital, code: DeptCode): Department | null {
  return (
    h.departments.find((d) => d.code === code) ??
    h.departments.find((d) => d.code === "ICU") ??
    h.departments.find((d) => d.code === "GENERAL") ??
    h.departments[0] ??
    null
  );
}

export function urgencyLabel(u: Urgency) {
  return u;
}

export function urgencyClass(u: Urgency) {
  return u === "CRITICAL"
    ? "bg-destructive/10 text-destructive"
    : u === "HIGH"
      ? "bg-accent text-accent-foreground"
      : "bg-secondary text-secondary-foreground";
}

export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Turn-by-turn Google Maps link to the hospital (department shown in UI). */
export function mapsLink(
  h: Hospital,
  dept?: Department | null,
  from?: { lat: number; lng: number } | null,
) {
  const params = new URLSearchParams({
    api: "1",
    travelmode: "driving",
    dir_action: "navigate",
  });
  if (h.lat || h.lng) {
    params.set("destination", `${h.lat},${h.lng}`);
  } else {
    params.set("destination", `${h.name} ${h.area}`);
  }
  if (from) params.set("origin", `${from.lat},${from.lng}`);
  if (dept) params.set("destination_name", `${h.name} — ${dept.name}`);
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export const ADMIN_USER = "admin";
export const ADMIN_PASS = "admin123";

/* ---------- Geolocation hook ---------- */

export type GeoState = {
  coords: { lat: number; lng: number } | null;
  accuracy: number | null;
  status: "idle" | "locating" | "ready" | "denied" | "unsupported";
  message: string | null;
};

export function useGeolocation(auto = true) {
  const [geo, setGeo] = useState<GeoState>({
    coords: null,
    accuracy: null,
    status: "idle",
    message: null,
  });

  const locate = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeo({
        coords: null,
        accuracy: null,
        status: "unsupported",
        message: "Is browser me location support nahi hai. Neeche manually location daal do.",
      });
      return;
    }
    setGeo((g) => ({ ...g, status: "locating", message: "Aapki location le rahe hain…" }));
    navigator.geolocation.getCurrentPosition(
      (p) =>
        setGeo({
          coords: { lat: p.coords.latitude, lng: p.coords.longitude },
          accuracy: p.coords.accuracy,
          status: "ready",
          message: null,
        }),
      (err) =>
        setGeo({
          coords: null,
          accuracy: null,
          status: "denied",
          message:
            err.code === err.PERMISSION_DENIED
              ? "Location permission block hai — browser settings me allow karo ya manually daalo."
              : "Location nahi mil paayi. Dobara try karo ya manually daalo.",
        }),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
    );
  }, []);

  const setManual = useCallback((lat: number, lng: number) => {
    setGeo({
      coords: { lat, lng },
      accuracy: null,
      status: "ready",
      message: "Manual location use ho rahi hai.",
    });
  }, []);

  useEffect(() => {
    if (auto) locate();
  }, [auto, locate]);

  return { ...geo, locate, setManual };
}
