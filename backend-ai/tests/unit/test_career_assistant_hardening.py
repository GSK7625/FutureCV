"""Unit tests for Career Assistant prompt hardening and PII minimization."""

import pytest

from app.application.career_assistant import CareerAssistantService
from app.contracts.career import CareerAssistantContext, CareerAssistantRequest, ChatMessage
from app.contracts.cv import StructuredCv, WorkExperienceItem
from app.contracts.job import StructuredJob
from app.contracts.matching import MatchResult
from app.domain.matching.experience_match import calculate_total_experience_years
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


@pytest.mark.asyncio
async def test_career_assistant_experience_non_overlapping():
    """
    FIX 1: Sequential non-overlapping roles are summed correctly via canonical helper.
    Role 1: 2020-01 to 2021-01 (1.0 year)
    Role 2: 2022-01 to 2024-01 (2.0 years)
    Expected: 3.0 years
    """
    spy_llm = CareerPromptInterceptingLlm()
    service = CareerAssistantService(llm=spy_llm)

    experiences = [
        WorkExperienceItem(
            job_title="Junior Engineer",
            start_date="2020-01",
            end_date="2021-01",
            years_of_experience=1.0,
        ),
        WorkExperienceItem(
            job_title="Senior Engineer",
            start_date="2022-01",
            end_date="2024-01",
            years_of_experience=2.0,
        ),
    ]
    canonical_years = calculate_total_experience_years(experiences)
    assert canonical_years == 3.0

    cv = StructuredCv(
        career_summary="Software engineer with continuous learning mindset.",
        skills=["Python", "FastAPI"],
        work_experience=experiences,
    )
    req = CareerAssistantRequest(
        message="Review my experience.",
        context=CareerAssistantContext(cv=cv),
    )

    await service.chat(req)

    prompt = spy_llm.captured_prompts[0]
    assert f"Tổng số năm kinh nghiệm: {canonical_years:.1f} năm" in prompt
    assert "Tổng số năm kinh nghiệm: 3.0 năm" in prompt


@pytest.mark.asyncio
async def test_career_assistant_experience_overlapping_roles_deduplicated():
    """
    CRITICAL PROOF (FIX 1): Overlapping concurrent roles are NOT double-counted.
    Role A: 2022-01 -> 2024-01 (2.0 years)
    Role B: 2022-01 -> 2024-01 (2.0 years)
    Previous naive sum: 4.0 years.
    Canonical Matching helper: 2.0 years.
    Career Assistant MUST use canonical helper and report 2.0 years, NOT 4.0 years.
    """
    spy_llm = CareerPromptInterceptingLlm()
    service = CareerAssistantService(llm=spy_llm)

    experiences = [
        WorkExperienceItem(
            job_title="Backend Developer",
            company="Company Alpha",
            start_date="2022-01",
            end_date="2024-01",
            years_of_experience=2.0,
        ),
        WorkExperienceItem(
            job_title="Freelance Developer",
            company="Freelance Client",
            start_date="2022-01",
            end_date="2024-01",
            years_of_experience=2.0,
        ),
    ]
    canonical_years = calculate_total_experience_years(experiences)
    assert canonical_years == 2.0

    cv = StructuredCv(
        career_summary="Fullstack engineer.",
        skills=["Python"],
        work_experience=experiences,
    )
    req = CareerAssistantRequest(
        message="What career path fits my background?",
        context=CareerAssistantContext(cv=cv),
    )

    await service.chat(req)

    prompt = spy_llm.captured_prompts[0]
    # Verify canonical 2.0 years is reported, NOT 4.0 years
    assert f"Tổng số năm kinh nghiệm: {canonical_years:.1f} năm" in prompt
    assert "Tổng số năm kinh nghiệm: 2.0 năm" in prompt
    assert "Tổng số năm kinh nghiệm: 4.0 năm" not in prompt


@pytest.mark.asyncio
async def test_career_assistant_experience_mixed_dated_and_undated():
    """
    FIX 1: Conservative dated-timeline policy matches calculate_total_experience_years exactly.
    Dated role (2022-01 -> 2024-01 = 2.0 years) is authoritative over undated scalar role.
    """
    spy_llm = CareerPromptInterceptingLlm()
    service = CareerAssistantService(llm=spy_llm)

    experiences = [
        WorkExperienceItem(
            job_title="Backend Developer",
            start_date="2022-01",
            end_date="2024-01",
            years_of_experience=2.0,
        ),
        WorkExperienceItem(
            job_title="Part-time Consultant",
            years_of_experience=1.5,
        ),
    ]
    canonical_years = calculate_total_experience_years(experiences)
    assert canonical_years == 2.0

    cv = StructuredCv(work_experience=experiences)
    req = CareerAssistantRequest(
        message="How many years of experience do I have?",
        context=CareerAssistantContext(cv=cv),
    )

    await service.chat(req)

    prompt = spy_llm.captured_prompts[0]
    assert f"Tổng số năm kinh nghiệm: {canonical_years:.1f} năm" in prompt
    assert "Tổng số năm kinh nghiệm: 3.5 năm" not in prompt


@pytest.mark.asyncio
async def test_career_assistant_experience_no_experience():
    """FIX 1: When no experience is provided, experience line is safely omitted."""
    spy_llm = CareerPromptInterceptingLlm()
    service = CareerAssistantService(llm=spy_llm)

    cv = StructuredCv(
        career_summary="Fresh graduate.",
        skills=["Python"],
        work_experience=[],
    )
    req = CareerAssistantRequest(
        message="Can I apply for junior jobs?",
        context=CareerAssistantContext(cv=cv),
    )

    await service.chat(req)

    prompt = spy_llm.captured_prompts[0]
    assert "Tổng số năm kinh nghiệm:" not in prompt


@pytest.mark.asyncio
async def test_career_assistant_free_text_pii_redaction():
    """
    CRITICAL PROOF (FIX 2): Free-text fields with synthetic emails and phone numbers
    are deterministically redacted before entering the Career Assistant LLM prompt.
    """
    spy_llm = CareerPromptInterceptingLlm()
    service = CareerAssistantService(llm=spy_llm)

    synthetic_email_cv = "candidate.career@synthetic-test.vn"
    synthetic_phone_cv = "0912345678"
    synthetic_email_skill = "skill.author@opensource.org"
    synthetic_phone_skill = "+84 987 654 321"

    synthetic_email_job = "recruiter@hiring-company.com"
    synthetic_email_req_skill = "contact.req@company.com"
    synthetic_phone_pref_skill = "0901234567"

    synthetic_email_match = "evaluator@matching-service.internal"
    synthetic_phone_match = "0933445566"

    cv = StructuredCv(
        # Dedicated identity fields (MUST remain absent)
        full_name="Secret Identity Person",
        email="personal.untrusted@real-domain.com",
        phone="0999888777",
        # Free-text fields containing PII (MUST be redacted)
        career_summary=f"Experienced dev. Reach me at {synthetic_email_cv} or call {synthetic_phone_cv}.",
        skills=[
            f"Python (maintained by {synthetic_email_skill})",
            f"Docker (hotline {synthetic_phone_skill})",
        ],
        work_experience=[
            WorkExperienceItem(
                job_title="Lead Developer",
                company="Tech Co",
                description="Built core backend systems.",
                years_of_experience=3.0,
            )
        ],
    )

    job = StructuredJob(
        title=f"Backend Lead - inquiries to {synthetic_email_job}",
        required_skills=[f"FastAPI (questions to {synthetic_email_req_skill})"],
        preferred_skills=[f"Kubernetes (support line {synthetic_phone_pref_skill})"],
    )

    match_result = MatchResult(
        match_score=85,
        matched_skills=["Python"],
        missing_skills=["Kubernetes"],
        experience_comparison=f"Qualified 3 years. Verified by {synthetic_email_match}.",
        education_comparison=f"CS degree confirmed via phone {synthetic_phone_match}.",
    )

    context = CareerAssistantContext(
        candidate_id="SECRET_ID_XYZ",
        cv=cv,
        job=job,
        match_result=match_result,
    )

    req = CareerAssistantRequest(
        message="How should I prepare for interview?",
        history=[
            ChatMessage(role="user", content="Hi counselor"),
            ChatMessage(role="assistant", content="Hello, let's look at your profile."),
        ],
        context=context,
    )

    await service.chat(req)

    assert len(spy_llm.captured_prompts) == 1
    prompt = spy_llm.captured_prompts[0]

    # 1. Dedicated identity fields MUST NOT appear anywhere
    assert "Secret Identity Person" not in prompt
    assert "personal.untrusted@real-domain.com" not in prompt
    assert "0999888777" not in prompt
    assert "SECRET_ID_XYZ" not in prompt

    # 2. Raw synthetic email values inside free text MUST NOT appear
    assert synthetic_email_cv not in prompt
    assert synthetic_email_skill not in prompt
    assert synthetic_email_job not in prompt
    assert synthetic_email_req_skill not in prompt
    assert synthetic_email_match not in prompt

    # 3. Raw synthetic phone values inside free text MUST NOT appear
    assert synthetic_phone_cv not in prompt
    assert synthetic_phone_skill not in prompt
    assert synthetic_phone_pref_skill not in prompt
    assert synthetic_phone_match not in prompt

    # 4. Redaction tokens MUST be present in the prompt
    assert "[EMAIL_REDACTED]" in prompt
    assert "[PHONE_REDACTED]" in prompt


@pytest.mark.asyncio
async def test_career_assistant_includes_all_match_result_fields_and_score_integrity_rules():
    """Verify all 7 MatchResult fields enter the prompt and system prompt forbids fabricating scores."""
    captured_system_prompts: list[str | None] = []

    class CapturingSystemLlm(CareerPromptInterceptingLlm):
        async def generate_text(
            self,
            prompt: str,
            system_prompt: str | None = None,
            temperature: float = 0.3,
        ) -> str:
            captured_system_prompts.append(system_prompt)
            return await super().generate_text(prompt, system_prompt, temperature)

    spy_llm = CapturingSystemLlm()
    service = CareerAssistantService(llm=spy_llm)

    req = CareerAssistantRequest(
        message="Giải thích kết quả matching giúp tôi.",
        context=CareerAssistantContext(
            cv=StructuredCv(skills=["C#", ".NET"]),
            job=StructuredJob(title="Backend Engineer", required_skills=["C#", "Docker"]),
            match_result=MatchResult(
                match_score=74,
                matched_skills=["C#"],
                missing_skills=["Docker"],
                experience_comparison="3 năm kinh nghiệm vượt mức 2 năm.",
                education_comparison="Cử nhân CNTT đáp ứng yêu cầu.",
                project_domain_relevance="Dự án microservice liên quan trực tiếp.",
                match_explanation="Ứng viên đáp ứng tốt C#, cần bổ sung Docker.",
            ),
        ),
    )

    resp = await service.chat(req)
    prompt = spy_llm.captured_prompts[0]
    sys_prompt = captured_system_prompts[0] or ""

    assert "Điểm phù hợp hiện tại: 74/100" in prompt
    assert "Kỹ năng đã khớp: C#" in prompt
    assert "Kỹ năng còn thiếu: Docker" in prompt
    assert "Đánh giá kinh nghiệm: 3 năm kinh nghiệm vượt mức 2 năm." in prompt
    assert "Đánh giá học vấn: Cử nhân CNTT đáp ứng yêu cầu." in prompt
    assert "Độ phù hợp dự án: Dự án microservice liên quan trực tiếp." in prompt
    assert "Giải thích kết quả khớp: Ứng viên đáp ứng tốt C#, cần bổ sung Docker." in prompt
    assert "NEVER invent, estimate, guess, or fabricate a Match Score" in sys_prompt
    assert "74/100" in resp.reply


@pytest.mark.asyncio
async def test_career_assistant_without_match_result_blocks_fabricated_score_and_discloses_absence():
    """When CV+Job have no MatchResult, fabricated LLM scores are redacted and user is informed."""

    class HallucinatingScoreLlm(MockLlmProvider):
        async def generate_text(
            self,
            prompt: str,
            system_prompt: str | None = None,
            temperature: float = 0.3,
        ) -> str:
            return "Điểm phù hợp hiện tại của bạn là 88/100. Bạn nên học thêm Docker."

    service = CareerAssistantService(llm=HallucinatingScoreLlm())
    req = CareerAssistantRequest(
        message="Tôi phù hợp bao nhiêu điểm?",
        context=CareerAssistantContext(
            cv=StructuredCv(skills=["C#"]),
            job=StructuredJob(title="Backend Engineer", required_skills=["C#", "Docker"]),
            match_result=None,
        ),
    )

    resp = await service.chat(req)
    assert "88/100" not in resp.reply
    assert "không có điểm Matching chính thức" in resp.reply
    assert "Bạn nên học thêm Docker." in resp.reply


@pytest.mark.asyncio
async def test_career_assistant_realigns_contradictory_llm_score_to_authoritative_match_score():
    """If LLM alters the authoritative match_score, guardrail restores the official score."""

    class DriftedScoreLlm(MockLlmProvider):
        async def generate_text(
            self,
            prompt: str,
            system_prompt: str | None = None,
            temperature: float = 0.3,
        ) -> str:
            return "Điểm phù hợp của bạn là 95/100 nhờ có C#."

    service = CareerAssistantService(llm=DriftedScoreLlm())
    req = CareerAssistantRequest(
        message="Điểm của tôi là bao nhiêu?",
        context=CareerAssistantContext(
            cv=StructuredCv(skills=["C#"]),
            job=StructuredJob(title="Backend Engineer", required_skills=["C#", "Docker", "Kubernetes"]),
            match_result=MatchResult(match_score=42, matched_skills=["C#"], missing_skills=["Docker", "Kubernetes"]),
        ),
    )

    resp = await service.chat(req)
    assert "95/100" not in resp.reply
    assert "42/100" in resp.reply


@pytest.mark.asyncio
async def test_career_assistant_includes_enriched_cv_and_evaluation_and_redacts_pii():
    """Verify enriched CV fields and CvEvaluation enter prompt while PII is redacted and missing fields omitted."""
    from app.contracts.career import CareerCvEvaluation
    from app.contracts.cv import EducationItem, ProjectItem

    spy_llm = CareerPromptInterceptingLlm()
    service = CareerAssistantService(llm=spy_llm)

    cv = StructuredCv(
        full_name="Hidden Candidate",
        email="hidden@test.vn",
        phone="0988111222",
        career_summary="Senior backend engineer.",
        skills=["Python", "FastAPI"],
        technologies=["Python", "Redis"],
        work_experience=[
            WorkExperienceItem(
                job_title="Tech Lead",
                company="FPT Software",
                start_date="2022-01",
                end_date="2025-01",
                years_of_experience=3.0,
                description="Led API team; contact lead@fpt.vn or 0911222333.",
            )
        ],
        education=[
            EducationItem(degree="Kỹ sư", institution="Bách Khoa", field_of_study="CNTT", graduation_year="2021")
        ],
        projects=[
            ProjectItem(name="FutureCV Core", description="AI matching service", technologies=["FastAPI", "Redis"])
        ],
        certificates=["AWS Certified Developer"],
    )
    cv_eval = CareerCvEvaluation(
        cv_score=87,
        strengths=["Kinh nghiệm FastAPI rõ ràng"],
        weaknesses=["Thiếu số liệu hiệu năng"],
        improvement_suggestions=["Bổ sung KPI giảm độ trễ"],
    )

    resp = await service.chat(
        CareerAssistantRequest(
            message="Phân tích CV giúp tôi.",
            context=CareerAssistantContext(candidate_id="CAND_SECRET_1", cv=cv, cv_evaluation=cv_eval),
        )
    )

    prompt = spy_llm.captured_prompts[0]
    assert "Hidden Candidate" not in prompt
    assert "hidden@test.vn" not in prompt
    assert "0988111222" not in prompt
    assert "CAND_SECRET_1" not in prompt
    assert "lead@fpt.vn" not in prompt
    assert "0911222333" not in prompt
    assert "[EMAIL_REDACTED]" in prompt
    assert "[PHONE_REDACTED]" in prompt

    assert "Tóm tắt định hướng: Senior backend engineer." in prompt
    assert "Kỹ năng ứng viên: Python, FastAPI" in prompt
    assert "Công nghệ sử dụng: Redis" in prompt
    assert "Tech Lead tại FPT Software" in prompt
    assert "Kỹ sư ngành CNTT tại Bách Khoa (2021)" in prompt
    assert "FutureCV Core [Công nghệ: FastAPI, Redis]" in prompt
    assert "Chứng chỉ: AWS Certified Developer" in prompt
    assert "Điểm đánh giá CV (AI CV Analyzer): 87/100" in prompt
    assert "Điểm mạnh CV: Kinh nghiệm FastAPI rõ ràng" in prompt
    assert "Điểm yếu CV: Thiếu số liệu hiệu năng" in prompt
    assert "Đề xuất cải thiện CV: Bổ sung KPI giảm độ trễ" in prompt
    assert "87/100" in resp.reply


@pytest.mark.asyncio
async def test_career_assistant_bounds_total_context_size():
    """Verify oversized CV and JD payloads are bounded within MAX_CAREER_CONTEXT_CHARS."""
    from app.application.career_assistant import _MAX_CAREER_CONTEXT_CHARS
    from app.contracts.cv import ProjectItem

    spy_llm = CareerPromptInterceptingLlm()
    service = CareerAssistantService(llm=spy_llm)

    cv = StructuredCv(
        career_summary="A" * 3500,
        skills=[f"Skill{i}" for i in range(50)],
        work_experience=[
            WorkExperienceItem(job_title=f"Role {i}", company="Corp", years_of_experience=1.0, description="X" * 2000)
            for i in range(15)
        ],
        projects=[ProjectItem(name=f"Project {i}", description="P" * 2000) for i in range(15)],
    )
    job = StructuredJob(title="Senior Engineer", description="J" * 10000, required_skills=["Python"])

    await service.chat(
        CareerAssistantRequest(
            message="Tư vấn giúp tôi.",
            context=CareerAssistantContext(cv=cv, job=job),
        )
    )

    prompt = spy_llm.captured_prompts[0]
    start = prompt.index("<<<BEGIN UNTRUSTED CAREER CONTEXT>>>") + len("<<<BEGIN UNTRUSTED CAREER CONTEXT>>>\n")
    end = prompt.index("<<<END UNTRUSTED CAREER CONTEXT>>>")
    context_block = prompt[start:end].strip()
    assert len(context_block) <= _MAX_CAREER_CONTEXT_CHARS


@pytest.mark.asyncio
async def test_career_assistant_five_mvp_workflows_with_mock_provider():
    """Verify all 5 MVP workflows produce structured responses, dynamic follow-ups, and English Cover Letter."""
    service = CareerAssistantService(llm=MockLlmProvider())
    cv = StructuredCv(
        career_summary="Backend engineer specializing in .NET APIs.",
        skills=["C#", ".NET", "PostgreSQL"],
        work_experience=[
            WorkExperienceItem(
                job_title="Backend Developer",
                company="Tech Corp",
                start_date="2022-01",
                end_date="2025-01",
                years_of_experience=3.0,
                description="Built payment APIs.",
            )
        ],
    )
    job = StructuredJob(
        title="Senior .NET Engineer",
        description="Build scalable microservices with Docker and Redis.",
        required_skills=["C#", ".NET", "Docker"],
        preferred_skills=["Redis"],
    )
    match_result = MatchResult(
        match_score=78,
        matched_skills=["C#", ".NET"],
        missing_skills=["Docker"],
        experience_comparison="3.0 năm phù hợp.",
        education_comparison="Cử nhân CNTT.",
        project_domain_relevance="Dự án thanh toán phù hợp.",
        match_explanation="Đáp ứng C#/.NET, cần bổ sung Docker.",
    )
    ctx = CareerAssistantContext(cv=cv, job=job, match_result=match_result)

    # 1. Job Match Evaluation
    r1 = await service.chat(CareerAssistantRequest(message="Đánh giá mức độ phù hợp CV và công việc này.", context=ctx))
    assert "78/100" in r1.reply
    assert "Dữ liệu thực tế" in r1.reply
    assert "Đề xuất của AI" in r1.reply
    assert 2 <= len(r1.suggested_followups) <= 3

    # 2. Skill Gap Analysis
    r2 = await service.chat(
        CareerAssistantRequest(message="Phân tích kỹ năng còn thiếu và cách cải thiện.", context=ctx)
    )
    assert "Docker" in r2.reply
    assert "Dữ liệu thực tế" in r2.reply
    assert 2 <= len(r2.suggested_followups) <= 3

    # 3. Rewrite Career Summary
    r3 = await service.chat(
        CareerAssistantRequest(message="Viết lại Career Summary dựa trên kinh nghiệm thực tế của tôi.", context=ctx)
    )
    assert "Dữ liệu thực tế" in r3.reply
    assert "Đề xuất của AI" in r3.reply
    assert "C#" in r3.reply
    assert 2 <= len(r3.suggested_followups) <= 3

    # 4a. Cover Letter (Vietnamese)
    r4_vi = await service.chat(
        CareerAssistantRequest(message="Viết Cover Letter cá nhân hóa cho vị trí này.", context=ctx)
    )
    assert "Kính gửi" in r4_vi.reply
    assert "Senior .NET Engineer" in r4_vi.reply
    assert 2 <= len(r4_vi.suggested_followups) <= 3

    # 4b. Cover Letter (English)
    r4_en = await service.chat(
        CareerAssistantRequest(message="Hãy viết Cover Letter bằng tiếng Anh cho vị trí này.", context=ctx)
    )
    assert "Dear Hiring Manager" in r4_en.reply
    assert "Senior .NET Engineer" in r4_en.reply
    assert 2 <= len(r4_en.suggested_followups) <= 3

    # 5. Learning & Career Roadmap
    r5 = await service.chat(
        CareerAssistantRequest(message="Xây dựng lộ trình học tập và phát triển nghề nghiệp cho tôi.", context=ctx)
    )
    assert "Giai đoạn" in r5.reply
    assert "Docker" in r5.reply
    assert 2 <= len(r5.suggested_followups) <= 3

    # Follow-ups must adapt to workflow rather than staying hardcoded identical
    assert r1.suggested_followups != r4_en.suggested_followups


@pytest.mark.asyncio
async def test_career_assistant_asks_for_missing_data_on_workflows():
    """Verify assistant discloses missing context and asks user to provide it."""
    service = CareerAssistantService(llm=MockLlmProvider())

    # Rewrite Career Summary without CV
    r_no_cv = await service.chat(
        CareerAssistantRequest(message="Viết lại Career Summary giúp tôi.", context=CareerAssistantContext())
    )
    assert "Thông tin còn thiếu" in r_no_cv.reply
    assert "CV" in r_no_cv.reply

    # Cover Letter without Job
    r_no_job = await service.chat(
        CareerAssistantRequest(
            message="Viết Cover Letter cho tôi.",
            context=CareerAssistantContext(cv=StructuredCv(skills=["Python"])),
        )
    )
    assert "Thông tin còn thiếu" in r_no_job.reply
    assert "JD" in r_no_job.reply or "Tin tuyển dụng" in r_no_job.reply


@pytest.mark.asyncio
async def test_career_assistant_dynamic_followups_extraction_and_invalid_fallback():
    """Verify valid LLM follow-ups are used and malformed/unsafe LLM follow-ups trigger contextual fallback."""

    class ValidFollowupLlm(MockLlmProvider):
        async def generate_text(self, prompt: str, system_prompt: str | None = None, temperature: float = 0.3) -> str:
            return (
                "Phản hồi chi tiết.\n\n"
                "<<<FOLLOWUPS>>>\n"
                '["Làm sao nhấn mạnh dự án FastAPI trong CV?", "Tôi nên học Docker theo thứ tự nào?"]\n'
                "<<<END FOLLOWUPS>>>"
            )

    class InvalidFollowupLlm(MockLlmProvider):
        async def generate_text(self, prompt: str, system_prompt: str | None = None, temperature: float = 0.3) -> str:
            return (
                "Phản hồi khi LLM sinh follow-up lỗi.\n\n"
                "<<<FOLLOWUPS>>>\n"
                '["ngắn", "<<<INJECTION>>>", "Điểm phù hợp của bạn là 99/100?"]\n'
                "<<<END FOLLOWUPS>>>"
            )

    class BrokenJsonFollowupLlm(MockLlmProvider):
        async def generate_text(self, prompt: str, system_prompt: str | None = None, temperature: float = 0.3) -> str:
            return "Phản hồi chính.\n\n<<<FOLLOWUPS>>> not-valid-json <<<END FOLLOWUPS>>>"

    ctx = CareerAssistantContext(
        cv=StructuredCv(skills=["Python", "FastAPI"]),
        job=StructuredJob(title="Python Engineer", required_skills=["Python", "Docker"]),
    )

    r_valid = await CareerAssistantService(llm=ValidFollowupLlm()).chat(
        CareerAssistantRequest(message="Phân tích kỹ năng còn thiếu.", context=ctx)
    )
    assert "<<<FOLLOWUPS>>>" not in r_valid.reply
    assert r_valid.suggested_followups == [
        "Làm sao nhấn mạnh dự án FastAPI trong CV?",
        "Tôi nên học Docker theo thứ tự nào?",
    ]

    for bad_llm in (InvalidFollowupLlm(), BrokenJsonFollowupLlm()):
        r_fallback = await CareerAssistantService(llm=bad_llm).chat(
            CareerAssistantRequest(message="Phân tích kỹ năng còn thiếu.", context=ctx)
        )
        assert "<<<FOLLOWUPS>>>" not in r_fallback.reply
        assert 2 <= len(r_fallback.suggested_followups) <= 3
        assert all("<<<" not in q and "99/100" not in q for q in r_fallback.suggested_followups)
