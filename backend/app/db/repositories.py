"""
Database repository access layer.
Provides clean decoupled access to hospitals, blood_banks, and sos_logs tables,
preventing route handlers and higher-level services from depending on raw database calls.
Includes seamless in-memory fallback for local offline execution when Supabase is unconfigured.
"""

import math
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from app.db.client import get_supabase_client, is_supabase_configured

# ------------------------------------------------------------------------------
# In-Memory Seed Data for Offline / Unconfigured Environments
# ------------------------------------------------------------------------------

SEED_HOSPITALS_FALLBACK: List[Dict[str, Any]] = [
    {
        "id": "hosp-indore-1",
        "name": "Bombay Hospital Indore",
        "address": "Ring Road, IDA Scheme 94, Indore",
        "phone": "+91 731 4771111",
        "latitude": 22.7533,
        "longitude": 75.8937,
        "specialties": ["Cardiology", "Critical Care", "Neurology", "Trauma"],
        "emergency_available": True,
        "beds_available": 18,
        "is_active": True,
    },
    {
        "id": "hosp-indore-2",
        "name": "Medanta Super Specialty Hospital",
        "address": "AB Road, Near Plot 8, PU4, Indore",
        "phone": "+91 731 7111234",
        "latitude": 22.7538,
        "longitude": 75.8973,
        "specialties": ["Cardiology", "Critical Care", "Pulmonary", "Trauma"],
        "emergency_available": True,
        "beds_available": 14,
        "is_active": True,
    },
    {
        "id": "hosp-indore-3",
        "name": "Care CHL Hospital",
        "address": "AB Road, Near LIG Square, Indore",
        "phone": "+91 731 4774444",
        "latitude": 22.7369,
        "longitude": 75.8876,
        "specialties": ["Cardiology", "Pediatrics", "ICU", "Trauma"],
        "emergency_available": True,
        "beds_available": 12,
        "is_active": True,
    },
    {
        "id": "hosp-indore-4",
        "name": "MY Hospital (Maharaja Yeshwantrao)",
        "address": "Sanyogitaganj, Indore",
        "phone": "108",
        "latitude": 22.7164,
        "longitude": 75.8706,
        "specialties": ["Trauma", "Burn", "Maternity", "Critical Care"],
        "emergency_available": True,
        "beds_available": 24,
        "is_active": True,
    },
    {
        "id": "hosp-indore-5",
        "name": "Apollo Hospitals Indore",
        "address": "Sector D, Scheme No 74C, Vijay Nagar, Indore",
        "phone": "+91 731 2445566",
        "latitude": 22.7580,
        "longitude": 75.8965,
        "specialties": ["Cardiology", "Neurology", "ICU", "Trauma"],
        "emergency_available": True,
        "beds_available": 15,
        "is_active": True,
    },
    {
        "id": "hosp-indore-6",
        "name": "Choithram Hospital & Research Centre",
        "address": "Manik Bagh Road, Indore",
        "phone": "+91 731 2470001",
        "latitude": 22.6958,
        "longitude": 75.8482,
        "specialties": ["Burn", "Pediatrics", "Critical Care", "General Medicine"],
        "emergency_available": True,
        "beds_available": 11,
        "is_active": True,
    },
    {
        "id": "hosp-indore-7",
        "name": "Shalby Super Speciality Hospital",
        "address": "R.S. Bhandari Marg, Janjeerwala Square, Indore",
        "phone": "+91 731 6677000",
        "latitude": 22.7277,
        "longitude": 75.8791,
        "specialties": ["Trauma", "Cardiology", "ICU"],
        "emergency_available": True,
        "beds_available": 9,
        "is_active": True,
    },
    {
        "id": "hosp-indore-8",
        "name": "Greater Kailash Hospital",
        "address": "Old Palasia, Indore",
        "phone": "+91 731 4055555",
        "latitude": 22.7231,
        "longitude": 75.8874,
        "specialties": ["Maternity", "Pediatrics", "ICU"],
        "emergency_available": True,
        "beds_available": 7,
        "is_active": True,
    },
    {
        "id": "hosp-ujjain-9",
        "name": "Tejankar Hospital Ujjain",
        "address": "Freeganj, Ujjain",
        "phone": "+91 734 2511222",
        "latitude": 23.1793,
        "longitude": 75.7925,
        "specialties": ["Trauma", "Cardiology", "ICU"],
        "emergency_available": True,
        "beds_available": 8,
        "is_active": True,
    },
    {
        "id": "hosp-ujjain-10",
        "name": "District Civil Hospital Ujjain",
        "address": "Agar Road, Ujjain",
        "phone": "108",
        "latitude": 23.1895,
        "longitude": 75.7765,
        "specialties": ["Trauma", "Maternity", "Burn", "Critical Care"],
        "emergency_available": True,
        "beds_available": 16,
        "is_active": True,
    },
]

_LOCAL_SOS_LOGS: List[Dict[str, Any]] = []


def _haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates geodesic distance in kilometers between two GPS coordinates."""
    r = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2.0) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2.0) ** 2
    )
    c = 2.0 * math.asin(math.sqrt(min(1.0, max(0.0, a))))
    return r * c


class HospitalRepository:
    """
    Data access layer for hospitals table.
    """

    def __init__(self, client=None):
        self._client = client

    @property
    def client(self):
        if self._client is None:
            self._client = get_supabase_client()
        return self._client

    def get_all(self, limit: int = 50, active_only: bool = True) -> List[Dict[str, Any]]:
        """
        Retrieves hospital records up to specified limit.
        """
        if self._client is None and not is_supabase_configured():
            results = [h for h in SEED_HOSPITALS_FALLBACK if not active_only or h.get("is_active", True)]
            return results[:limit]

        query = self.client.table("hospitals").select("*")
        if active_only:
            query = query.eq("is_active", True)
        response = query.limit(limit).execute()
        return response.data or []

    def get_by_id(self, hospital_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieves a single hospital record by UUID.
        """
        if self._client is None and not is_supabase_configured():
            for h in SEED_HOSPITALS_FALLBACK:
                if h["id"] == hospital_id:
                    return h
            return None

        response = self.client.table("hospitals").select("*").eq("id", hospital_id).limit(1).execute()
        return response.data[0] if response.data else None

    def get_emergency_available(self, limit: int = 50) -> List[Dict[str, Any]]:
        """
        Retrieves active hospitals with confirmed emergency capability and available beds.
        """
        if self._client is None and not is_supabase_configured():
            results = [
                h for h in SEED_HOSPITALS_FALLBACK
                if h.get("is_active", True) and h.get("emergency_available", True) and h.get("beds_available", 0) > 0
            ]
            return results[:limit]

        response = (
            self.client.table("hospitals")
            .select("*")
            .eq("is_active", True)
            .eq("emergency_available", True)
            .gt("beds_available", 0)
            .limit(limit)
            .execute()
        )
        return response.data or []

    def get_nearby_hospitals(
        self,
        latitude: float,
        longitude: float,
        radius_km: float = 10.0,
        specialty: Optional[str] = None,
        emergency_only: bool = False,
        limit: int = 10,
    ) -> List[Dict[str, Any]]:
        """
        Geospatial discovery of nearby eligible hospitals via PostGIS RPC.
        Calls the PostgreSQL stored function get_nearby_hospitals using ST_DWithin and ST_Distance.
        Falls back to in-memory Haversine formula calculation when Supabase is unconfigured.
        """
        clean_specialty = specialty.strip() if specialty and specialty.strip() else None

        if self._client is None and not is_supabase_configured():
            matched = []
            for h in SEED_HOSPITALS_FALLBACK:
                if not h.get("is_active", True):
                    continue
                if emergency_only and (not h.get("emergency_available", True) or h.get("beds_available", 0) <= 0):
                    continue
                if clean_specialty:
                    specs = [s.lower() for s in h.get("specialties", [])]
                    cs_lower = clean_specialty.lower()
                    if not any(cs_lower in s or s in cs_lower for s in specs):
                        continue

                dist = _haversine_distance_km(latitude, longitude, h["latitude"], h["longitude"])
                matched.append({**h, "distance_km": round(dist, 2)})

            # Sort nearest-first
            matched.sort(key=lambda x: x["distance_km"])

            # Filter within radius, or if none within radius, return nearest available
            within_radius = [h for h in matched if h["distance_km"] <= radius_km]
            final_list = within_radius if within_radius else matched
            return final_list[:limit]

        params = {
            "user_lat": latitude,
            "user_lng": longitude,
            "radius_meters": radius_km * 1000.0,
            "emergency_filter": emergency_only,
            "specialty_filter": clean_specialty,
            "max_results": limit,
        }
        response = self.client.rpc("get_nearby_hospitals", params).execute()
        return response.data or []

    def update_beds(self, hospital_id: str, beds: int, status: Optional[str] = None) -> bool:
        """
        Updates available beds and optional status for a hospital.
        """
        if self._client is None and not is_supabase_configured():
            for h in SEED_HOSPITALS_FALLBACK:
                if h["id"] == hospital_id:
                    h["beds_available"] = max(0, beds)
                    if status:
                        h["emergency_available"] = (status != "FULL" and beds > 0)
                    return True
            return True

        update_payload: Dict[str, Any] = {"beds_available": max(0, beds)}
        if status:
            update_payload["emergency_available"] = (status != "FULL" and beds > 0)

        self.client.table("hospitals").update(update_payload).eq("id", hospital_id).execute()
        return True


SEED_BLOOD_BANKS_FALLBACK: List[Dict[str, Any]] = [
    {
        "id": "bb-indore-1",
        "name": "Indore Red Cross Central Blood Bank",
        "address": "MY Hospital Campus, Sanyogitaganj, Indore",
        "phone": "+91 731 2527383",
        "latitude": 22.7164,
        "longitude": 75.8706,
        "available_blood_groups": ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
        "is_active": True,
    },
    {
        "id": "bb-indore-2",
        "name": "Model Blood Bank & Component Center",
        "address": "Chacha Nehru Hospital, Indore",
        "phone": "+91 731 2514111",
        "latitude": 22.7196,
        "longitude": 75.8577,
        "available_blood_groups": ["A+", "B+", "O+", "AB+", "O-"],
        "is_active": True,
    },
    {
        "id": "bb-indore-3",
        "name": "Indore Voluntary Blood Bank",
        "address": "12 New Palasia, Indore",
        "phone": "+91 731 2533344",
        "latitude": 22.7231,
        "longitude": 75.8874,
        "available_blood_groups": ["A+", "B+", "O+", "AB+"],
        "is_active": True,
    },
    {
        "id": "bb-ujjain-4",
        "name": "Lions Club Blood Bank Ujjain",
        "address": "Freeganj Square, Ujjain",
        "phone": "+91 734 2512345",
        "latitude": 23.1793,
        "longitude": 75.7925,
        "available_blood_groups": ["A+", "A-", "B+", "B-", "O+", "O-"],
        "is_active": True,
    },
    {
        "id": "bb-ujjain-5",
        "name": "Civil Hospital Blood Depository",
        "address": "Agar Road, Ujjain",
        "phone": "108",
        "latitude": 23.1895,
        "longitude": 75.7765,
        "available_blood_groups": ["A+", "B+", "AB+", "O+", "O-"],
        "is_active": True,
    },
]


class BloodBankRepository:
    """
    Data access layer for blood_banks table.
    """

    def __init__(self, client=None):
        self._client = client

    @property
    def client(self):
        if self._client is None:
            self._client = get_supabase_client()
        return self._client

    def get_all(self, limit: int = 50, active_only: bool = True) -> List[Dict[str, Any]]:
        """
        Retrieves blood bank records up to specified limit.
        """
        if self._client is None and not is_supabase_configured():
            results = [b for b in SEED_BLOOD_BANKS_FALLBACK if not active_only or b.get("is_active", True)]
            return results[:limit]

        query = self.client.table("blood_banks").select("*")
        if active_only:
            query = query.eq("is_active", True)
        response = query.limit(limit).execute()
        return response.data or []

    def get_by_id(self, blood_bank_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieves a single blood bank by UUID.
        """
        if self._client is None and not is_supabase_configured():
            for b in SEED_BLOOD_BANKS_FALLBACK:
                if b["id"] == blood_bank_id:
                    return b
            return None

        response = self.client.table("blood_banks").select("*").eq("id", blood_bank_id).limit(1).execute()
        return response.data[0] if response.data else None

    def get_nearby_blood_banks(
        self,
        latitude: float,
        longitude: float,
        blood_group: Optional[str] = None,
        radius_km: float = 30.0,
        limit: int = 10,
    ) -> List[Dict[str, Any]]:
        """
        Geospatial discovery of verified blood banks with matching blood groups.
        """
        clean_bg = blood_group.strip().upper() if blood_group and blood_group.strip() else None

        if self._client is None and not is_supabase_configured():
            matched = []
            for b in SEED_BLOOD_BANKS_FALLBACK:
                if not b.get("is_active", True):
                    continue
                if clean_bg:
                    groups = [g.upper() for g in b.get("available_blood_groups", [])]
                    if clean_bg not in groups:
                        continue
                dist = _haversine_distance_km(latitude, longitude, b["latitude"], b["longitude"])
                matched.append({**b, "distance_km": round(dist, 2)})

            matched.sort(key=lambda x: x["distance_km"])
            within_radius = [b for b in matched if b["distance_km"] <= radius_km]
            final_list = within_radius if within_radius else matched
            return final_list[:limit]

        query = self.client.table("blood_banks").select("*").eq("is_active", True)
        response = query.limit(limit).execute()
        raw = response.data or []
        results = []
        for b in raw:
            dist = _haversine_distance_km(latitude, longitude, float(b["latitude"]), float(b["longitude"]))
            if dist <= radius_km:
                results.append({**b, "distance_km": round(dist, 2)})
        results.sort(key=lambda x: x["distance_km"])
        return results[:limit]


class SOSLogRepository:
    """
    Data access layer for sos_logs audit table.
    """

    def __init__(self, client=None):
        self._client = client

    @property
    def client(self):
        if self._client is None:
            self._client = get_supabase_client()
        return self._client

    def create(self, log_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Records an emergency dispatch event in the audit log.
        Explicitly enforces initial status as 'initiated'.
        """
        payload = dict(log_data)
        payload["status"] = "initiated"  # Enforce initial status at repository boundary
        if "contacts_notified" not in payload or payload["contacts_notified"] in (None, ""):
            payload["contacts_notified"] = {}

        if self._client is None and not is_supabase_configured():
            record = {
                "id": str(uuid.uuid4()),
                "created_at": datetime.now(timezone.utc).isoformat(),
                **payload,
            }
            _LOCAL_SOS_LOGS.insert(0, record)
            return record

        response = self.client.table("sos_logs").insert(payload).execute()
        return response.data[0] if response.data else {}

    def get_by_id(self, log_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieves an SOS log entry by UUID.
        """
        if self._client is None and not is_supabase_configured():
            for entry in _LOCAL_SOS_LOGS:
                if entry["id"] == log_id:
                    return entry
            return None

        response = self.client.table("sos_logs").select("*").eq("id", log_id).limit(1).execute()
        return response.data[0] if response.data else None

    def get_recent(self, limit: int = 20) -> List[Dict[str, Any]]:
        """
        Retrieves recent SOS log entries ordered by creation timestamp.
        """
        if self._client is None and not is_supabase_configured():
            return _LOCAL_SOS_LOGS[:limit]

        response = (
            self.client.table("sos_logs")
            .select("*")
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        return response.data or []
