"""Dependency injection providers for API routes and application services."""

from collections.abc import AsyncIterator, Generator

from fastapi import Depends, Request

from app.api.middleware.internal_auth import verify_internal_api_key
from app.application.career_assistant import CareerAssistantService
from app.application.cv_analyzer import CvAnalyzerService
from app.application.matching_service import MatchingService
from app.application.ranking_service import RankingService
from app.core.config import Settings, get_settings
from app.domain.matching.scoring import MATCHING_V1_ALGORITHM_VERSION
from app.infrastructure.documents.pdf_parser import PyMuPdfDocumentParser
from app.infrastructure.embeddings.factory import get_embedding_provider
from app.infrastructure.llm.factory import get_llm_provider
from app.observability.logging import correlation_id_ctx
from app.ports.document_parser import DocumentParserPort
from app.ports.embeddings import EmbeddingPort
from app.ports.llm import LlmPort


def get_settings_dep() -> Generator[Settings, None, None]:
    """Dependency provider for cached application settings."""
    yield get_settings()


def get_correlation_id() -> str:
    """Return the correlation ID for the current request context."""
    return correlation_id_ctx.get()


def get_document_parser(settings: Settings = Depends(get_settings_dep)) -> DocumentParserPort:
    """Provide document parser instance."""
    return PyMuPdfDocumentParser(settings=settings)


async def get_llm(
    request: Request = None,  # type: ignore[assignment]
    settings: Settings = Depends(get_settings_dep),
) -> AsyncIterator[LlmPort]:
    """
    Provide configured LLM implementation.

    When running within a FastAPI request context, reuses the app-scoped long-lived
    provider on app.state (enabling connection pooling and avoiding per-request TLS handshakes).
    Falls back to an ephemeral provider with clean lifecycle shutdown when invoked directly
    outside of application lifespan or when settings are dynamically overridden.
    """
    current_settings = settings if isinstance(settings, Settings) else get_settings()
    app_provider: LlmPort | None = getattr(request.app.state, "llm_provider", None) if request else None

    if app_provider is not None and app_provider.provider_name == current_settings.llm_provider:
        yield app_provider
    else:
        provider = get_llm_provider(settings=current_settings)
        try:
            yield provider
        finally:
            await provider.aclose()


async def get_embedding_provider_dep(
    settings: Settings = Depends(get_settings_dep),
) -> AsyncIterator[EmbeddingPort | None]:
    """Provide configured EmbeddingPort implementation with lifecycle cleanup when enabled."""
    if settings.matching_algorithm == MATCHING_V1_ALGORITHM_VERSION:
        provider = get_embedding_provider(settings=settings)
        try:
            yield provider
        finally:
            await provider.aclose()
    else:
        # For matching-v0: do not construct any embedding provider or network client
        yield None


def get_cv_analyzer_service(
    parser: DocumentParserPort = Depends(get_document_parser),
    llm: LlmPort = Depends(get_llm),
    settings: Settings = Depends(get_settings_dep),
) -> CvAnalyzerService:
    """Provide CV Analyzer service instance."""
    return CvAnalyzerService(parser=parser, llm=llm, settings=settings)


def get_matching_service(
    settings: Settings = Depends(get_settings_dep),
    llm: LlmPort = Depends(get_llm),
    embedding_provider: EmbeddingPort | None = Depends(get_embedding_provider_dep),
) -> MatchingService:
    """Provide Matching service instance."""
    return MatchingService(
        llm=llm,
        embedding_provider=embedding_provider,
        matching_algorithm=settings.matching_algorithm,
    )


def get_ranking_service(
    matching_service: MatchingService = Depends(get_matching_service),
) -> RankingService:
    """Provide Ranking service instance."""
    return RankingService(matching_service=matching_service)


def get_career_assistant_service(
    llm: LlmPort = Depends(get_llm),
) -> CareerAssistantService:
    """Provide Career Assistant service instance."""
    return CareerAssistantService(llm=llm)


__all__ = [
    "get_career_assistant_service",
    "get_correlation_id",
    "get_cv_analyzer_service",
    "get_document_parser",
    "get_embedding_provider_dep",
    "get_llm",
    "get_matching_service",
    "get_ranking_service",
    "get_settings_dep",
    "verify_internal_api_key",
]
