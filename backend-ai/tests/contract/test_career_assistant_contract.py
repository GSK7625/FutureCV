"""Contract tests for Career Assistant and ErrorResponse."""

from app.contracts.career import CareerAssistantRequest, CareerAssistantResponse
from app.contracts.errors import ErrorResponse


def test_career_assistant_contract_fields():
    """Verify CareerAssistantRequest and CareerAssistantResponse shapes."""
    req_data = {
        "message": "Làm sao để cải thiện CV?",
        "history": [{"role": "user", "content": "Hello"}],
        "context": {
            "candidate_id": "cand-001",
        },
    }
    req = CareerAssistantRequest.model_validate(req_data)
    assert req.message == "Làm sao để cải thiện CV?"
    assert len(req.history) == 1

    resp_data = {
        "reply": "Bạn nên bổ sung các dự án thực tế.",
        "suggested_followups": ["Ví dụ dự án nào phù hợp?"],
        "meta": {"correlation_id": "cid-123"},
    }
    resp = CareerAssistantResponse.model_validate(resp_data)
    dumped = resp.model_dump()
    assert dumped["reply"] == "Bạn nên bổ sung các dự án thực tế."
    assert len(dumped["suggested_followups"]) == 1


def test_error_response_contract_fields():
    """Verify ErrorResponse contract matches standardized schema."""
    error_data = {
        "error_code": "INVALID_DOCUMENT",
        "message": "Cannot parse document",
        "details": {"reason": "corrupt_pdf"},
        "correlation_id": "err-cid-999",
    }
    err = ErrorResponse.model_validate(error_data)
    dumped = err.model_dump()
    assert dumped["error_code"] == "INVALID_DOCUMENT"
    assert dumped["correlation_id"] == "err-cid-999"


def test_career_assistant_accepts_full_match_result_context():
    """Verify CareerAssistantRequest accepts MatchResult with all 7 matching fields."""
    req_data = {
        "message": "Vì sao điểm phù hợp của tôi là 82?",
        "history": [],
        "context": {
            "cv": {
                "career_summary": "Backend engineer",
                "skills": ["Python", "FastAPI"],
                "work_experience": [],
            },
            "job": {
                "title": "Python Backend Engineer",
                "description": "Build FastAPI services",
                "required_skills": ["Python", "FastAPI", "Docker"],
                "preferred_skills": [],
            },
            "match_result": {
                "match_score": 82,
                "matched_skills": ["Python", "FastAPI"],
                "missing_skills": ["Docker"],
                "experience_comparison": "2.5 năm đáp ứng yêu cầu 2.0 năm.",
                "education_comparison": "Cử nhân CNTT phù hợp.",
                "project_domain_relevance": "Dự án API phù hợp.",
                "match_explanation": "Điểm phù hợp: 82/100.",
            },
        },
    }
    req = CareerAssistantRequest.model_validate(req_data)
    assert req.context is not None
    assert req.context.match_result is not None
    assert req.context.match_result.match_score == 82
    assert req.context.match_result.matched_skills == ["Python", "FastAPI"]
    assert req.context.match_result.missing_skills == ["Docker"]
    assert "2.5 năm" in req.context.match_result.experience_comparison
    assert "Cử nhân" in req.context.match_result.education_comparison
    assert "Dự án API" in req.context.match_result.project_domain_relevance
    assert req.context.match_result.match_explanation == "Điểm phù hợp: 82/100."


def test_career_assistant_accepts_cv_evaluation_context():
    """Verify CareerAssistantRequest accepts cv_evaluation and rejects invalid fields."""
    from pydantic import ValidationError
    import pytest

    req_data = {
        "message": "CV của tôi có điểm yếu gì?",
        "history": [],
        "context": {
            "cv": {
                "career_summary": "Backend developer",
                "skills": ["Python"],
                "work_experience": [{"job_title": "Backend Engineer", "company": "TechCo", "years_of_experience": 2.0}],
                "education": [{"degree": "Bachelor", "institution": "HUST", "field_of_study": "CS"}],
                "projects": [{"name": "API Gateway", "technologies": ["FastAPI"]}],
                "certificates": ["AWS SAA"],
            },
            "cv_evaluation": {
                "cv_score": 85,
                "strengths": ["Clear structure"],
                "weaknesses": ["Lacks impact numbers"],
                "improvement_suggestions": ["Quantify project metrics"],
            },
        },
    }
    req = CareerAssistantRequest.model_validate(req_data)
    assert req.context is not None
    assert req.context.cv_evaluation is not None
    assert req.context.cv_evaluation.cv_score == 85
    assert req.context.cv_evaluation.strengths == ["Clear structure"]
    assert req.context.cv_evaluation.weaknesses == ["Lacks impact numbers"]
    assert req.context.cv_evaluation.improvement_suggestions == ["Quantify project metrics"]

    with pytest.raises(ValidationError):
        CareerAssistantRequest.model_validate(
            {
                "message": "Invalid score",
                "context": {"cv_evaluation": {"cv_score": 120}},
            }
        )
