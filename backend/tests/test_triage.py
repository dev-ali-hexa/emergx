"""
Comprehensive automated tests for Phase 2 - AI Emergency Triage.
All external provider requests are mocked; no live network calls are made.
"""

import sys
from pathlib import Path
import pytest
import anyio
from pydantic import ValidationError
from fastapi.testclient import TestClient

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.main import app
from app.schemas.triage import TriageRequest, TriageResponse, UrgencyLevel
from app.services.ai_provider import (
    BaseAIProvider,
    MockAIProvider,
    SoktAIProvider,
    UnconfiguredAIProvider,
)
from app.services.exceptions import (
    AIProviderNotConfiguredError,
    AITimeoutError,
    AIProviderHTTPError,
    AIProviderResponseError,
)
from app.services.triage import TriageService
from app.api.triage import get_triage_service

client = TestClient(app)


# ==============================================================================
# 1. Request Schema Validation Tests
# ==============================================================================

def test_triage_request_valid_and_whitespace_trimmed():
    """Verify valid emergency messages are accepted and surrounding whitespace is stripped."""
    req = TriageRequest(message="   Severe pain in chest and shortness of breath   ")
    assert req.message == "Severe pain in chest and shortness of breath"


def test_triage_request_rejects_empty_string():
    """Verify empty message is rejected."""
    with pytest.raises(ValidationError):
        TriageRequest(message="")


def test_triage_request_rejects_whitespace_only():
    """Verify whitespace-only message is rejected."""
    with pytest.raises(ValidationError):
        TriageRequest(message="    \t  \n  ")


def test_triage_request_rejects_excessive_length():
    """Verify message exceeding maximum bound is rejected."""
    with pytest.raises(ValidationError):
        TriageRequest(message="A" * 4001)


# ==============================================================================
# 2. Response Schema Validation Tests
# ==============================================================================

def test_triage_response_valid_construction():
    """Verify valid normalized response construction with mandatory disclaimer."""
    resp = TriageResponse(
        symptoms=["chest pain", "dizziness"],
        urgency=UrgencyLevel.CRITICAL,
        urgency_score=0.92,
        specialty="Cardiology",
        disclaimer="Non-diagnostic emergency navigation aid.",
        provider="test-provider",
    )
    assert resp.urgency == UrgencyLevel.CRITICAL
    assert resp.urgency_score == 0.92
    assert resp.specialty == "Cardiology"
    assert "chest pain" in resp.symptoms


def test_triage_response_validates_controlled_urgency_tiers():
    """Verify that only critical, high, and moderate are accepted."""
    for tier in ("critical", "high", "moderate"):
        resp = TriageResponse(
            symptoms=["test"],
            urgency=UrgencyLevel(tier),
            urgency_score=0.5,
            specialty="General Medicine",
            disclaimer="Notice",
        )
        assert resp.urgency.value == tier

    with pytest.raises(ValueError):
        UrgencyLevel("mild")

    with pytest.raises(ValueError):
        UrgencyLevel("low")

    with pytest.raises(ValueError):
        UrgencyLevel("extreme")


def test_triage_response_rejects_invalid_score_bounds():
    """Verify urgency_score must be between 0.0 and 1.0."""
    with pytest.raises(ValidationError):
        TriageResponse(
            symptoms=[],
            urgency=UrgencyLevel.HIGH,
            urgency_score=1.5,
            specialty="Trauma",
            disclaimer="Notice",
        )

    with pytest.raises(ValidationError):
        TriageResponse(
            symptoms=[],
            urgency=UrgencyLevel.HIGH,
            urgency_score=-0.1,
            specialty="Trauma",
            disclaimer="Notice",
        )


# ==============================================================================
# 3. AI Provider & Service Layer Tests (Mocked)
# ==============================================================================

def test_mock_ai_provider_critical_detection():
    """Verify MockAIProvider flags cardiac emergencies as critical."""
    async def _test():
        mock_provider = MockAIProvider()
        service = TriageService(provider=mock_provider)
        result = await service.triage_emergency(
            TriageRequest(message="Patient has severe chest pain and collapsed")
        )
        assert result.urgency == UrgencyLevel.CRITICAL
        assert result.specialty == "Cardiology"
        assert result.urgency_score >= 0.90
        assert result.provider == "mock"
        assert len(result.disclaimer) > 0
    anyio.run(_test)


def test_mock_ai_provider_high_detection():
    """Verify MockAIProvider flags trauma/fracture as high urgency."""
    async def _test():
        mock_provider = MockAIProvider()
        service = TriageService(provider=mock_provider)
        result = await service.triage_emergency(
            TriageRequest(message="Deep cut with heavy bleeding from leg")
        )
        assert result.urgency == UrgencyLevel.HIGH
        assert result.specialty == "Trauma"
    anyio.run(_test)


def test_mock_ai_provider_moderate_detection():
    """Verify MockAIProvider flags mild conditions as moderate."""
    async def _test():
        mock_provider = MockAIProvider()
        service = TriageService(provider=mock_provider)
        result = await service.triage_emergency(
            TriageRequest(message="Mild fever and runny nose for two days")
        )
        assert result.urgency == UrgencyLevel.MODERATE
        assert result.specialty == "General Medicine"
    anyio.run(_test)


def test_unconfigured_provider_raises_error():
    """Verify UnconfiguredAIProvider raises AIProviderNotConfiguredError."""
    async def _test():
        service = TriageService(provider=UnconfiguredAIProvider())
        with pytest.raises(AIProviderNotConfiguredError):
            await service.triage_emergency(TriageRequest(message="Emergency need help"))
    anyio.run(_test)


def test_sokt_provider_unconfigured_without_url():
    """Verify SoktAIProvider raises error when AI_PROVIDER_URL is missing."""
    async def _test():
        sokt = SoktAIProvider()
        with pytest.raises(AIProviderNotConfiguredError):
            await sokt.triage("Emergency message")
    anyio.run(_test)


# ==============================================================================
# 4. Service Normalization and Error Handling Tests
# ==============================================================================

class MalformedResponseProvider(BaseAIProvider):
    name = "malformed"
    async def triage(self, message: str):
        return {"garbage": True}  # Missing urgency and specialty


class InvalidUrgencyProvider(BaseAIProvider):
    name = "invalid_urgency"
    async def triage(self, message: str):
        return {"urgency": "super_extreme", "specialty": "Trauma"}


class TimeoutMockProvider(BaseAIProvider):
    name = "timeout"
    async def triage(self, message: str):
        raise AITimeoutError("Simulated provider timeout after 8.0s")


def test_service_rejects_missing_urgency_in_provider_output():
    async def _test():
        service = TriageService(provider=MalformedResponseProvider())
        with pytest.raises(AIProviderResponseError):
            await service.triage_emergency(TriageRequest(message="Emergency"))
    anyio.run(_test)


def test_service_rejects_uncontrolled_urgency_in_provider_output():
    async def _test():
        service = TriageService(provider=InvalidUrgencyProvider())
        with pytest.raises(AIProviderResponseError):
            await service.triage_emergency(TriageRequest(message="Emergency"))
    anyio.run(_test)


# ==============================================================================
# 5. Endpoint POST /api/triage Integration Tests
# ==============================================================================

def test_api_triage_success_with_mock_service():
    """Verify POST /api/triage returns HTTP 200 with structured response when service succeeds."""
    mock_service = TriageService(provider=MockAIProvider())
    app.dependency_overrides[get_triage_service] = lambda: mock_service

    try:
        response = client.post(
            "/api/triage",
            json={"message": "Severe heart palpitations and fainting spell"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["urgency"] == "critical"
        assert data["specialty"] == "Cardiology"
        assert data["urgency_score"] >= 0.90
        assert "disclaimer" in data
        assert isinstance(data["symptoms"], list)
    finally:
        app.dependency_overrides.clear()


def test_api_triage_empty_message_returns_422():
    """Verify empty message payload returns HTTP 422."""
    response = client.post("/api/triage", json={"message": "   "})
    assert response.status_code == 422


def test_api_triage_missing_message_field_returns_422():
    """Verify missing message field returns HTTP 422."""
    response = client.post("/api/triage", json={})
    assert response.status_code == 422


def test_api_triage_unconfigured_provider_returns_503():
    """Verify unconfigured AI provider returns HTTP 503 Service Unavailable."""
    unconfigured_service = TriageService(provider=UnconfiguredAIProvider())
    app.dependency_overrides[get_triage_service] = lambda: unconfigured_service

    try:
        response = client.post(
            "/api/triage",
            json={"message": "Severe emergency assistance required"},
        )
        assert response.status_code == 503
        assert "unconfigured or unavailable" in response.json()["detail"]
    finally:
        app.dependency_overrides.clear()


def test_api_triage_timeout_returns_504():
    """Verify AI provider timeout returns HTTP 504 Gateway Timeout."""
    timeout_service = TriageService(provider=TimeoutMockProvider())
    app.dependency_overrides[get_triage_service] = lambda: timeout_service

    try:
        response = client.post(
            "/api/triage",
            json={"message": "Severe emergency assistance required"},
        )
        assert response.status_code == 504
        assert "timed out" in response.json()["detail"]
    finally:
        app.dependency_overrides.clear()


def test_api_triage_malformed_response_returns_502():
    """Verify unconfirmed/malformed provider output returns HTTP 502 Bad Gateway."""
    malformed_service = TriageService(provider=MalformedResponseProvider())
    app.dependency_overrides[get_triage_service] = lambda: malformed_service

    try:
        response = client.post(
            "/api/triage",
            json={"message": "Emergency assistance"},
        )
        assert response.status_code == 502
        assert "unparseable or invalid response" in response.json()["detail"]
    finally:
        app.dependency_overrides.clear()
