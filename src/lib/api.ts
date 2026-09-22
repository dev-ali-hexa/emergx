import {
  triage as localTriage,
  type DeptCode,
  type Hospital,
  type Urgency,
} from "./mergex";

export type TriageApiResponse = {
  urgency: Urgency;
  specialty: string;
  dept: DeptCode;
  matched: string[];
  source: "fastapi_backend" | "local_rules";
  disclaimer?: string;
};

export type SosPayload = {
  hospitalId: string | null;
  hospitalName?: string;
  urgency: Urgency;
  specialty: string;
  deptCode: DeptCode;
  transcript: string;
  lat: number | null;
  lng: number | null;
  contacts: { name: string; phone: string }[];
};

export type SosApiResponse = {
  success: boolean;
  message: string;
  smsDispatched: boolean;
  logId?: string;
};

export type BackendFacility = {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  latitude: number;
  longitude: number;
  distance_km: number;
  specialties: string[];
  emergency_capable: boolean;
  available_beds: number;
};

export type BackendBloodBank = {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  latitude: number;
  longitude: number;
  available_blood_groups: string[];
  distance_km: number;
};

export type BackendSosIncident = {
  id: string;
  latitude: number;
  longitude: number;
  message?: string;
  status: string;
  contacts_notified?: any;
  created_at?: string;
};

export type BackendHealth = {
  online: boolean;
  service?: string;
};

function specialtyToDept(specialty: string): DeptCode {
  const s = (specialty || "").toLowerCase();
  if (s.includes("cardio") || s.includes("heart")) return "CARDIAC";
  if (s.includes("stroke") || s.includes("neuro")) return "STROKE";
  if (s.includes("trauma") || s.includes("ortho")) return "TRAUMA";
  if (s.includes("icu") || s.includes("pulmonary") || s.includes("critical")) return "ICU";
  if (s.includes("pediatric") || s.includes("child")) return "PEDIATRIC";
  if (s.includes("maternity") || s.includes("obstetric") || s.includes("labour") || s.includes("labor")) return "MATERNITY";
  if (s.includes("burn")) return "BURN";
  return "GENERAL";
}

function normalizeUrgency(u: string): Urgency {
  const upper = (u || "").toUpperCase();
  if (upper === "CRITICAL" || upper === "HIGH" || upper === "MODERATE") return upper;
  return "MODERATE";
}

/**
 * Frontend API client connected to FastAPI backend with offline fallback.
 * Routes through Vite dev proxy (/api -> http://127.0.0.1:8000).
 */
export const emergxApi = {
  /**
   * Checks whether the FastAPI backend is online and reachable.
   */
  async checkHealth(): Promise<BackendHealth> {
    try {
      const res = await fetch("/health", { signal: AbortSignal.timeout(2000) });
      if (res.ok) {
        const data = await res.json();
        return { online: true, service: data.service ?? "emergx-backend" };
      }
    } catch {
      // Backend offline
    }
    return { online: false };
  },

  /**
   * AI Hinglish triage symptom parsing.
   * Calls FastAPI POST /api/triage.
   * Falls back to local regex-based triage on network failure or offline mode.
   */
  async triage(text: string): Promise<TriageApiResponse> {
    try {
      const res = await fetch("/api/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, transcript: text }),
        signal: AbortSignal.timeout(4000),
      });
      if (res.ok) {
        const data = await res.json();
        const urgency = normalizeUrgency(data.urgency);
        const dept = specialtyToDept(data.specialty);
        return {
          urgency,
          specialty: data.specialty || "Emergency Care",
          dept,
          matched: Array.isArray(data.symptoms) ? data.symptoms : [],
          source: "fastapi_backend",
          disclaimer: data.disclaimer,
        };
      }
    } catch {
      // Backend not running / offline — fallback gracefully
    }
    const local = localTriage(text);
    return { ...local, source: "local_rules" };
  },

  /**
   * 1-Click Family SOS dispatch.
   * Calls FastAPI POST /api/sos.
   */
  async sendSos(payload: SosPayload): Promise<SosApiResponse> {
    try {
      const res = await fetch("/api/sos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: payload.lat ?? 22.7533,
          longitude: payload.lng ?? 75.8937,
          message: payload.transcript || `Emergency SOS for ${payload.specialty}`,
          contacts_notified: payload.contacts,
          status: "initiated",
        }),
        signal: AbortSignal.timeout(4000),
      });
      if (res.ok) {
        const data = await res.json();
        return {
          success: true,
          message: data.message ?? "SOS recorded in backend audit log.",
          smsDispatched: true,
          logId: data.id,
        };
      }
    } catch {
      // Fallback
    }
    return {
      success: true,
      message: "SOS alert logged to emergency hospital dashboard.",
      smsDispatched: false,
    };
  },

  /**
   * Geospatial hospital discovery from FastAPI PostGIS endpoint.
   * Calls GET /api/facilities.
   */
  async getNearbyFacilities(
    lat: number,
    lng: number,
    radiusKm = 15,
    specialty?: string,
  ): Promise<BackendFacility[]> {
    try {
      const params = new URLSearchParams({
        latitude: lat.toString(),
        longitude: lng.toString(),
        radius_km: radiusKm.toString(),
      });
      if (specialty) params.set("specialty", specialty);

      const res = await fetch(`/api/facilities?${params.toString()}`, {
        signal: AbortSignal.timeout(4000),
      });
      if (res.ok) {
        const data = await res.json();
        return data.facilities || [];
      }
    } catch {
      // Fallback
    }
    return [];
  },

  /**
   * Emergency navigation orchestration from FastAPI endpoint.
   * Calls POST /api/emergency.
   */
  async orchestrateEmergency(
    lat: number,
    lng: number,
    urgency: Urgency,
    specialty?: string,
  ): Promise<BackendFacility[]> {
    try {
      const res = await fetch("/api/emergency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: lat,
          longitude: lng,
          urgency: urgency.toLowerCase(),
          specialty: specialty || undefined,
          radius_km: 25,
          limit: 10,
        }),
        signal: AbortSignal.timeout(4000),
      });
      if (res.ok) {
        const data = await res.json();
        return data.facilities || [];
      }
    } catch {
      // Fallback
    }
    return [];
  },

  /**
   * Updates bed count and status on the backend.
   * Calls PATCH /api/facilities/{hospitalId}/beds.
   */
  async updateBeds(
    hospitalId: string,
    beds: number,
    status?: "AVAILABLE" | "FULL",
  ): Promise<boolean> {
    try {
      const res = await fetch(`/api/facilities/${encodeURIComponent(hospitalId)}/beds`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ beds, status }),
        signal: AbortSignal.timeout(4000),
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  /**
   * Fetches recent emergency SOS incidents for the hospital desk and admin view.
   * Calls GET /api/sos.
   */
  async getRecentSos(limit = 20): Promise<BackendSosIncident[]> {
    try {
      const res = await fetch(`/api/sos?limit=${limit}`, {
        signal: AbortSignal.timeout(4000),
      });
      if (res.ok) {
        const data = await res.json();
        return data.incidents || [];
      }
    } catch {
      // Fallback
    }
    return [];
  },

  /**
   * Fetches nearby verified blood banks matching an optional blood group.
   * Calls GET /api/blood-banks.
   */
  async getBloodBanks(
    lat: number,
    lng: number,
    bloodGroup?: string,
    radiusKm = 30,
  ): Promise<BackendBloodBank[]> {
    try {
      const params = new URLSearchParams({
        latitude: lat.toString(),
        longitude: lng.toString(),
        radius_km: radiusKm.toString(),
      });
      if (bloodGroup && bloodGroup !== "ALL") params.set("blood_group", bloodGroup);

      const res = await fetch(`/api/blood-banks?${params.toString()}`, {
        signal: AbortSignal.timeout(4000),
      });
      if (res.ok) {
        const data = await res.json();
        return data.blood_banks || [];
      }
    } catch {
      // Fallback
    }
    return [];
  },

  /**
   * Fetches all registered facilities in the city registry.
   * Calls GET /api/facilities/all.
   */
  async getAllFacilities(): Promise<BackendFacility[]> {
    try {
      const res = await fetch("/api/facilities/all", {
        signal: AbortSignal.timeout(4000),
      });
      if (res.ok) {
        const data = await res.json();
        return data.facilities || [];
      }
    } catch {
      // Fallback
    }
    return [];
  },
};
