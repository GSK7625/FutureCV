"""Factory for creating LLM provider instances based on application settings."""

from app.core.config import Settings, get_settings
from app.infrastructure.llm.providers.mock_provider import MockLlmProvider
from app.infrastructure.llm.providers.openai_provider import OpenAiProvider
from app.observability.logging import get_logger
from app.ports.llm import LlmPort

logger = get_logger(__name__)


def get_llm_provider(settings: Settings | None = None) -> LlmPort:
    """Return the configured LlmPort implementation."""
    current_settings = settings or get_settings()
    provider_name = current_settings.llm_provider.lower()

    if provider_name == "mock":
        return MockLlmProvider()

    if provider_name == "openai":
        if not current_settings.openai_api_key and not current_settings.is_production:
            logger.warning("OPENAI_API_KEY not set in %s mode. Using MockLlmProvider.", current_settings.env)
            return MockLlmProvider()
        return OpenAiProvider(current_settings)

    # Fallback to Mock in dev/test if unconfigured
    if not current_settings.is_production:
        logger.warning("Unsupported or unconfigured provider '%s'. Using MockLlmProvider.", provider_name)
        return MockLlmProvider()

    return OpenAiProvider(current_settings)

