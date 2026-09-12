"""Contracts for Career Assistant conversational feature."""

from typing import Literal

from pydantic import BaseModel, Field

from app.contracts.common import ResponseMeta
from app.contracts.cv import StructuredCv
from app.contracts.job import StructuredJob
from app.contracts.matching import MatchResult


class ChatMessage(BaseModel):
    """Single turn in a career conversation."""

    role: Literal["user", "assistant", "system"] = Field(description="Sender role")
    content: str = Field(description="Message text")


class CareerAssistantContext(BaseModel):
    """Context provided by ASP.NET Core for the Career Assistant conversation."""

    candidate_id: str | None = Field(default=None, description="Candidate ID")
    cv: StructuredCv | None = Field(default=None, description="Current candidate structured CV")
    job: StructuredJob | None = Field(default=None, description="Job currently being viewed or targeted")
    match_result: MatchResult | None = Field(default=None, description="Pre-computed match result if available")


class CareerAssistantRequest(BaseModel):
    """Request to generate career guidance based on conversation history and candidate context."""

    message: str = Field(description="User question or query")
    history: list[ChatMessage] = Field(default_factory=list, description="Prior conversational messages")
    context: CareerAssistantContext | None = Field(default=None, description="Candidate profile and job context")


class CareerAssistantResponse(BaseModel):
    """Response from Career Assistant containing advisory reply and suggested next questions."""

    reply: str = Field(description="Assistant conversational response")
    suggested_followups: list[str] = Field(default_factory=list, description="Suggested follow-up questions or actions")
    meta: ResponseMeta = Field(default_factory=ResponseMeta, description="Execution metadata")

