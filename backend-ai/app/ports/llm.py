"""Port interface for Large Language Model generation and structured extraction."""

from abc import ABC, abstractmethod
from typing import TypeVar

from pydantic import BaseModel

T = TypeVar("T", bound=BaseModel)


class LlmPort(ABC):
    """Abstract interface for LLM operations."""

    @abstractmethod
    async def generate_text(
        self,
        prompt: str,
        system_prompt: str | None = None,
        temperature: float = 0.3,
    ) -> str:
        """Generate unstructured natural language text from a prompt."""
        raise NotImplementedError

    @abstractmethod
    async def generate_structured(
        self,
        prompt: str,
        response_model: type[T],
        system_prompt: str | None = None,
        temperature: float = 0.1,
    ) -> T:
        """Generate validated, structured output conforming to a Pydantic model."""
        raise NotImplementedError

