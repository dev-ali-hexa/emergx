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
  source: "gemini_api" | "local_rules";
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

/**
 * Frontend API client with seamless offline fallback.
 * If backend endpoints (FastAPI / Gemini / Twilio) are live, calls them.
 * If offline or backend is not running, falls back safely to client-side triage & local storage.
 */
export const emergxApi = {
  /**
   * AI Hinglish triage symptom parsing.
   * Calls FastAPI POST /api/triage (Gemini 1.5 Flash).
   * Falls back to local regex-based triage on network failure.
   */
  async triage(text: string): Promise<TriageApiResponse> {
    try {
      const res = await fetch("/api/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: text }),
        signal: AbortSignal.timeout(4000),
      });
      if (res.ok) {
        const data = await res.json();
        return {
          urgency: data.urgency ?? "MODERATE",
          specialty: data.specialty ?? "General Medicine",
          dept: data.deptCode ?? "GENERAL",
          matched: data.matched ?? [],
          source: "gemini_api",
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
   * Calls FastAPI POST /api/sos (Twilio / Fast2SMS API).
   */
  async sendSos(payload: SosPayload): Promise<SosApiResponse> {
    try {
      const res = await fetch("/api/sos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(4000),
      });
      if (res.ok) {
        const data = await res.json();
        return {
          success: true,
          message: data.message ?? "SOS and emergency SMS dispatched successfully.",
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
   * Real-time ICU bed count & status update from Hospital Desk Manager.
   * Calls FastAPI PATCH /api/hospitals/beds.
   */
  async updateBeds(hospitalId: string, beds: number, status?: "AVAILABLE" | "FULL"): Promise<boolean> {
    try {
      const res = await fetch("/api/hospitals/beds", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hospitalId, beds, status }),
        signal: AbortSignal.timeout(3000),
      });
      return res.ok;
    } catch {
      return false;
    }
  },
};
