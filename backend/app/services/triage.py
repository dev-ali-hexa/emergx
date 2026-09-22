"""
Emergency AI Triage Service.
Coordinates between API requests, the active AI provider adapter, and response normalization.
"""

from typing import Any, Dict, List, Optional
from pydantic import ValidationError
from app.config import get_settings
from app.schemas.triage import TriageRequest, TriageResponse, UrgencyLevel
from app.services.ai_provider import BaseAIProvider, get_ai_provider
from app.services.exceptions import (
    AIProviderError,
    AIProviderNotConfiguredError,
    AITimeoutError,
    AIProviderHTTPError,
    AIProviderResponseError,
)


class TriageService:
    """
    Decoupled service handling emergency triage normalization and AI delegation.
    """

    def __init__(self, provider: Optional[BaseAIProvider] = None):
        self._provider = provider

    @property
    def provider(self) -> BaseAIProvider:
        if self._provider is None:
            self._provider = get_ai_provider()
        return self._provider

    async def triage_emergency(self, request: TriageRequest) -> TriageResponse:
        """
        Processes an emergency triage request:
        1. Submits validated input message to active AI provider.
        2. Validates and normalizes provider output into TriageResponse.
        3. Enforces medical disclaimer and controlled urgency levels.
        """
        settings = get_settings()

        # Step 1: Query the AI provider adapter
        raw_output = await self.provider.triage(request.message)

        # Step 2: Normalize and validate the output against our strict domain contract
        return self._normalize_output(
            raw_output=raw_output,
            provider_name=self.provider.name,
            default_disclaimer=settings.AI_TRIAGE_DISCLAIMER,
        )

    def _normalize_output(
        self,
        raw_output: Dict[str, Any],
        provider_name: str,
        default_disclaimer: str,
    ) -> TriageResponse:
        """
        Validates raw provider dictionary and maps into TriageResponse.
        Raises AIProviderResponseError if required fields are missing or invalid.
        """
        if not isinstance(raw_output, dict):
            raise AIProviderResponseError("AI provider did not return a valid dictionary.")

        # Extract urgency
        raw_urgency = raw_output.get("urgency")
        if not raw_urgency or not isinstance(raw_urgency, str):
            raise AIProviderResponseError("AI provider response missing required field: 'urgency'.")

        normalized_urgency_str = raw_urgency.lower().strip()
        try:
            urgency = UrgencyLevel(normalized_urgency_str)
        except ValueError:
            raise AIProviderResponseError(
                f"AI provider returned invalid urgency level: '{raw_urgency}'. "
                f"Must be one of: {[e.value for e in UrgencyLevel]}."
            )

        # Extract urgency score
        raw_score = raw_output.get("urgency_score")
        if raw_score is None:
            # Fallback based on validated urgency tier if score omitted
            score_map = {
                UrgencyLevel.CRITICAL: 0.95,
                UrgencyLevel.HIGH: 0.75,
                UrgencyLevel.MODERATE: 0.40,
            }
            urgency_score = score_map[urgency]
        else:
            try:
                urgency_score = float(raw_score)
                if not (0.0 <= urgency_score <= 1.0):
                    raise ValueError()
            except (ValueError, TypeError):
                raise AIProviderResponseError(
                    f"AI provider returned invalid urgency_score: '{raw_score}'. Must be a float between 0.0 and 1.0."
                )

        # Extract specialty
        specialty = raw_output.get("specialty")
        if not specialty or not isinstance(specialty, str) or not specialty.strip():
            raise AIProviderResponseError("AI provider response missing required field: 'specialty'.")
        specialty = specialty.strip()

        # Extract symptoms list
        raw_symptoms = raw_output.get("symptoms", [])
        if isinstance(raw_symptoms, list):
            symptoms = [str(s).strip() for s in raw_symptoms if str(s).strip()]
        elif isinstance(raw_symptoms, str) and raw_symptoms.strip():
            symptoms = [s.strip() for s in raw_symptoms.split(",") if s.strip()]
        else:
            symptoms = []

        # Enforce non-diagnostic medical disclaimer
        disclaimer = raw_output.get("disclaimer") or default_disclaimer

        try:
            return TriageResponse(
                symptoms=symptoms,
                urgency=urgency,
                urgency_score=urgency_score,
                specialty=specialty,
                disclaimer=disclaimer,
                provider=provider_name,
            )
        except ValidationError as val_err:
            raise AIProviderResponseError(
                f"Failed to normalize AI provider output: {val_err.errors()}"
            ) from val_err
