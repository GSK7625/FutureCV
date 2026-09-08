"""OpenAI LLM provider adapter using httpx async client."""

import json
from typing import Any, TypeVar

import httpx
from pydantic import BaseModel, ValidationError

from app.core.config import Settings, get_settings
from app.core.exceptions import ProviderError, RateLimitExceededError
from app.observability.logging import get_logger
from app.ports.llm import LlmPort

logger = get_logger(__name__)

T = TypeVar("T", bound=BaseModel)


class OpenAiProvider(LlmPort):
    """OpenAI API provider adapter with resilient timeouts and retries."""

    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        self.api_key = self.settings.openai_api_key
        self.model = self.settings.llm_model or "gpt-4o-mini"
        self.timeout = float(self.settings.llm_timeout_seconds)
        self.max_retries = self.settings.llm_max_retries
        self.base_url = "https://api.openai.com/v1/chat/completions"

    def _ensure_api_key(self) -> str:
        """Validate presence of OpenAI API key."""
        if not self.api_key:
            raise ProviderError("OpenAI API key is not configured in environment", provider="openai")
        return self.api_key

    async def _post_chat_completion(self, payload: dict[str, Any]) -> dict[str, Any]:
        """Execute chat completion request with bounded retries."""
        api_key = self._ensure_api_key()
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

        last_error: Exception | None = None
        for attempt in range(self.max_retries + 1):
            try:
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    response = await client.post(self.base_url, headers=headers, json=payload)

                    if response.status_code == 429:
                        raise RateLimitExceededError("OpenAI rate limit reached")

                    if response.status_code >= 400:
                        logger.warning(
                            "OpenAI request failed (status=%d, attempt=%d/%d)",
                            response.status_code,
                            attempt + 1,
                            self.max_retries + 1,
                        )
                        raise ProviderError(
                            f"OpenAI service returned error status {response.status_code}",
                            provider="openai",
                        )

                    return response.json()  # type: ignore[no-any-return]

            except (httpx.RequestError, httpx.TimeoutException) as exc:
                last_error = exc
                logger.warning(
                    "Network error connecting to OpenAI (attempt %d/%d): %s",
                    attempt + 1,
                    self.max_retries + 1,
                    exc.__class__.__name__,
                )
                if attempt == self.max_retries:
                    break

        raise ProviderError(
            f"Failed to communicate with OpenAI after {self.max_retries + 1} attempts",
            provider="openai",
            details={"last_error_type": last_error.__class__.__name__ if last_error else "Unknown"},
        )

    async def generate_text(
        self,
        prompt: str,
        system_prompt: str | None = None,
        temperature: float = 0.3,
    ) -> str:
        """Generate unstructured text from OpenAI."""
        messages: list[dict[str, str]] = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
        }

        data = await self._post_chat_completion(payload)
        try:
            content: str = data["choices"][0]["message"]["content"]
            return content.strip()
        except (KeyError, IndexError) as exc:
            raise ProviderError("Malformed response structure from OpenAI", provider="openai") from exc

    async def generate_structured(
        self,
        prompt: str,
        response_model: type[T],
        system_prompt: str | None = None,
        temperature: float = 0.1,
    ) -> T:
        """Generate structured JSON and validate using Pydantic."""
        schema_json = json.dumps(response_model.model_json_schema())
        augmented_system = (
            (system_prompt or "")
            + f"\nYou MUST output strictly valid JSON matching this schema:\n{schema_json}"
        ).strip()

        messages = [
            {"role": "system", "content": augmented_system},
            {"role": "user", "content": prompt},
        ]

        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "response_format": {"type": "json_object"},
        }

        data = await self._post_chat_completion(payload)
        try:
            content: str = data["choices"][0]["message"]["content"]
            parsed_json = json.loads(content)
            return response_model.model_validate(parsed_json)
        except (KeyError, IndexError) as exc:
            raise ProviderError("Malformed choice structure from OpenAI", provider="openai") from exc
        except (json.JSONDecodeError, ValidationError) as exc:
            logger.warning("Failed to validate OpenAI output against schema: %s", exc)
            raise ProviderError(
                "AI model generated output that does not match required contract",
                provider="openai",
            ) from exc
