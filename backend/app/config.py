from functools import lru_cache
from pathlib import Path
from typing import List, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent
ENV_FILE = BACKEND_DIR / ".env"


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables and/or .env file.
    Only Phase 0 foundation settings are actively utilized.
    Future phase variables are defined as optional placeholders.
    """
    model_config = SettingsConfigDict(
        env_file=(str(ENV_FILE), ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Core Application Settings
    APP_NAME: str = "emergex-backend"
    ENVIRONMENT: str = "development"
    DEBUG: bool = False
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # CORS & Frontend Origins
    # Can be specified as comma-separated string or list of strings
    CORS_ALLOWED_ORIGINS: Union[str, List[str]] = [
        "http://localhost:3000",
        "http://localhost:5173",
    ]
    FRONTEND_URL: str = "http://localhost:3000"

    # Future Phase Placeholders (Optional in Phase 0/1)
    SUPABASE_URL: str | None = None
    SUPABASE_KEY: str | None = None
    GEMINI_API_KEY: str | None = None
    TWILIO_ACCOUNT_SID: str | None = None
    TWILIO_AUTH_TOKEN: str | None = None

    # Phase 2: AI Emergency Triage Configuration
    AI_PROVIDER: str = "sokt"
    AI_PROVIDER_URL: str | None = None
    AI_PROVIDER_API_KEY: str | None = None
    AI_PROVIDER_TIMEOUT: float = 8.0
    AI_TRIAGE_DISCLAIMER: str = (
        "This assessment is an automated emergency navigation aid and does not "
        "constitute a certified medical diagnosis. If you are experiencing a life-threatening "
        "emergency, call local emergency services immediately."
    )

    @field_validator("CORS_ALLOWED_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            # Split comma-separated string, strip whitespace and empty strings
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        elif isinstance(v, (list, tuple)):
            return [str(origin).strip() for origin in v if str(origin).strip()]
        return []


@lru_cache()
def get_settings() -> Settings:
    """
    Returns a cached instance of Settings.
    """
    return Settings()
