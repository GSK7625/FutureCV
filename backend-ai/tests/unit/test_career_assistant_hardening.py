"""Unit tests for Career Assistant prompt hardening and PII minimization."""

from unittest.mock import AsyncMock
import pytest

from app.application.career_assistant import CareerAssistantService
from app.contracts.career import CareerAssistantContext, CareerAssistantRequest, ChatMessage
from app.contracts.cv import StructuredCv
from app.contracts.job import StructuredJob
from app.contracts.matching import MatchResult
from app.infrastructure.llm.providers.mock_provider import MockLlmProvider


class CareerPromptInterceptingLlm(MockLlmProvider):
    """Spy LLM provider capturing career assistant prompts."""

    def __init__(self) -> None:
        self.captured_prompts: list[str] = []

    async def generate_text(
        self,
        prompt: str,
        system_prompt: str | None = None,
        temperature: float = 0.3,
    ) -> str:
        self.captured_prompts.append(prompt)
        return await super().generate_text(prompt, system_prompt, temperature)


@pytest.mark.asyncio
async def test_career_assistant_omits_candidate_id_and_pii_from_prompt():
    """Verify candidate_id, full_name, email, and phone are excluded from Career Assistant context."""
    spy_llm = CareerPromptInterceptingLlm()
    service = CareerAssistantService(llm=spy_llm)

    cv = StructuredCv(
        full_name="Le Van Secret",
        email="candidate_secret@futurecv.vn",
        phone="0988776655",
        career_summary="Looking for Cloud Architect role",
        skills=["AWS", "Docker", "Terraform"],
        work_experience=[{"job_title": "DevOps Lead", "years_of_experience": 5.0}],
    )
    job = StructuredJob(
        title="Senior Cloud Engineer",
        required_skills=["AWS", "Kubernetes"],
    )
    context = CareerAssistantContext(
        candidate_id="SECRET_CANDIDATE_ID_9999",
        cv=cv,
        job=job,
        match_result=MatchResult(
            match_score=75,
            matched_skills=["AWS"],
            missing_skills=["Kubernetes"],
            experience_comparison="Meets 5 years requirement",
            education_comparison="N/A",
            project_domain_relevance="Relevant cloud experience",
            match_explanation="Good match overall",
        ),
    )

    req = CareerAssistantRequest(
        message="What skills should I learn first to improve my score?",
        history=[
            ChatMessage(role="user", content="Hello assistant"),
            ChatMessage(role="assistant", content="Hello, how can I help?"),
        ],
        context=context,
    )

    response = await service.chat(req)

    assert len(spy_llm.captured_prompts) == 1
    prompt = spy_llm.captured_prompts[0]

    # Verify candidate_id and sensitive PII are absent
    assert "SECRET_CANDIDATE_ID_9999" not in prompt
    assert "candidate_secret@futurecv.vn" not in prompt
    assert "0988776655" not in prompt
    assert "Le Van Secret" not in prompt

    # Verify untrusted delimiters exist
    assert "<<<BEGIN UNTRUSTED CAREER CONTEXT>>>" in prompt
    assert "<<<END UNTRUSTED CAREER CONTEXT>>>" in prompt
    assert "<<<BEGIN UNTRUSTED CONVERSATION HISTORY>>>" in prompt
    assert "<<<END UNTRUSTED CONVERSATION HISTORY>>>" in prompt
    assert "<<<BEGIN UNTRUSTED USER QUERY>>>" in prompt
    assert "<<<END UNTRUSTED USER QUERY>>>" in prompt

    # Verify metadata
    assert response.meta.algorithm_version == "career-v0"
    assert response.meta.provider == "mock"
    assert response.meta.model == "mock-deterministic"

