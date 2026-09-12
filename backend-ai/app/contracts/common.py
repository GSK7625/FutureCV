"""Common contract metadata and shared DTO structures."""

from pydantic import BaseModel, Field


class ResponseMeta(BaseModel):
    """Metadata attached to AI service responses."""

    algorithm_version: str = Field(default="1.0.0", description="Version of the algorithm")
    prompt_version: str = Field(default="v1", description="Prompt template version")
    provider: str = Field(default="mock", description="AI provider used for computation")
    model: str = Field(default="default", description="Model identifier used")
    processing_time_ms: float = Field(default=0.0, description="Execution time in milliseconds")
    correlation_id: str = Field(default="-", description="Distributed request correlation ID")

