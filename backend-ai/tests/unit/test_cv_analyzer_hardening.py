"""Unit tests for hardened CV Analyzer service, PII redaction, and qualitative feedback."""

from typing import TypeVar

from pydantic import BaseModel
import pytest

from app.application.cv_analyzer import CvAnalyzerService, CvQualitativeFeedback
from app.contracts.cv import StructuredCv
from app.core.config import Settings
from app.core.exceptions import DocumentParsingError
from app.infrastructure.llm.providers.mock_provider import MockLlmProvider
from app.ports.document_parser import DocumentParserPort

T = TypeVar("T", bound=BaseModel)


class DummyParser(DocumentParserPort):
    async def parse_pdf(self, file_bytes: bytes) -> str:
        return "Dummy extracted text"


class PiiInterceptingLlm(MockLlmProvider):
    """Spy LLM provider capturing prompts sent to generate_structured."""

    def __init__(self) -> None:
        self.captured_prompts: list[str] = []

    async def generate_structured(
        self,
        prompt: str,
        response_model: type[T],
        system_prompt: str | None = None,
        temperature: float = 0.1,
    ) -> T:
        self.captured_prompts.append(prompt)
        if response_model.__name__ == "CvQualitativeFeedback":
            return response_model.model_validate(
                {
                    "strengths": ["Strong architectural insight", "Thorough problem solving"],
                    "weaknesses": ["Needs more quantifiable project metrics"],
                    "improvement_suggestions": [
                        "Highlight business impact in experience bullets",
                        "Thorough problem solving",  # duplicate candidate
                    ],
                }
            )
        return await super().generate_structured(prompt, response_model, system_prompt, temperature)


@pytest.mark.asyncio
async def test_cv_analyzer_redacts_pii_before_qualitative_evaluation():
    """Verify full_name, email, and phone are redacted before the second-stage qualitative prompt."""
    spy_llm = PiiInterceptingLlm()
    service = CvAnalyzerService(parser=DummyParser(), llm=spy_llm)

    # Pre-structured CV containing sensitive PII
    raw_cv = (
        "Họ và tên: Nguyễn Văn A\n"
        "Email: secret_candidate@example.com\n"
        "Số điện thoại: 0901234567\n"
        "Kỹ năng: Python, FastAPI, Docker\n"
        "Tóm tắt: Senior Backend Engineer\n"
    )

    response = await service.analyze_text(raw_cv)

    # There should be 2 structured calls: 1 for CV extraction, 1 for qualitative critique
    assert len(spy_llm.captured_prompts) == 2
    qualitative_prompt = spy_llm.captured_prompts[1]

    # Assert PII is NOT present in the qualitative prompt
    assert "secret_candidate@example.com" not in qualitative_prompt
    assert "0901234567" not in qualitative_prompt
    assert "Nguyễn Văn A" not in qualitative_prompt

    # Assert delimiters are used
    assert "<<<BEGIN UNTRUSTED CANDIDATE CV>>>" in qualitative_prompt
    assert "<<<END UNTRUSTED CANDIDATE CV>>>" in qualitative_prompt

    # Assert metadata
    assert response.meta.algorithm_version == "cv-v0"
    assert response.meta.provider == "mock"
    assert response.meta.model == "mock-deterministic"


@pytest.mark.asyncio
async def test_cv_analyzer_merges_and_deduplicates_feedback_preserving_order():
    """Verify qualitative feedback merges with deterministic completeness items and deduplicates."""
    spy_llm = PiiInterceptingLlm()
    service = CvAnalyzerService(parser=DummyParser(), llm=spy_llm)

    response = await service.analyze_text("Python engineer with 5 years experience.")

    # Strengths should contain both structural notes and LLM feedback
    assert any("Strong architectural insight" in s for s in response.strengths)
    assert any("Thorough problem solving" in s for s in response.strengths)

    # Weaknesses should contain both structural notes and LLM feedback
    assert any("Needs more quantifiable project metrics" in w for w in response.weaknesses)

    # Deduplication check: no duplicate items in any list
    assert len(response.strengths) == len(set(response.strengths))
    assert len(response.weaknesses) == len(set(response.weaknesses))
    assert len(response.improvement_suggestions) == len(set(response.improvement_suggestions))


@pytest.mark.asyncio
async def test_cv_analyzer_rejects_oversized_raw_text():
    """Verify raw_text exceeding max_extracted_text_chars raises DocumentParsingError."""
    settings = Settings(MAX_EXTRACTED_TEXT_CHARS=50)
    service = CvAnalyzerService(parser=DummyParser(), llm=MockLlmProvider(), settings=settings)

    with pytest.raises(DocumentParsingError) as exc_info:
        await service.analyze_text("A" * 51)

    assert exc_info.value.error_code == "INVALID_DOCUMENT"
    assert exc_info.value.details["reason"] == "text_limit_exceeded"

