"""Dependency injection providers for API routes and application services."""

from collections.abc import AsyncIterator, Generator

from fastapi import Depends

from app.api.middleware.internal_auth import verify_internal_api_key
from app.application.career_assistant import CareerAssistantService
from app.application.cv_analyzer import CvAnalyzerService
from app.application.matching_service import MatchingService
from app.application.ranking_service import RankingService
from app.core.config import Settings, get_settings
from app.infrastructure.documents.pdf_parser import PyMuPdfDocumentParser
from app.infrastructure.llm.factory import get_llm_provider
from app.observability.logging import correlation_id_ctx
from app.ports.document_parser import DocumentParserPort
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


async def get_llm(settings: Settings = Depends(get_settings_dep)) -> AsyncIterator[LlmPort]:
    """Provide configured LLM implementation with lifecycle cleanup."""
    provider = get_llm_provider(settings=settings)
    try:
        yield provider
    finally:
        await provider.aclose()


def get_cv_analyzer_service(
    parser: DocumentParserPort = Depends(get_document_parser),
    llm: LlmPort = Depends(get_llm),
) -> CvAnalyzerService:
    """Provide CV Analyzer service instance."""
    return CvAnalyzerService(parser=parser, llm=llm)


def get_matching_service(
    llm: LlmPort = Depends(get_llm),
) -> MatchingService:
    """Provide Matching service instance."""
    return MatchingService(llm=llm)


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
    "get_llm",
    "get_matching_service",
    "get_ranking_service",
    "get_settings_dep",
    "verify_internal_api_key",
]
