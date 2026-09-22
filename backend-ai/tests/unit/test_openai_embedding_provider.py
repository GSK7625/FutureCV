"""Unit tests for OpenAiEmbeddingProvider resilience, retries, and order preservation (Task C)."""

import httpx
import pytest

from app.core.config import Settings
from app.core.exceptions import ProviderError, RateLimitExceededError
from app.infrastructure.embeddings.providers.openai_provider import OpenAiEmbeddingProvider


def test_openai_embedding_provider_metadata():
    """Verify OpenAiEmbeddingProvider returns configured model metadata."""
    settings = Settings(OPENAI_API_KEY="sk-test-key", EMBEDDING_MODEL="text-embedding-3-small")
    provider = OpenAiEmbeddingProvider(settings=settings)
    assert provider.provider_name == "openai"
    assert provider.model_name == "text-embedding-3-small"


async def test_openai_embedding_provider_reuses_client_and_aclose_shuts_it_down():
    """Verify client lifecycle: client is maintained and cleanly closed via aclose()."""
    settings = Settings(OPENAI_API_KEY="sk-test-key")
    provider = OpenAiEmbeddingProvider(settings=settings)

    client = provider._client
    assert client is not None
    assert not client.is_closed

    await provider.aclose()
    assert client.is_closed


async def test_openai_embedding_provider_success_preserves_order():
    """Verify successful response restores exact sequence order based on item index."""
    settings = Settings(OPENAI_API_KEY="sk-test-key")

    # Return items intentionally out of order to verify sorting by index
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            json={
                "data": [
                    {"index": 1, "embedding": [0.2, 0.3]},
                    {"index": 0, "embedding": [0.0, 0.1]},
                ]
            },
        )

    mock_client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    provider = OpenAiEmbeddingProvider(settings=settings, http_client=mock_client)

    vectors = await provider.embed_texts(["first", "second"])
    assert len(vectors) == 2
    # Verify index 0 vector is first, index 1 vector is second
    assert vectors[0] == [0.0, 0.1]
    assert vectors[1] == [0.2, 0.3]


async def test_openai_embedding_provider_retries_transient_500_and_succeeds():
    """Verify transient 500 error triggers retry and recovers on subsequent attempt."""
    settings = Settings(OPENAI_API_KEY="sk-test-key", LLM_MAX_RETRIES=2)
    attempt_count = 0
    sleep_calls: list[float] = []

    async def mock_sleep(duration: float) -> None:
        sleep_calls.append(duration)

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal attempt_count
        attempt_count += 1
        if attempt_count == 1:
            return httpx.Response(500, json={"error": "Server Error"})
        return httpx.Response(
            200,
            json={"data": [{"index": 0, "embedding": [0.5, 0.5]}]},
        )

    mock_client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    provider = OpenAiEmbeddingProvider(settings=settings, http_client=mock_client, sleep_func=mock_sleep)

    vectors = await provider.embed_texts(["test"])
    assert attempt_count == 2
    assert len(sleep_calls) == 1
    assert len(vectors) == 1
    assert vectors[0] == [0.5, 0.5]


async def test_openai_embedding_provider_retries_429_honoring_retry_after():
    """Verify 429 rate limit error retries and honors Retry-After header."""
    settings = Settings(OPENAI_API_KEY="sk-test-key", LLM_MAX_RETRIES=1)
    attempt_count = 0
    sleep_calls: list[float] = []

    async def mock_sleep(duration: float) -> None:
        sleep_calls.append(duration)

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal attempt_count
        attempt_count += 1
        return httpx.Response(429, headers={"Retry-After": "2.5"}, json={"error": "Rate limit exceeded"})

    mock_client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    provider = OpenAiEmbeddingProvider(settings=settings, http_client=mock_client, sleep_func=mock_sleep)

    with pytest.raises(RateLimitExceededError) as exc_info:
        await provider.embed_texts(["test"])

    assert attempt_count == 2
    assert sleep_calls == [2.5]
    assert "rate limit reached" in str(exc_info.value).lower()


async def test_openai_embedding_provider_permanent_400_not_retried():
    """Verify permanent 400 client error fails immediately without retrying."""
    settings = Settings(OPENAI_API_KEY="sk-test-key", LLM_MAX_RETRIES=2)
    attempt_count = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal attempt_count
        attempt_count += 1
        return httpx.Response(400, json={"error": "Bad Request: Invalid Model"})

    mock_client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    provider = OpenAiEmbeddingProvider(settings=settings, http_client=mock_client)

    with pytest.raises(ProviderError) as exc_info:
        await provider.embed_texts(["test"])

    # Strict invariant: exactly 1 attempt for permanent errors
    assert attempt_count == 1
    assert "rejected embedding request with status 400" in str(exc_info.value)


async def test_openai_embedding_provider_malformed_response_raises_provider_error():
    """Verify malformed JSON payload raises controlled ProviderError."""
    settings = Settings(OPENAI_API_KEY="sk-test-key")

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"unexpected_key": []})

    mock_client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    provider = OpenAiEmbeddingProvider(settings=settings, http_client=mock_client)

    with pytest.raises(ProviderError) as exc_info:
        await provider.embed_texts(["test"])

    assert "Malformed response structure from OpenAI Embeddings API" in str(exc_info.value)


async def test_openai_embedding_provider_missing_api_key_raises_provider_error():
    """Verify missing API key raises controlled ProviderError without network call."""
    settings = Settings(OPENAI_API_KEY="")
    provider = OpenAiEmbeddingProvider(settings=settings)

    with pytest.raises(ProviderError) as exc_info:
        await provider.embed_texts(["test"])

    assert "OpenAI API key is not configured" in str(exc_info.value)
