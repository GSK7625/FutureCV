"""Unit tests for Settings configuration."""

from app.core.config import Settings


def test_default_settings():
    """Verify default settings initialization."""
    settings = Settings()
    assert settings.app_name == "FutureCV Backend AI"
    assert settings.env in ["development", "test", "staging", "production"]
    assert settings.port == 8000
    assert settings.llm_timeout_seconds == 60
    assert settings.llm_max_retries == 2
    assert settings.max_upload_size_bytes == 10 * 1024 * 1024


def test_production_environment_flag():
    """Verify is_production property behavior."""
    prod_settings = Settings(ENV="production")
    dev_settings = Settings(ENV="development")
    assert prod_settings.is_production is True
    assert dev_settings.is_production is False


def test_internal_api_key_strip():
    """Verify internal API key whitespace trimming."""
    settings = Settings(INTERNAL_API_KEY="  secret-key-123  ")
    assert settings.internal_api_key == "secret-key-123"

