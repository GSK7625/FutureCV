"""FutureCV Backend AI Service main entrypoint."""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.exception_handlers import register_exception_handlers
from app.api.middleware.correlation_id import CorrelationIdMiddleware
from app.api.v1.health import router as health_router
from app.api.v1.router import api_v1_router
from app.core.config import get_settings
from app.observability.logging import get_logger, setup_logging

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan context for startup and shutdown procedures."""
    settings = get_settings()
    setup_logging(settings.log_level)

    logger.info(
        "Starting %s [env=%s, provider=%s, model=%s]",
        settings.app_name,
        settings.env,
        settings.llm_provider,
        settings.llm_model,
    )

    yield

    logger.info("Shutting down %s", settings.app_name)


def create_application() -> FastAPI:
    """Factory function to create and configure the FastAPI application."""
    settings = get_settings()

    app = FastAPI(
        title=settings.app_name,
        version="0.1.0",
        description="Stateless AI computation service for FutureCV (CV Analysis, Matching Engine, Career Assistant).",
        docs_url="/docs" if not settings.is_production else None,
        redoc_url="/redoc" if not settings.is_production else None,
        openapi_url="/openapi.json" if not settings.is_production else None,
        lifespan=lifespan,
    )

    # Middleware execution order in Starlette: last added is executed first
    # 1. CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # 2. Correlation ID
    app.add_middleware(CorrelationIdMiddleware)

    # Register centralized exception handlers
    register_exception_handlers(app)

    # Root health & ready probes (convenience for container orchestration)
    app.include_router(health_router, prefix="", tags=["Health"])

    # API v1 routes
    app.include_router(api_v1_router)

    return app


app = create_application()

