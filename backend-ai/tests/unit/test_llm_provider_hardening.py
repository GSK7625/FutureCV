"""Unit tests for OpenAI and Mock LLM providers resilience, retries, and lifecycle."""

from typing import Any
from unittest.mock import AsyncMock

import httpx
import pytest

from app.core.config import Settings
from app.core.exceptions import ProviderError, RateLimitExceededError
from app.infrastructure.llm.providers.mock_provider import MockLlmProvider
from app.infrastructure.llm.providers.openai_provider import OpenAiProvider


def test_mock_provider_metadata():
    """Verify MockLlmProvider returns correct metadata strings."""
    mock_llm = MockLlmProvider()
    assert mock_llm.provider_name == "mock"
    assert mock_llm.model_name == "mock-deterministic"


def test_openai_provider_metadata():
    """Verify OpenAiProvider returns configured model metadata."""
    settings = Settings(OPENAI_API_KEY="sk-test-key", LLM_MODEL="gpt-4o-mini")
    openai_llm = OpenAiProvider(settings=settings)
    assert openai_llm.provider_name == "openai"
    assert openai_llm.model_name == "gpt-4o-mini"


@pytest.mark.asyncio
async def test_openai_provider_reuses_client_and_aclose_shuts_it_down():
    """Verify single reusable AsyncClient is maintained and closed via aclose()."""
    settings = Settings(OPENAI_API_KEY="sk-test-key")
    provider = OpenAiProvider(settings=settings)

    client1 = provider._client
    assert client1 is not None
    assert not client1.is_closed

    await provider.aclose()
    assert client1.is_closed


@pytest.mark.asyncio
async def test_openai_retries_transient_500_server_error_and_eventually_fails():
    """Verify 500 error triggers bounded retries using backoff, then raises ProviderError."""
    attempt_count = 0
    sleep_calls: list[float] = []

    async def mock_sleep(duration: float) -> None:
        sleep_calls.append(duration)

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal attempt_count
        attempt_count += 1
        return httpx.Response(500, json={"error": "Internal Server Error"})

    mock_transport = httpx.MockTransport(handler)
    mock_client = httpx.AsyncClient(transport=mock_transport)

    settings = Settings(OPENAI_API_KEY="sk-test", LLM_MAX_RETRIES=2)
    provider = OpenAiProvider(settings=settings, http_client=mock_client, sleep_func=mock_sleep)

    with pytest.raises(ProviderError) as exc_info:
        await provider.generate_text(prompt="Test prompt")

    assert "transient error status 500" in str(exc_info.value)
    # Initial attempt + 2 retries = 3 attempts total
    assert attempt_count == 3
    assert len(sleep_calls) == 2


@pytest.mark.asyncio
async def test_openai_retries_transient_429_honoring_retry_after():
    """Verify 429 rate limit error respects Retry-After header and raises RateLimitExceededError."""
    attempt_count = 0
    sleep_calls: list[float] = []

    async def mock_sleep(duration: float) -> None:
        sleep_calls.append(duration)

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal attempt_count
        attempt_count += 1
        return httpx.Response(429, headers={"Retry-After": "1.5"}, json={"error": "Rate limit reached"})

    mock_transport = httpx.MockTransport(handler)
    mock_client = httpx.AsyncClient(transport=mock_transport)

    settings = Settings(OPENAI_API_KEY="sk-test", LLM_MAX_RETRIES=2)
    provider = OpenAiProvider(settings=settings, http_client=mock_client, sleep_func=mock_sleep)

    with pytest.raises(RateLimitExceededError):
        await provider.generate_text(prompt="Test prompt")

    assert attempt_count == 3
    # Both sleeps should have honored the 1.5s Retry-After header
    assert sleep_calls == [1.5, 1.5]


@pytest.mark.asyncio
async def test_openai_permanent_400_not_retried():
    """Rule: Permanent 400 Bad Request error must fail immediately without retrying."""
    attempt_count = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal attempt_count
        attempt_count += 1
        return httpx.Response(400, json={"error": "Invalid request parameters"})

    mock_transport = httpx.MockTransport(handler)
    mock_client = httpx.AsyncClient(transport=mock_transport)

    settings = Settings(OPENAI_API_KEY="sk-test", LLM_MAX_RETRIES=3)
    provider = OpenAiProvider(settings=settings, http_client=mock_client)

    with pytest.raises(ProviderError) as exc_info:
        await provider.generate_text(prompt="Test prompt")

    assert "permanent error status 400" in str(exc_info.value)
    # Strict assertion: Exactly 1 attempt made, zero retries
    assert attempt_count == 1


@pytest.mark.asyncio
async def test_openai_permanent_401_not_retried():
    """Rule: Permanent 401 Unauthorized error must fail immediately without retrying."""
    attempt_count = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal attempt_count
        attempt_count += 1
        return httpx.Response(401, json={"error": "Invalid API key"})

    mock_transport = httpx.MockTransport(handler)
    mock_client = httpx.AsyncClient(transport=mock_transport)

    settings = Settings(OPENAI_API_KEY="sk-test", LLM_MAX_RETRIES=3)
    provider = OpenAiProvider(settings=settings, http_client=mock_client)

    with pytest.raises(ProviderError) as exc_info:
        await provider.generate_text(prompt="Test prompt")

    assert "permanent error status 401" in str(exc_info.value)
    assert attempt_count == 1


@pytest.mark.asyncio
async def test_openai_network_error_retried_and_recovers():
    """Verify transient network connection failure retries and succeeds on subsequent attempt."""
    attempt_count = 0
    sleep_calls: list[float] = []

    async def mock_sleep(duration: float) -> None:
        sleep_calls.append(duration)

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal attempt_count
        attempt_count += 1
        if attempt_count == 1:
            raise httpx.ConnectError("Connection refused by peer")
        return httpx.Response(200, json={"choices": [{"message": {"content": "Successful response"}}]})

    mock_transport = httpx.MockTransport(handler)
    mock_client = httpx.AsyncClient(transport=mock_transport)

    settings = Settings(OPENAI_API_KEY="sk-test", LLM_MAX_RETRIES=2)
    provider = OpenAiProvider(settings=settings, http_client=mock_client, sleep_func=mock_sleep)

    result = await provider.generate_text(prompt="Hello")
    assert result == "Successful response"
    assert attempt_count == 2
    assert len(sleep_calls) == 1

