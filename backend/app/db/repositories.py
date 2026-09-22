"""
Database repository access layer.
Provides clean decoupled access to hospitals, blood_banks, and sos_logs tables,
preventing route handlers and higher-level services from depending on raw database calls.
"""

from typing import Any, Dict, List, Optional
from app.db.client import get_supabase_client


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
        query = self.client.table("hospitals").select("*")
        if active_only:
            query = query.eq("is_active", True)
        response = query.limit(limit).execute()
        return response.data or []

    def get_by_id(self, hospital_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieves a single hospital record by UUID.
        """
        response = self.client.table("hospitals").select("*").eq("id", hospital_id).limit(1).execute()
        return response.data[0] if response.data else None

    def get_emergency_available(self, limit: int = 50) -> List[Dict[str, Any]]:
        """
        Retrieves active hospitals with confirmed emergency capability and available beds.
        """
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
        """
        clean_specialty = specialty.strip() if specialty and specialty.strip() else None
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
        query = self.client.table("blood_banks").select("*")
        if active_only:
            query = query.eq("is_active", True)
        response = query.limit(limit).execute()
        return response.data or []

    def get_by_id(self, blood_bank_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieves a single blood bank by UUID.
        """
        response = self.client.table("blood_banks").select("*").eq("id", blood_bank_id).limit(1).execute()
        return response.data[0] if response.data else None


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
        response = self.client.table("sos_logs").insert(payload).execute()
        return response.data[0] if response.data else {}

    def get_by_id(self, log_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieves an SOS log entry by UUID.
        """
        response = self.client.table("sos_logs").select("*").eq("id", log_id).limit(1).execute()
        return response.data[0] if response.data else None

    def get_recent(self, limit: int = 20) -> List[Dict[str, Any]]:
        """
        Retrieves recent SOS log entries ordered by creation timestamp.
        """
        response = (
            self.client.table("sos_logs")
            .select("*")
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        return response.data or []
