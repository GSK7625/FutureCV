"""Unit tests for internal API key authentication."""

from unittest.mock import patch

from fastapi import HTTPException
import pytest

from app.api.middleware.internal_auth import verify_internal_api_key
from app.core.config import Settings


def test_verify_internal_api_key_valid():
    """Valid API key matches and does not raise."""
    test_settings = Settings(INTERNAL_API_KEY="my-secret-token", ENV="development")
    with patch("app.api.middleware.internal_auth.get_settings", return_value=test_settings):
        # Should not raise exception
        verify_internal_api_key(x_internal_api_key="my-secret-token")


def test_verify_internal_api_key_invalid():
    """Invalid API key raises 401 HTTPException."""
    test_settings = Settings(INTERNAL_API_KEY="my-secret-token", ENV="development")
    with patch("app.api.middleware.internal_auth.get_settings", return_value=test_settings):
        with pytest.raises(HTTPException) as exc_info:
            verify_internal_api_key(x_internal_api_key="wrong-token")
        assert exc_info.value.status_code == 401


def test_verify_internal_api_key_missing():
    """Missing API key raises 401 HTTPException when key is required."""
    test_settings = Settings(INTERNAL_API_KEY="my-secret-token", ENV="development")
    with patch("app.api.middleware.internal_auth.get_settings", return_value=test_settings):
        with pytest.raises(HTTPException) as exc_info:
            verify_internal_api_key(x_internal_api_key=None)
        assert exc_info.value.status_code == 401


def test_verify_internal_api_key_dev_unconfigured():
    """Unconfigured key in development mode permits requests."""
    test_settings = Settings(INTERNAL_API_KEY="", ENV="development")
    with patch("app.api.middleware.internal_auth.get_settings", return_value=test_settings):
        verify_internal_api_key(x_internal_api_key=None)


def test_verify_internal_api_key_prod_unconfigured_fails_closed():
    """Unconfigured key in production mode rejects with 500 configuration error."""
    test_settings = Settings(INTERNAL_API_KEY="", ENV="production")
    with patch("app.api.middleware.internal_auth.get_settings", return_value=test_settings):
        with pytest.raises(HTTPException) as exc_info:
            verify_internal_api_key(x_internal_api_key=None)
        assert exc_info.value.status_code == 500

