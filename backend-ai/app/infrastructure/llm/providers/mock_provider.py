"""Mock LLM provider for fast unit/integration testing and offline development."""

from typing import Any, TypeVar

from pydantic import BaseModel

from app.ports.llm import LlmPort

T = TypeVar("T", bound=BaseModel)


class MockLlmProvider(LlmPort):
    """Mock LLM implementation that generates realistic deterministic responses without network calls."""

    @property
    def provider_name(self) -> str:
        """Return provider identifier."""
        return "mock"

    @property
    def model_name(self) -> str:
        """Return mock model identifier."""
        return "mock-deterministic"

    async def aclose(self) -> None:
        """No-op cleanup for mock provider."""
        return

    async def generate_text(
        self,
        prompt: str,
        system_prompt: str | None = None,
        temperature: float = 0.3,
    ) -> str:
        """Generate mock response text based on prompt context."""
        if "CV Review" in prompt or "phản hồi" in prompt or "đánh giá" in prompt.lower():
            return "Ứng viên có nền tảng vững chắc về kỹ năng công nghệ và dự án thực tế."
        if "giải thích" in prompt.lower() or "phù hợp" in prompt.lower():
            return (
                "Ứng viên đáp ứng tốt các yêu cầu cốt lõi của vị trí tuyển dụng. "
                "Có kinh nghiệm thực tiễn và kỹ năng phù hợp với định hướng công việc."
            )
        return (
            "Chào bạn, tôi là FutureCV Career Assistant. Tôi sẵn sàng hỗ trợ giải đáp mọi thắc mắc sự nghiệp của bạn."
        )

    async def generate_structured(
        self,
        prompt: str,
        response_model: type[T],
        system_prompt: str | None = None,
        temperature: float = 0.1,
    ) -> T:
        """Generate valid generic default instance conforming to response_model."""
        mock_data: dict[str, Any] = {}
        for field_name, field_info in response_model.model_fields.items():
            annotation = field_info.annotation
            args = getattr(annotation, "__args__", ())
            origin = getattr(annotation, "__origin__", None)

            if annotation is str or (isinstance(annotation, type) and issubclass(annotation, str)):
                mock_data[field_name] = f"Mock {field_name}"
            elif annotation is int:
                mock_data[field_name] = 85
            elif annotation is float:
                mock_data[field_name] = 3.5
            elif origin is list:
                if args and (args[0] is str or (isinstance(args[0], type) and issubclass(args[0], str))):
                    mock_data[field_name] = [f"Mock {field_name} item 1", f"Mock {field_name} item 2"]
                else:
                    mock_data[field_name] = []
            elif origin is dict:
                mock_data[field_name] = {}
            else:
                mock_data[field_name] = None

        return response_model.model_validate(mock_data)
