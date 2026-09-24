"""Unit tests for semantic representation builders and honest PII protection (Task D)."""

from app.application.semantic_representation import (
    build_cv_semantic_text,
    build_job_semantic_text,
    sanitize_semantic_text,
)
from app.contracts.cv import ProjectItem, StructuredCv, WorkExperienceItem
from app.contracts.job import StructuredJob


def test_dedicated_pii_fields_strictly_omitted_from_cv_semantic_text():
    """Rule: cv.full_name, cv.email, and cv.phone are NEVER included in semantic text."""
    cv = StructuredCv(
        full_name="Nguyen Van A",
        email="candidate.identity@example.com",
        phone="+84 912 345 678",
        career_summary="Senior Python Engineer with expertise in microservices.",
        skills=["Python", "FastAPI"],
    )

    text = build_cv_semantic_text(cv)

    assert "Nguyen Van A" not in text
    assert "candidate.identity@example.com" not in text
    assert "+84 912 345 678" not in text
    assert "Python" in text
    assert "FastAPI" in text


def test_free_text_email_and_phone_deterministic_redaction():
    """Rule: Email addresses and phone numbers appearing in free text are deterministically redacted."""
    raw_text = (
        "Liên hệ với tôi qua email hidden@example.com hoặc gọi số 0912345678. "
        "Số dự phòng quốc tế: +84 987 654 321 hoặc sếp cũ boss.lead@corp.org."
    )

    sanitized = sanitize_semantic_text(raw_text)

    assert "hidden@example.com" not in sanitized
    assert "boss.lead@corp.org" not in sanitized
    assert "0912345678" not in sanitized
    assert "+84 987 654 321" not in sanitized
    assert "[EMAIL_REDACTED]" in sanitized
    assert "[PHONE_REDACTED]" in sanitized


def test_free_text_pii_in_experience_and_project_descriptions_redacted():
    """Rule: PII injected inside work experience or project descriptions is redacted before embedding."""
    cv = StructuredCv(
        career_summary="Developer summary without PII.",
        skills=["Python"],
        work_experience=[
            WorkExperienceItem(
                job_title="Lead Developer",
                company="Tech Co",
                years_of_experience=3.0,
                description="Managed team. Emergency contact: lead.emergency@mail.com or 0909112233.",
            )
        ],
        projects=[
            ProjectItem(
                name="Customer Portal",
                description="Demo credentials available via demo.contact@app.vn or +84-903-123-456.",
                technologies=["Python", "PostgreSQL"],
            )
        ],
    )

    text = build_cv_semantic_text(cv)

    # Assert raw PII is omitted/redacted
    assert "lead.emergency@mail.com" not in text
    assert "0909112233" not in text
    assert "demo.contact@app.vn" not in text
    assert "+84-903-123-456" not in text
    # Assert redaction markers are present
    assert "[EMAIL_REDACTED]" in text
    assert "[PHONE_REDACTED]" in text


def test_build_job_semantic_text_structure_and_sanitization():
    """Verify job semantic representation structure and free-text sanitization."""
    job = StructuredJob(
        title="Senior Python Backend",
        description="Build scalable APIs. For inquiries contact hr.dept@company.com or 0944556677.",
        required_skills=["Python", "FastAPI"],
        preferred_skills=["Docker"],
        minimum_experience_years=4.0,
        education_requirement="Bachelor",
    )

    text = build_job_semantic_text(job)

    assert "Vị trí tuyển dụng: Senior Python Backend" in text
    assert "Python, FastAPI" in text
    assert "Docker" in text
    assert "4.0 năm" in text
    assert "Bachelor" in text
    assert "hr.dept@company.com" not in text
    assert "0944556677" not in text
    assert "[EMAIL_REDACTED]" in text
    assert "[PHONE_REDACTED]" in text
