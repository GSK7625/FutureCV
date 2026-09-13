"""
Semantic text representation builders for CVs and Job Postings.

PRIVACY & PII HANDLING POLICY:
- Dedicated candidate identity fields (full_name, email, phone) are strictly excluded.
- Free-text fields are deterministically sanitized to redact obvious email addresses
  ([EMAIL_REDACTED]) and phone numbers ([PHONE_REDACTED]).
- Arbitrary person-name redaction from all free-text fields is NOT claimed or guaranteed
  without full Named Entity Recognition (NER).
"""

import re

from app.contracts.cv import StructuredCv
from app.contracts.job import StructuredJob

# Email matching pattern
EMAIL_REGEX = re.compile(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+")

# Phone number candidate pattern (validated via digit count 8..15)
PHONE_CANDIDATE_REGEX = re.compile(r"(?:\+?\d{1,4}[-.\s]?)?(?:\(?\d{2,4}\)?[-.\s]?)?\d{3,4}[-.\s]?\d{3,4}\b")


def _redact_phone_match(match: re.Match[str]) -> str:
    """Redact match if it contains between 8 and 15 digits (phone number range)."""
    raw = match.group(0)
    digits = re.sub(r"\D", "", raw)
    if 8 <= len(digits) <= 15:
        return "[PHONE_REDACTED]"
    return raw


def sanitize_semantic_text(text: str) -> str:
    """
    Deterministically redact obvious email addresses and phone numbers from free text.

    Preserves surrounding text structure while replacing privacy-sensitive tokens.
    """
    if not text:
        return ""

    redacted = EMAIL_REGEX.sub("[EMAIL_REDACTED]", text)
    redacted = PHONE_CANDIDATE_REGEX.sub(_redact_phone_match, redacted)
    return redacted.strip()


def build_cv_semantic_text(cv: StructuredCv) -> str:
    """
    Construct a sanitized, privacy-minimized semantic text representation of a candidate CV.

    STRICT PII EXCLUSIONS:
    - cv.full_name is NEVER included.
    - cv.email is NEVER included.
    - cv.phone is NEVER included.
    - Any candidate identifiers are NEVER included.

    INCLUDED SECTIONS:
    - Career summary (sanitized for free-text emails/phones)
    - Technical skills and technologies
    - Work experience (roles, companies, duration, sanitized descriptions)
    - Education background (degrees, institutions, fields of study)
    - Projects (names, sanitized descriptions, technologies)
    - Certificates
    """
    parts: list[str] = []

    # 1. Career summary
    if cv.career_summary and cv.career_summary.strip():
        parts.append(f"Tóm tắt sự nghiệp: {sanitize_semantic_text(cv.career_summary)}")

    # 2. Skills and technologies
    all_skills = list(dict.fromkeys(s.strip() for s in (cv.skills + cv.technologies) if s.strip()))
    if all_skills:
        parts.append(f"Kỹ năng chuyên môn: {', '.join(all_skills)}")

    # 3. Work experience
    if cv.work_experience:
        exp_lines: list[str] = []
        for exp in cv.work_experience:
            line_parts = [exp.job_title.strip()]
            if exp.company.strip():
                line_parts.append(f"tại {exp.company.strip()}")
            if exp.years_of_experience > 0:
                line_parts.append(f"({exp.years_of_experience:.1f} năm)")
            if exp.description.strip():
                line_parts.append(f"- {sanitize_semantic_text(exp.description)}")
            exp_lines.append(" ".join(line_parts))
        parts.append("Kinh nghiệm làm việc:\n" + "\n".join(exp_lines))

    # 4. Education
    if cv.education:
        edu_lines: list[str] = []
        for edu in cv.education:
            edu_parts = [edu.degree.strip()]
            if edu.field_of_study.strip():
                edu_parts.append(f"ngành {edu.field_of_study.strip()}")
            if edu.institution.strip():
                edu_parts.append(f"tại {edu.institution.strip()}")
            edu_lines.append(" ".join(edu_parts))
        parts.append("Học vấn: " + "; ".join(edu_lines))

    # 5. Projects
    if cv.projects:
        proj_lines: list[str] = []
        for proj in cv.projects:
            p_desc = f"- {sanitize_semantic_text(proj.description)}" if proj.description.strip() else ""
            p_tech = f"[Công nghệ: {', '.join(proj.technologies)}]" if proj.technologies else ""
            proj_lines.append(f"{proj.name.strip()} {p_tech} {p_desc}".strip())
        parts.append("Dự án thực tế:\n" + "\n".join(proj_lines))

    # 6. Certificates
    clean_certs = [c.strip() for c in cv.certificates if c.strip()]
    if clean_certs:
        parts.append(f"Chứng chỉ: {', '.join(clean_certs)}")

    return "\n\n".join(parts)


def build_job_semantic_text(job: StructuredJob) -> str:
    """Construct a sanitized semantic text representation of a Job Posting."""
    parts: list[str] = [f"Vị trí tuyển dụng: {job.title.strip()}"]

    if job.description.strip():
        parts.append(f"Mô tả công việc:\n{sanitize_semantic_text(job.description)}")

    if job.required_skills:
        parts.append(f"Kỹ năng bắt buộc: {', '.join(s.strip() for s in job.required_skills if s.strip())}")

    if job.preferred_skills:
        parts.append(f"Kỹ năng ưu tiên: {', '.join(s.strip() for s in job.preferred_skills if s.strip())}")

    if job.minimum_experience_years is not None and job.minimum_experience_years > 0:
        parts.append(f"Yêu cầu kinh nghiệm tối thiểu: {job.minimum_experience_years:.1f} năm")

    if job.education_requirement and job.education_requirement.strip():
        parts.append(f"Yêu cầu học vấn: {job.education_requirement.strip()}")

    if job.employment_type and job.employment_type.strip():
        parts.append(f"Hình thức làm việc: {job.employment_type.strip()}")

    return "\n\n".join(parts)
