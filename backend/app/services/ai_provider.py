"""
AI Provider abstraction and concrete adapters for EmergeX Emergency Triage.
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, Optional
import httpx
from app.config import get_settings
from app.services.exceptions import (
    AIProviderError,
    AIProviderNotConfiguredError,
    AITimeoutError,
    AIProviderHTTPError,
    AIProviderResponseError,
)


class BaseAIProvider(ABC):
    """
    Abstract interface for AI triage providers.
    All concrete adapters (Sokt, Gemini, Mock) must implement the triage method.
    """
    name: str = "base"

    @abstractmethod
    async def triage(self, message: str) -> Dict[str, Any]:
        """
        Submits an emergency message/transcript to the AI provider
        and returns the raw or parsed response dictionary.
        """
        pass


class SoktAIProvider(BaseAIProvider):
    """
    Adapter for the Sokt Flow emergency assessment endpoint.
    Endpoint is configurable via AI_PROVIDER_URL environment variable.
    """
    name: str = "sokt"

    async def triage(self, message: str) -> Dict[str, Any]:
        settings = get_settings()
        url = settings.AI_PROVIDER_URL
        if not url or not url.strip():
            raise AIProviderNotConfiguredError(
                "Sokt AI provider is not configured. Set AI_PROVIDER_URL in environment."
            )

        headers: Dict[str, str] = {
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        if settings.AI_PROVIDER_API_KEY and settings.AI_PROVIDER_API_KEY.strip():
            headers["Authorization"] = f"Bearer {settings.AI_PROVIDER_API_KEY.strip()}"

        payload = {"message": message}

        try:
            async with httpx.AsyncClient(timeout=settings.AI_PROVIDER_TIMEOUT) as client:
                response = await client.post(url.strip(), json=payload, headers=headers)
                response.raise_for_status()
                try:
                    data = response.json()
                except Exception as parse_err:
                    raise AIProviderResponseError(
                        f"External AI provider returned non-JSON body: {type(parse_err).__name__}"
                    ) from parse_err

                if not isinstance(data, dict):
                    raise AIProviderResponseError(
                        f"External AI provider returned unexpected payload type: {type(data).__name__}"
                    )
                return data

        except httpx.TimeoutException as timeout_err:
            raise AITimeoutError(
                f"Sokt AI provider timed out after {settings.AI_PROVIDER_TIMEOUT}s"
            ) from timeout_err
        except httpx.HTTPStatusError as http_err:
            raise AIProviderHTTPError(
                status_code=http_err.response.status_code,
                message=f"Sokt AI provider returned HTTP {http_err.response.status_code}",
            ) from http_err
        except httpx.RequestError as req_err:
            raise AIProviderHTTPError(
                status_code=503,
                message=f"Failed to connect to external AI provider: {type(req_err).__name__}",
            ) from req_err


class MockAIProvider(BaseAIProvider):
    """
    Deterministic mock provider for offline automated testing and local sandbox runs.
    Does not make external network requests.
    """
    name: str = "mock"

    async def triage(self, message: str) -> Dict[str, Any]:
        msg_lower = message.lower()

        # Deterministic triage heuristic with Hindi/Hinglish + English support
        critical_keywords = (
            "chest pain", "heart", "cardiac", "stroke", "unconscious",
            "seene", "seena", "chaati", "dil", "attack", "saans", "breath",
            "dum ghut", "behosh", "faint", "mirgi", "seizure", "lakwa", "paralysis"
        )
        high_keywords = (
            "bleed", "fracture", "accident", "trauma", "bone",
            "khoon", "takkar", "haddi", "tuut", "jal", "burn", "aag",
            "pregnan", "delivery", "prasav", "labour", "labor",
            "bacha", "baby", "bacche", "vomit", "ulti", "dast", "dehydration"
        )

        if any(k in msg_lower for k in ("heart", "cardiac", "chest", "dil", "seene", "seena", "chaati", "attack")):
            return {
                "symptoms": ["chest pain", "acute cardiac distress"],
                "urgency": "critical",
                "urgency_score": 0.95,
                "specialty": "Cardiology",
            }
        elif any(k in msg_lower for k in ("stroke", "unconscious", "behosh", "faint", "mirgi", "lakwa", "paralysis")):
            return {
                "symptoms": ["neurological crisis", "acute loss of consciousness"],
                "urgency": "critical",
                "urgency_score": 0.95,
                "specialty": "Stroke & Neurology",
            }
        elif any(k in msg_lower for k in ("saans", "breath", "dum ghut", "oxygen", "ventilator")):
            return {
                "symptoms": ["respiratory distress", "severe hypoxia"],
                "urgency": "critical",
                "urgency_score": 0.95,
                "specialty": "Critical Care",
            }
        elif any(k in msg_lower for k in high_keywords):
            specialty = "Trauma"
            if any(k in msg_lower for k in ("jal", "burn", "aag")):
                specialty = "Burn Care"
            elif any(k in msg_lower for k in ("pregnan", "delivery", "prasav", "labour", "labor")):
                specialty = "Obstetrics & Maternity"
            elif any(k in msg_lower for k in ("bacha", "baby", "bacche")):
                specialty = "Pediatrics"

            return {
                "symptoms": ["urgent distress", "urgent clinical need"],
                "urgency": "high",
                "urgency_score": 0.75,
                "specialty": specialty,
            }
        else:
            return {
                "symptoms": ["general distress", "mild/moderate symptoms"],
                "urgency": "moderate",
                "urgency_score": 0.35,
                "specialty": "General Medicine",
            }


class UnconfiguredAIProvider(BaseAIProvider):
    """
    Fallback provider when no active provider is enabled.
    """
    name: str = "unconfigured"

    async def triage(self, message: str) -> Dict[str, Any]:
        raise AIProviderNotConfiguredError(
            "AI triage provider is disabled or unconfigured in this environment."
        )


def get_ai_provider(provider_type: Optional[str] = None) -> BaseAIProvider:
    """
    Factory resolving active AI provider instance based on settings or explicit override.
    """
    settings = get_settings()
    selected = (provider_type or settings.AI_PROVIDER or "sokt").lower().strip()

    if selected == "mock":
        return MockAIProvider()
    elif selected == "sokt":
        return SoktAIProvider()
    elif selected in ("none", "unconfigured", "disabled", ""):
        return UnconfiguredAIProvider()
    else:
        raise AIProviderNotConfiguredError(f"Unsupported AI provider type: '{selected}'")
