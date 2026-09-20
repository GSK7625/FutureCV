"""Factory for creating LLM provider instances based on application settings."""

from app.core.config import Settings, get_settings
from app.infrastructure.llm.providers.mock_provider import MockLlmProvider
from app.infrastructure.llm.providers.openai_provider import OpenAiProvider
from app.ports.llm import LlmPort


def get_llm_provider(settings: Settings | None = None) -> LlmPort:
    """Return the configured LlmPort implementation without silent fallbacks."""
    current_settings = settings or get_settings()
    provider_name = current_settings.llm_provider

    if provider_name == "mock":
        return MockLlmProvider()

    if provider_name == "openai":
        return OpenAiProvider(current_settings)

    raise ValueError(f"Unsupported LLM provider '{provider_name}'")
