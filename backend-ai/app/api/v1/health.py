"""Health check and readiness probe endpoints."""

from typing import Any

from fastapi import APIRouter, status
from fastapi.responses import JSONResponse

from app.core.config import get_settings

router = APIRouter(tags=["Health"])


@router.get("/health", status_code=status.HTTP_200_OK, summary="Liveness probe")
async def health_check() -> dict[str, str]:
    """
    Liveness probe endpoint.

    Must return 200 OK if the FastAPI process is alive and responding.
    MUST NOT call external LLMs, embeddings, or third-party services.
    """
    return {"status": "ok"}


@router.get("/ready", summary="Readiness probe")
async def readiness_probe() -> JSONResponse:
    """
    Readiness probe endpoint.

    Verifies configuration integrity and startup readiness.
    MUST NOT invoke live LLM inference.
    """
    settings = get_settings()
    checks: dict[str, Any] = {
        "configuration": "ok",
        "llm_provider": settings.llm_provider,
        "environment": settings.env,
    }

    # Structural check for provider API key
    if settings.llm_provider == "openai":
        has_key = bool(settings.openai_api_key)
        checks["provider_key_configured"] = has_key
    elif settings.llm_provider == "gemini":
        has_key = bool(settings.gemini_api_key)
        checks["provider_key_configured"] = has_key
    elif settings.llm_provider == "anthropic":
        has_key = bool(settings.anthropic_api_key)
        checks["provider_key_configured"] = has_key
    else:
        checks["provider_key_configured"] = True

    # In production, if required provider key is missing, report not ready (503)
    if settings.is_production and not checks.get("provider_key_configured", False):
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"status": "not_ready", "checks": checks},
        )

    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={"status": "ready", "checks": checks},
    )

