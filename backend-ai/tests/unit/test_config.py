"""Unit tests for Settings configuration."""

from pydantic import ValidationError
import pytest

from app.core.config import Settings


def test_default_settings():
    """Verify default settings initialization and hardened defaults."""
    settings = Settings()
    assert settings.app_name == "FutureCV Backend AI"
    assert settings.env in ["development", "test", "staging", "production"]
    assert settings.llm_provider == "mock"
    assert settings.port == 8000
    assert settings.llm_timeout_seconds == 60
    assert settings.llm_max_retries == 2
    assert settings.max_upload_size_bytes == 5 * 1024 * 1024
    assert settings.max_upload_size_bytes == 5242880


def test_development_and_test_with_mock_valid():
    """Verify development and test environments allow mock provider."""
    dev_settings = Settings(ENV="development", LLM_PROVIDER="mock")
    assert dev_settings.env == "development"
    assert dev_settings.llm_provider == "mock"

    test_settings = Settings(ENV="test", LLM_PROVIDER="mock")
    assert test_settings.is_test is True
    assert test_settings.llm_provider == "mock"


def test_production_mock_rejected():
    """Rule: Production environment must not permit mock LLM provider."""
    with pytest.raises(ValidationError) as exc_info:
        Settings(
            ENV="production",
            LLM_PROVIDER="mock",
            INTERNAL_API_KEY="valid-secret",
        )
    assert "Mock LLM provider is not permitted in production environment" in str(exc_info.value)


def test_production_missing_internal_api_key_rejected():
    """Rule: Production environment must require non-empty INTERNAL_API_KEY."""
    with pytest.raises(ValidationError) as exc_info:
        Settings(
            ENV="production",
            LLM_PROVIDER="openai",
            OPENAI_API_KEY="sk-test-key",
            INTERNAL_API_KEY="",
        )
    assert "INTERNAL_API_KEY must be configured in production environment" in str(exc_info.value)


def test_production_valid_configuration():
    """Verify valid production settings with real provider and internal key."""
    prod_settings = Settings(
        ENV="production",
        LLM_PROVIDER="openai",
        OPENAI_API_KEY="sk-prod-key",
        INTERNAL_API_KEY="prod-secret-auth-key",
    )
    assert prod_settings.is_production is True
    assert prod_settings.llm_provider == "openai"
    assert prod_settings.internal_api_key == "prod-secret-auth-key"


def test_openai_missing_api_key_rejected():
    """Rule: When LLM_PROVIDER=openai, OPENAI_API_KEY is strictly required."""
    with pytest.raises(ValidationError) as exc_info:
        Settings(
            ENV="development",
            LLM_PROVIDER="openai",
            OPENAI_API_KEY="",
        )
    assert "OPENAI_API_KEY must be configured when LLM_PROVIDER is 'openai'" in str(exc_info.value)


def test_unsupported_provider_rejected():
    """Rule: Providers outside supported Literal['mock', 'openai'] are rejected."""
    with pytest.raises(ValidationError):
        Settings(LLM_PROVIDER="gemini")

    with pytest.raises(ValidationError):
        Settings(LLM_PROVIDER="anthropic")

    with pytest.raises(ValidationError):
        Settings(LLM_PROVIDER="unknown-vendor")


def test_internal_api_key_strip():
    """Verify internal API key whitespace trimming."""
    settings = Settings(INTERNAL_API_KEY="  secret-key-123  ")
    assert settings.internal_api_key == "secret-key-123"
