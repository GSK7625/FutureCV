"""Unit tests for Match Explanation constraints, temperature, score bands, and post-LLM validation."""

from unittest.mock import AsyncMock, MagicMock

import pytest

from app.application.matching_service import (
    MatchingService,
    _build_deterministic_explanation,
    _validate_match_explanation,
)
from app.domain.matching.demo_job import (
    DEMO_CV_HIGH,
    DEMO_CV_LOW,
    DEMO_JOB,
)
from app.ports.llm import LlmPort
from app.prompts.match_explanation_v1 import (
    FORBIDDEN_LOW_SCORE_PHRASES,
    get_score_band,
)

# ─────────────────────────────────────────────────────────────────────────────
# 1. Temperature is strictly 0.0
# ─────────────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_explanation_generation_uses_temperature_zero() -> None:
    """Verify LLM explanation generation is called with temperature=0.0."""
    mock_llm = MagicMock(spec=LlmPort)
    mock_llm.provider_name = "gemini"
    mock_llm.model_name = "gemini-2.5-flash-lite"
    mock_llm.generate_text = AsyncMock(return_value="Hồ sơ ứng viên phù hợp tốt với các yêu cầu kỹ thuật.")

    service = MatchingService(llm=mock_llm, matching_algorithm="matching-v0")
    await service.match(cv=DEMO_CV_HIGH, job=DEMO_JOB, generate_explanation=True)

    assert mock_llm.generate_text.call_count == 1
    call_kwargs = mock_llm.generate_text.call_args.kwargs
    assert call_kwargs.get("temperature") == 0.0


# ─────────────────────────────────────────────────────────────────────────────
# 2. Score Bands Categorization
# ─────────────────────────────────────────────────────────────────────────────


def test_score_bands_classification() -> None:
    """Verify score bands: 0-39 low, 40-59 partial, 60-79 good, 80-100 strong."""
    assert get_score_band(0) == ("low", "Mức phù hợp hiện tại thấp")
    assert get_score_band(25) == ("low", "Mức phù hợp hiện tại thấp")
    assert get_score_band(39) == ("low", "Mức phù hợp hiện tại thấp")

    assert get_score_band(40) == ("partial", "Mức phù hợp một phần")
    assert get_score_band(50) == ("partial", "Mức phù hợp một phần")
    assert get_score_band(59) == ("partial", "Mức phù hợp một phần")

    assert get_score_band(60) == ("good", "Mức phù hợp tốt")
    assert get_score_band(70) == ("good", "Mức phù hợp tốt")
    assert get_score_band(79) == ("good", "Mức phù hợp tốt")

    assert get_score_band(80) == ("strong", "Mức phù hợp cao")
    assert get_score_band(95) == ("strong", "Mức phù hợp cao")
    assert get_score_band(100) == ("strong", "Mức phù hợp cao")


# ─────────────────────────────────────────────────────────────────────────────
# 3. Post-LLM Validator: Reject over-praise on low scores
# ─────────────────────────────────────────────────────────────────────────────


def test_validate_match_explanation_rejects_forbidden_praise_on_low_scores() -> None:
    """Verify validator detects contradiction when low score contains over-praise phrases."""
    for phrase in FORBIDDEN_LOW_SCORE_PHRASES:
        contradictory_text = f"Ứng viên có điểm số này nhưng là một lựa chọn {phrase} cho công ty."
        assert _validate_match_explanation(contradictory_text, final_score=25) is False
        assert _validate_match_explanation(contradictory_text, final_score=39) is False

    # Objective assessment for low score passes
    objective_low = "Ứng viên hiện còn thiếu nhiều kỹ năng kỹ thuật cốt lõi và kinh nghiệm chưa đáp ứng."
    assert _validate_match_explanation(objective_low, final_score=25) is True

    # High score with praise passes without issue
    high_praise = "Ứng viên rất phù hợp và đáp ứng xuất sắc yêu cầu vị trí."
    assert _validate_match_explanation(high_praise, final_score=85) is True


@pytest.mark.asyncio
async def test_low_score_over_praise_triggers_deterministic_fallback() -> None:
    """DoD: Score thấp không có nhận xét khen quá mức; contradiction kích hoạt fallback."""
    mock_llm = MagicMock(spec=LlmPort)
    mock_llm.provider_name = "gemini"
    mock_llm.model_name = "gemini-2.5-flash-lite"
    # Contradictory praise on low CV (score is ~18 < 40)
    mock_llm.generate_text = AsyncMock(
        return_value="Ứng viên rất phù hợp với vị trí Senior Backend và là ứng viên lý tưởng."
    )

    service = MatchingService(llm=mock_llm, matching_algorithm="matching-v0")
    res = await service.match(cv=DEMO_CV_LOW, job=DEMO_JOB, generate_explanation=True)

    assert res.match_score < 40
    # Contradiction MUST be rejected
    assert res.meta.explanation_mode == "deterministic-fallback"
    assert "rất phù hợp" not in (res.match_explanation or "")
    assert "ứng viên lý tưởng" not in (res.match_explanation or "")
    # Fallback explanation includes proper low band label
    assert "Mức phù hợp hiện tại thấp." in (res.match_explanation or "")


# ─────────────────────────────────────────────────────────────────────────────
# 4. Standardized Deterministic Explanation Format
# ─────────────────────────────────────────────────────────────────────────────


def test_deterministic_explanation_format_adherence() -> None:
    """DoD: Fallback có định dạng Điểm phù hợp: 32/100... Mức phù hợp hiện tại thấp."""
    explanation = _build_deterministic_explanation(
        final_score=32,
        matched_skills=["Python"],
        missing_skills=["FastAPI", "Docker", "PostgreSQL", "REST API"],
        total_req_count=5,
        matched_req_count=1,
        exp_cmp="Ứng viên có 1.0 năm kinh nghiệm, thấp hơn yêu cầu 3.0 năm.",
        edu_cmp="Bằng cấp của ứng viên đáp ứng yêu cầu.",
    )

    assert "Điểm phù hợp: 32/100." in explanation
    assert "Ứng viên đáp ứng 1/5 kỹ năng bắt buộc." in explanation
    assert "Kỹ năng đáp ứng: Python." in explanation
    assert "Kỹ năng còn thiếu: FastAPI, Docker, PostgreSQL, REST API." in explanation
    assert "Mức phù hợp hiện tại thấp." in explanation


# ─────────────────────────────────────────────────────────────────────────────
# 5. Explanation Mode Provenance
# ─────────────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_explanation_mode_provenance() -> None:
    """DoD: explanation_mode phản ánh đúng llm, deterministic, deterministic-fallback."""
    # 1. generate_explanation=False -> deterministic
    llm_mock = MagicMock(spec=LlmPort)
    llm_mock.provider_name = "mock"
    llm_mock.model_name = "mock"
    service = MatchingService(llm=llm_mock, matching_algorithm="matching-v0")
    res_no_llm = await service.match(cv=DEMO_CV_HIGH, job=DEMO_JOB, generate_explanation=False)
    assert res_no_llm.meta.explanation_mode == "deterministic"
    assert res_no_llm.meta.llm_invoked is False

    # 2. generate_explanation=True + LLM success -> llm
    llm_mock.generate_text = AsyncMock(return_value="Hồ sơ ứng viên có độ phù hợp cao với yêu cầu kỹ thuật.")
    res_llm = await service.match(cv=DEMO_CV_HIGH, job=DEMO_JOB, generate_explanation=True)
    assert res_llm.meta.explanation_mode == "llm"
    assert res_llm.meta.llm_invoked is True

    # 3. generate_explanation=True + LLM error -> deterministic-fallback
    llm_mock.generate_text = AsyncMock(side_effect=RuntimeError("Timeout"))
    res_fallback = await service.match(cv=DEMO_CV_HIGH, job=DEMO_JOB, generate_explanation=True)
    assert res_fallback.meta.explanation_mode == "deterministic-fallback"
    assert res_fallback.meta.llm_invoked is True
