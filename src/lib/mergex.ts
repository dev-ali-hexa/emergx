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

export type EmergencyContact = {
  id: string;
  name: string;
  phone: string;
  relation: string;
};

export const DEFAULT_CONTACTS: EmergencyContact[] = [
  { id: "c1", name: "Primary Family (Father)", phone: "9826012345", relation: "Father" },
  { id: "c2", name: "Emergency Dispatch / Kin", phone: "9893098765", relation: "Sibling" },
];

export const SEED_HOSPITALS: Hospital[] = [
  {
    id: "hosp-indore-1",
    name: "Bombay Hospital Indore",
    area: "Ring Road, IDA Scheme 94, Indore",
    phone: "+91 731 4771111",
    lat: 22.7533,
    lng: 75.8937,
    beds: 18,
    status: "AVAILABLE",
    specialties: ["Cardiology", "Critical Care", "Neurology Stroke", "Trauma & Ortho"],
    password: "staff",
    departments: [
      { code: "CARDIAC", name: "Cardiology & Cath Lab", beds: 6, totalBeds: 10, ready24x7: true, helpline: "+91 731 4771120", floor: "Ground Floor, Wing A" },
      { code: "ICU", name: "Critical Care ICU", beds: 5, totalBeds: 12, ready24x7: true, helpline: "+91 731 4771130", floor: "1st Floor, ICU Block" },
      { code: "STROKE", name: "Stroke & Neurology", beds: 4, totalBeds: 8, ready24x7: true, helpline: "+91 731 4771140", floor: "2nd Floor" },
      { code: "TRAUMA", name: "Trauma & Orthopedics", beds: 3, totalBeds: 6, ready24x7: true, helpline: "+91 731 4771150", floor: "Ground Floor, Casualty" },
      { code: "GENERAL", name: "General Emergency", beds: 8, totalBeds: 15, ready24x7: true, helpline: "+91 731 4771111", floor: "Emergency Ward" },
    ],
    resources: { oxygen: 48, ventilators: 12, otFree: 3, ambulances: 4, bloodUnits: 65 },
  },
  {
    id: "hosp-indore-2",
    name: "Medanta Super Specialty Hospital",
    area: "AB Road, Near Plot 8, PU4, Indore",
    phone: "+91 731 7111234",
    lat: 22.7538,
    lng: 75.8973,
    beds: 14,
    status: "AVAILABLE",
    specialties: ["Cardiology", "Critical Care", "Pulmonary", "Trauma"],
    password: "staff",
    departments: [
      { code: "CARDIAC", name: "Cardiology & Cath Lab", beds: 5, totalBeds: 8, ready24x7: true, helpline: "+91 731 7111240", floor: "Block B, Ground" },
      { code: "ICU", name: "Critical Care ICU", beds: 6, totalBeds: 10, ready24x7: true, helpline: "+91 731 7111250", floor: "Level 1" },
      { code: "TRAUMA", name: "Trauma & Orthopedics", beds: 3, totalBeds: 6, ready24x7: true, helpline: "+91 731 7111260", floor: "Casualty Gate 1" },
      { code: "GENERAL", name: "General Emergency", beds: 6, totalBeds: 12, ready24x7: true, helpline: "+91 731 7111234", floor: "Ground Floor" },
    ],
    resources: { oxygen: 55, ventilators: 10, otFree: 2, ambulances: 5, bloodUnits: 50 },
  },
  {
    id: "hosp-indore-3",
    name: "Care CHL Hospital",
    area: "AB Road, Near LIG Square, Indore",
    phone: "+91 731 4774444",
    lat: 22.7369,
    lng: 75.8876,
    beds: 12,
    status: "AVAILABLE",
    specialties: ["Cardiology", "Pediatric Emergency", "ICU", "Trauma"],
    password: "staff",
    departments: [
      { code: "CARDIAC", name: "Cardiology & Cath Lab", beds: 4, totalBeds: 6, ready24x7: true, helpline: "+91 731 4774450", floor: "Cath Lab Wing" },
      { code: "ICU", name: "Critical Care ICU", beds: 4, totalBeds: 8, ready24x7: true, helpline: "+91 731 4774460", floor: "ICU Complex" },
      { code: "PEDIATRIC", name: "Pediatric Emergency", beds: 4, totalBeds: 6, ready24x7: true, helpline: "+91 731 4774470", floor: "Child Care Unit" },
      { code: "GENERAL", name: "General Emergency", beds: 5, totalBeds: 10, ready24x7: true, helpline: "+91 731 4774444", floor: "Ground Floor" },
    ],
    resources: { oxygen: 38, ventilators: 8, otFree: 2, ambulances: 3, bloodUnits: 42 },
  },
  {
    id: "hosp-indore-4",
    name: "MY Hospital (Maharaja Yeshwantrao)",
    area: "Sanyogitaganj, Indore",
    phone: "108",
    lat: 22.7164,
    lng: 75.8706,
    beds: 24,
    status: "AVAILABLE",
    specialties: ["Trauma & Orthopedics", "Burn Unit", "Maternity", "Critical Care"],
    password: "staff",
    departments: [
      { code: "TRAUMA", name: "Trauma & Orthopedics", beds: 8, totalBeds: 14, ready24x7: true, helpline: "108", floor: "Trauma Centre Gate 1" },
      { code: "BURN", name: "Burn Unit", beds: 5, totalBeds: 8, ready24x7: true, helpline: "108", floor: "Burn Ward 3rd Floor" },
      { code: "MATERNITY", name: "Maternity & Labour Room", beds: 6, totalBeds: 10, ready24x7: true, helpline: "108", floor: "MCH Wing" },
      { code: "ICU", name: "Critical Care ICU", beds: 5, totalBeds: 12, ready24x7: true, helpline: "108", floor: "Central ICU" },
      { code: "GENERAL", name: "General Emergency", beds: 15, totalBeds: 30, ready24x7: true, helpline: "108", floor: "Casualty Ground" },
    ],
    resources: { oxygen: 70, ventilators: 15, otFree: 4, ambulances: 8, bloodUnits: 90 },
  },
  {
    id: "hosp-indore-5",
    name: "Apollo Hospitals Indore",
    area: "Sector D, Scheme No 74C, Vijay Nagar, Indore",
    phone: "+91 731 2445566",
    lat: 22.7580,
    lng: 75.8965,
    beds: 15,
    status: "AVAILABLE",
    specialties: ["Cardiology", "Stroke & Neurology", "ICU", "Trauma"],
    password: "staff",
    departments: [
      { code: "CARDIAC", name: "Cardiology & Cath Lab", beds: 5, totalBeds: 8, ready24x7: true, helpline: "+91 731 2445570", floor: "Tower 1, Level 2" },
      { code: "STROKE", name: "Stroke & Neurology", beds: 4, totalBeds: 6, ready24x7: true, helpline: "+91 731 2445580", floor: "Neuro Care 3rd Floor" },
      { code: "ICU", name: "Critical Care ICU", beds: 6, totalBeds: 10, ready24x7: true, helpline: "+91 731 2445590", floor: "ICU Wing" },
      { code: "GENERAL", name: "General Emergency", beds: 6, totalBeds: 12, ready24x7: true, helpline: "+91 731 2445566", floor: "Ground Emergency" },
    ],
    resources: { oxygen: 45, ventilators: 9, otFree: 3, ambulances: 4, bloodUnits: 55 },
  },
  {
    id: "hosp-indore-6",
    name: "Choithram Hospital & Research Centre",
    area: "Manik Bagh Road, Indore",
    phone: "+91 731 2470001",
    lat: 22.6958,
    lng: 75.8482,
    beds: 11,
    status: "AVAILABLE",
    specialties: ["Burn Unit", "Pediatric Emergency", "Critical Care", "General Emergency"],
    password: "staff",
    departments: [
      { code: "BURN", name: "Burn Unit", beds: 4, totalBeds: 6, ready24x7: true, helpline: "+91 731 2470010", floor: "Dedicated Burn Centre" },
      { code: "PEDIATRIC", name: "Pediatric Emergency", beds: 3, totalBeds: 6, ready24x7: true, helpline: "+91 731 2470020", floor: "Pediatric ICU" },
      { code: "ICU", name: "Critical Care ICU", beds: 4, totalBeds: 8, ready24x7: true, helpline: "+91 731 2470030", floor: "Main ICU 2nd Floor" },
      { code: "GENERAL", name: "General Emergency", beds: 7, totalBeds: 14, ready24x7: true, helpline: "+91 731 2470001", floor: "Ground Floor" },
    ],
    resources: { oxygen: 34, ventilators: 7, otFree: 2, ambulances: 3, bloodUnits: 38 },
  },
  {
    id: "hosp-indore-7",
    name: "Shalby Super Speciality Hospital",
    area: "R.S. Bhandari Marg, Janjeerwala Square, Indore",
    phone: "+91 731 6677000",
    lat: 22.7277,
    lng: 75.8791,
    beds: 9,
    status: "AVAILABLE",
    specialties: ["Trauma & Orthopedics", "Cardiology", "ICU"],
    password: "staff",
    departments: [
      { code: "TRAUMA", name: "Trauma & Orthopedics", beds: 4, totalBeds: 6, ready24x7: true, helpline: "+91 731 6677015", floor: "Ground Floor Casualty" },
      { code: "CARDIAC", name: "Cardiology & Cath Lab", beds: 2, totalBeds: 4, ready24x7: true, helpline: "+91 731 6677025", floor: "Cardiac Wing" },
      { code: "ICU", name: "Critical Care ICU", beds: 3, totalBeds: 6, ready24x7: true, helpline: "+91 731 6677035", floor: "1st Floor ICU" },
      { code: "GENERAL", name: "General Emergency", beds: 5, totalBeds: 10, ready24x7: true, helpline: "+91 731 6677000", floor: "Reception Level" },
    ],
    resources: { oxygen: 28, ventilators: 5, otFree: 2, ambulances: 2, bloodUnits: 30 },
  },
  {
    id: "hosp-indore-8",
    name: "Greater Kailash Hospital",
    area: "Old Palasia, Indore",
    phone: "+91 731 4055555",
    lat: 22.7231,
    lng: 75.8874,
    beds: 7,
    status: "AVAILABLE",
    specialties: ["Maternity & Labour Room", "Pediatric Emergency", "ICU"],
    password: "staff",
    departments: [
      { code: "MATERNITY", name: "Maternity & Labour Room", beds: 3, totalBeds: 5, ready24x7: true, helpline: "+91 731 4055560", floor: "Labour Suite 2nd Floor" },
      { code: "PEDIATRIC", name: "Pediatric Emergency", beds: 2, totalBeds: 4, ready24x7: true, helpline: "+91 731 4055570", floor: "NICU Block" },
      { code: "ICU", name: "Critical Care ICU", beds: 2, totalBeds: 5, ready24x7: true, helpline: "+91 731 4055580", floor: "1st Floor" },
      { code: "GENERAL", name: "General Emergency", beds: 4, totalBeds: 8, ready24x7: true, helpline: "+91 731 4055555", floor: "Ground Floor" },
    ],
    resources: { oxygen: 22, ventilators: 4, otFree: 1, ambulances: 2, bloodUnits: 25 },
  },
  {
    id: "hosp-ujjain-9",
    name: "Tejankar Hospital Ujjain",
    area: "Freeganj, Ujjain",
    phone: "+91 734 2511222",
    lat: 23.1793,
    lng: 75.7925,
    beds: 8,
    status: "AVAILABLE",
    specialties: ["Trauma & Orthopedics", "Cardiology", "ICU Critical Care"],
    password: "staff",
    departments: [
      { code: "TRAUMA", name: "Trauma & Orthopedics", beds: 3, totalBeds: 5, ready24x7: true, helpline: "+91 734 2511230", floor: "Ground Floor Emergency" },
      { code: "CARDIAC", name: "Cardiology & Cath Lab", beds: 2, totalBeds: 4, ready24x7: true, helpline: "+91 734 2511240", floor: "1st Floor ICU" },
      { code: "ICU", name: "Critical Care ICU", beds: 3, totalBeds: 6, ready24x7: true, helpline: "+91 734 2511250", floor: "ICU Ward" },
      { code: "GENERAL", name: "General Emergency", beds: 6, totalBeds: 12, ready24x7: true, helpline: "+91 734 2511222", floor: "Emergency Desk" },
    ],
    resources: { oxygen: 25, ventilators: 5, otFree: 2, ambulances: 3, bloodUnits: 22 },
  },
  {
    id: "hosp-ujjain-10",
    name: "District Civil Hospital Ujjain",
    area: "Agar Road, Ujjain",
    phone: "108",
    lat: 23.1895,
    lng: 75.7765,
    beds: 16,
    status: "AVAILABLE",
    specialties: ["Trauma & Orthopedics", "Maternity", "Burn Unit", "Critical Care"],
    password: "staff",
    departments: [
      { code: "TRAUMA", name: "Trauma & Orthopedics", beds: 5, totalBeds: 10, ready24x7: true, helpline: "108", floor: "Trauma Wing Gate 2" },
      { code: "MATERNITY", name: "Maternity & Labour Room", beds: 4, totalBeds: 8, ready24x7: true, helpline: "108", floor: "MCH Complex" },
      { code: "BURN", name: "Burn Unit", beds: 3, totalBeds: 5, ready24x7: true, helpline: "108", floor: "Burn Unit 2nd Floor" },
      { code: "ICU", name: "Critical Care ICU", beds: 4, totalBeds: 8, ready24x7: true, helpline: "108", floor: "Main ICU" },
      { code: "GENERAL", name: "General Emergency", beds: 10, totalBeds: 20, ready24x7: true, helpline: "108", floor: "Casualty" },
    ],
    resources: { oxygen: 36, ventilators: 6, otFree: 2, ambulances: 5, bloodUnits: 45 },
  },
];

export const LOCATION_PRESETS = [
  { name: "Indore (Vijay Nagar)", lat: 22.7533, lng: 75.8937 },
  { name: "Indore (Rajwada Square)", lat: 22.7196, lng: 75.8577 },
  { name: "Indore (Bhawarkua)", lat: 22.6926, lng: 75.8676 },
  { name: "Ujjain (Mahakal Temple)", lat: 23.1827, lng: 75.7682 },
  { name: "Ujjain (Freeganj)", lat: 23.1793, lng: 75.7925 },
];

export const SYMPTOM_PRESETS = [
  "Bhaiya chest pain ho raha hai aur saans nahi aa rahi",
  "Road accident hua hai bahut khoon beh raha hai fracture hai",
  "Achanak behosh ho gaye hain stroke ka lag raha hai",
  "Maternity delivery labour pain shuru ho gaya hai",
  "Chhote bachhe ko bahut tez bukhar aur ulti ho rahi hai",
];

type Store = {
  hospitals: Hospital[];
  sos: SosLog[];
  contacts: EmergencyContact[];
};

const KEY = "emergx-store-v2";
const EMPTY: Store = { hospitals: SEED_HOSPITALS, sos: [], contacts: DEFAULT_CONTACTS };

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
    if (!raw) {
      // Auto-initialize with seed data
      write(EMPTY);
      return EMPTY;
    }
    const parsed = JSON.parse(raw) as any;
    const hospitals = Array.isArray(parsed.hospitals) && parsed.hospitals.length
      ? parsed.hospitals.map(normalizeHospital)
      : SEED_HOSPITALS;
    const contacts = Array.isArray(parsed.contacts) && parsed.contacts.length
      ? parsed.contacts
      : DEFAULT_CONTACTS;
    return {
      hospitals,
      sos: (parsed.sos ?? []).map((s: any) => ({
        ...s,
        deptCode: (s.deptCode ?? "GENERAL") as DeptCode,
      })),
      contacts,
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

  const addContact = useCallback(
    (c: Omit<EmergencyContact, "id">) =>
      update((s) => ({
        ...s,
        contacts: [...s.contacts, { ...c, id: crypto.randomUUID() }],
      })),
    [update],
  );

  const removeContact = useCallback(
    (id: string) =>
      update((s) => ({
        ...s,
        contacts: s.contacts.filter((c) => c.id !== id),
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
    addContact,
    removeContact,
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

export function urgencyBadge(u: Urgency) {
  switch (u) {
    case "CRITICAL":
      return {
        label: "CRITICAL EMERGENCY",
        short: "CRITICAL",
        icon: "🔴",
        className:
          "border-red-600/80 bg-red-950/80 text-red-300 font-extrabold shadow-md shadow-red-950/50 animate-pulse ring-1 ring-red-500/50",
      };
    case "HIGH":
      return {
        label: "HIGH URGENCY",
        short: "HIGH",
        icon: "🟡",
        className:
          "border-amber-500/80 bg-amber-950/80 text-amber-300 font-bold ring-1 ring-amber-500/40",
      };
    case "MODERATE":
      return {
        label: "MODERATE CARE",
        short: "MODERATE",
        icon: "🟢",
        className:
          "border-emerald-500/80 bg-emerald-950/80 text-emerald-300 font-semibold ring-1 ring-emerald-500/40",
      };
  }
}

export function urgencyIcon(u: Urgency) {
  return urgencyBadge(u).icon;
}

export function urgencyClass(u: Urgency) {
  return urgencyBadge(u).className;
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
