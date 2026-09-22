"""Application configuration management using Pydantic Settings."""

from functools import lru_cache
from typing import Literal

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables and .env file."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Application
    app_name: str = Field(default="FutureCV Backend AI", alias="APP_NAME")
    env: Literal["development", "test", "staging", "production"] = Field(
        default="development",
        alias="ENV",
    )

    # Server
    host: str = Field(default="127.0.0.1", alias="HOST")
    port: int = Field(default=8000, alias="PORT")

    # LLM Provider Configuration
    # Supported providers: "mock" (offline/deterministic) | "openai"
    llm_provider: Literal["mock", "openai"] = Field(
        default="mock",
        alias="LLM_PROVIDER",
    )
    llm_model: str = Field(default="gpt-4o-mini", alias="LLM_MODEL")

    # Provider API keys
    openai_api_key: str | None = Field(default=None, alias="OPENAI_API_KEY")

    # Internal Service Authentication (ASP.NET Core -> FastAPI)
    internal_api_key: str = Field(default="", alias="INTERNAL_API_KEY")

    # LLM Resilience
    llm_timeout_seconds: int = Field(default=60, alias="LLM_TIMEOUT_SECONDS", ge=5, le=300)
    llm_max_retries: int = Field(default=2, alias="LLM_MAX_RETRIES", ge=0, le=5)

    # Logging
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = Field(
        default="INFO",
        alias="LOG_LEVEL",
    )

    # Security & Document Constraints
    max_upload_size_bytes: int = Field(
        default=5 * 1024 * 1024,  # 5 MB (5,242,880 bytes)
        alias="MAX_UPLOAD_SIZE_BYTES",
    )
    max_pdf_pages: int = Field(default=20, alias="MAX_PDF_PAGES", ge=1, le=100)
    max_extracted_text_chars: int = Field(default=50_000, alias="MAX_EXTRACTED_TEXT_CHARS")

    @property
    def is_production(self) -> bool:
        """Return True if running in production environment."""
        return self.env == "production"

    @property
    def is_test(self) -> bool:
        """Return True if running in test environment."""
        return self.env == "test"

    @field_validator("internal_api_key")
    @classmethod
    def validate_internal_api_key(cls, v: str) -> str:
        """Strip whitespace from internal API key."""
        return v.strip()

    @model_validator(mode="after")
    def validate_environment_and_providers(self) -> "Settings":
        """Enforce production invariants and provider credential requirements."""
        # 1. Production + mock provider -> configuration error
        if self.is_production and self.llm_provider == "mock":
            raise ValueError("Mock LLM provider is not permitted in production environment")

        # 2. Production without INTERNAL_API_KEY -> configuration error
        if self.is_production and not self.internal_api_key:
            raise ValueError("INTERNAL_API_KEY must be configured in production environment")

        # 3. LLM_PROVIDER=openai without OPENAI_API_KEY -> configuration error
        if self.llm_provider == "openai" and not self.openai_api_key:
            raise ValueError("OPENAI_API_KEY must be configured when LLM_PROVIDER is 'openai'")

        return self


@lru_cache
def get_settings() -> Settings:
    """Return cached application settings instance."""
    return Settings()
