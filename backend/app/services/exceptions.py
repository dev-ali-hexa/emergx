"""
Domain exceptions for AI Triage service.
"""


class AIProviderError(Exception):
    """Base exception for all AI provider errors."""
    pass


class AIProviderNotConfiguredError(AIProviderError):
    """Raised when an AI provider URL or credentials are not configured."""
    pass


class AITimeoutError(AIProviderError):
    """Raised when an AI provider request exceeds the bounded timeout."""
    pass


class AIProviderHTTPError(AIProviderError):
    """Raised when an external AI provider responds with a non-2xx status code."""
    def __init__(self, status_code: int, message: str = "External AI provider HTTP failure"):
        super().__init__(f"{message} (HTTP {status_code})")
        self.status_code = status_code


class AIProviderResponseError(AIProviderError):
    """Raised when the AI provider returns an unparseable, incomplete, or invalid schema."""
    pass


class DatabaseServiceError(Exception):
    """Raised when a database query or connection failure occurs in service layers."""
    pass
