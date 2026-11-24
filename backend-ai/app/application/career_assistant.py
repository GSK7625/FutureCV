"""Career Assistant application service orchestrating conversational career guidance."""

import json
import re
import time

from app.application.text_sanitization import sanitize_free_text
from app.contracts.career import CareerAssistantRequest, CareerAssistantResponse, CareerCvEvaluation
from app.contracts.common import ResponseMeta
from app.contracts.cv import StructuredCv
from app.contracts.matching import MatchResult
from app.domain.matching.experience_match import calculate_total_experience_years
from app.observability.logging import correlation_id_ctx, get_logger
from app.ports.llm import LlmPort
from app.prompts.career_v1 import (
    CAREER_ASSISTANT_SYSTEM_PROMPT_V1,
    CAREER_ASSISTANT_USER_TEMPLATE_V1,
)

logger = get_logger(__name__)

_MAX_CAREER_CONTEXT_CHARS = 12000
_MAX_ITEM_DESCRIPTION_CHARS = 400
_MAX_JOB_DESCRIPTION_CHARS = 3000
_MAX_REPLY_CHARS = 15500

_NO_OFFICIAL_MATCH_NOTICE = (
    "Lưu ý: Hiện không có điểm Matching chính thức cho cặp CV và việc làm này. "
    "Nội dung tư vấn dưới đây chỉ dựa trên thông tin CV và mô tả công việc."
)

_MATCH_SCORE_CLAIM_RE = re.compile(
    r"(?P<prefix>(?:điểm\s*(?:phù\s*hợp|matching|tương\s*thích)|độ\s*(?:phù\s*hợp|tương\s*thích)|"
    r"chỉ\s*số\s*phù\s*hợp|match\s*score)\s*(?:hiện\s*tại\s*)?(?:của\s*bạn\s*)?"
    r"(?:là|:|khoảng|ước\s*tính|tạm\s*tính|đạt)?\s*)"
    r"(?P<score>\d{1,3})\s*(?P<unit>/\s*100|%)",
    re.IGNORECASE,
)

_FOLLOWUPS_BLOCK_RE = re.compile(
    r"<<<FOLLOWUPS>>>\s*(?P<payload>.*?)\s*<<<END FOLLOWUPS>>>",
    re.DOTALL,
)
_STRAY_FOLLOWUPS_RE = re.compile(r"<<<FOLLOWUPS>>>.*$", re.DOTALL)


def _detect_career_intent(message: str) -> str:
    """Classify candidate inquiry into one of the 5 MVP counseling workflows."""
    lower = message.casefold()
    cover_kws = ("cover letter", "thư ứng tuyển", "thư xin việc", "motivation letter", "email ứng tuyển")
    if any(kw in lower for kw in cover_kws):
        return "cover_letter"
    summary_kws = (
        "career summary",
        "tóm tắt định hướng",
        "tóm tắt nghề nghiệp",
        "viết lại summary",
        "viết lại phần giới thiệu",
        "giới thiệu bản thân trong cv",
        "summary trong cv",
        "mục tiêu nghề nghiệp",
    )
    if any(kw in lower for kw in summary_kws):
        return "rewrite_career_summary"
    roadmap_kws = ("lộ trình", "roadmap", "học tập", "phát triển nghề nghiệp", "kế hoạch học", "học gì")
    if any(kw in lower for kw in roadmap_kws):
        return "learning_roadmap"
    gap_kws = (
        "kỹ năng còn thiếu",
        "thiếu kỹ năng",
        "skill gap",
        "bổ sung kỹ năng",
        "thiếu gì",
        "kỹ năng cần bổ sung",
    )
    if any(kw in lower for kw in gap_kws):
        return "skill_gap_analysis"
    match_kws = ("phù hợp", "match", "chấm điểm", "tương thích", "đánh giá cv", "đánh giá hồ sơ")
    if any(kw in lower for kw in match_kws):
        return "job_match_evaluation"
    return "general_counseling"


def _wants_english_cover_letter(message: str) -> bool:
    """Return True when candidate explicitly asks for an English Cover Letter."""
    lower = message.casefold()
    return any(kw in lower for kw in ("tiếng anh", "bằng anh", "english", "in english"))


def _build_workflow_instruction(intent: str, wants_english: bool, req: CareerAssistantRequest) -> str:
    """Build deterministic workflow guidance and missing-context disclosure instructions."""
    has_cv = bool(req.context and req.context.cv is not None)
    has_job = bool(req.context and req.context.job is not None)
    has_match = bool(req.context and req.context.match_result is not None)

    missing_parts: list[str] = []
    if intent in ("job_match_evaluation", "skill_gap_analysis", "cover_letter"):
        if not has_cv:
            missing_parts.append("CV đã phân tích")
        if not has_job:
            missing_parts.append("Tin tuyển dụng (JD)")
    elif intent == "rewrite_career_summary" and not has_cv:
        missing_parts.append("CV đã phân tích (hoặc kinh nghiệm, kỹ năng thực tế)")
    elif intent == "learning_roadmap" and not has_cv and not has_job:
        missing_parts.append("CV hoặc vị trí công việc mục tiêu")

    missing_hint = (
        f" Thiếu dữ liệu bắt buộc: {', '.join(missing_parts)}. "
        "Hãy nêu rõ dữ liệu còn thiếu và yêu cầu ứng viên bổ sung/chọn trước khi kết luận hoặc viết mẫu đầy đủ."
        if missing_parts
        else ""
    )

    if intent == "job_match_evaluation":
        match_hint = (
            "Sử dụng đúng MatchResult chính thức (điểm, kỹ năng khớp/thiếu, đánh giá kinh nghiệm/học vấn/dự án)."
            if has_match
            else (
                "Chưa có MatchResult chính thức, tuyệt đối không bịa điểm Matching; "
                "chỉ nhận xét định tính nếu có đủ CV và JD."
            )
        )
        return f"Nghiệp vụ 1 - Đánh giá mức độ phù hợp CV và Job. {match_hint}{missing_hint}"

    if intent == "skill_gap_analysis":
        return (
            "Nghiệp vụ 2 - Phân tích kỹ năng còn thiếu và cách cải thiện. "
            "Chỉ liệt kê kỹ năng thiếu từ MatchResult/JD đối chiếu với CV; "
            "đề xuất cách học hoặc cách làm nổi bật kinh nghiệm thật sẵn có."
            f"{missing_hint}"
        )

    if intent == "rewrite_career_summary":
        return (
            "Nghiệp vụ 3 - Viết lại Career Summary dựa trên kinh nghiệm thực tế. "
            "Chỉ sử dụng vị trí, số năm kinh nghiệm, kỹ năng và dự án thực sự có trong CV; "
            "không bịa số liệu hay thành tích mới."
            f"{missing_hint}"
        )

    if intent == "cover_letter":
        lang_rule = (
            "Ứng viên yêu cầu viết Cover Letter bằng TIẾNG ANH: hãy viết phần nội dung Cover Letter "
            "bằng tiếng Anh chuyên nghiệp, còn phần phân tích dữ liệu thực tế, lưu ý thiếu thông tin "
            "và câu hỏi gợi ý vẫn bằng tiếng Việt."
            if wants_english
            else "Viết Cover Letter cá nhân hóa bằng tiếng Việt dựa strictly vào CV và JD."
        )
        return f"Nghiệp vụ 4 - Viết Cover Letter cá nhân hóa theo CV và JD. {lang_rule}{missing_hint}"

    if intent == "learning_roadmap":
        return (
            "Nghiệp vụ 5 - Xây dựng lộ trình học tập và phát triển nghề nghiệp theo từng giai đoạn, "
            "từ nền tảng thực tế của ứng viên tới các kỹ năng còn thiếu của vị trí mục tiêu."
            f"{missing_hint}"
        )

    return f"Tư vấn nghề nghiệp tổng quát dựa trên ngữ cảnh đã cung cấp.{missing_hint}"


def _build_contextual_followups(
    intent: str,
    wants_english: bool,
    req: CareerAssistantRequest,
) -> list[str]:
    """Generate 2-3 context-aware Vietnamese follow-up questions as fallback."""
    cv = req.context.cv if req.context else None
    job = req.context.job if req.context else None
    match_result = req.context.match_result if req.context else None

    job_label = sanitize_free_text(job.title) if job and job.title else ""
    missing_skills = _sanitize_list(match_result.missing_skills) if match_result and match_result.missing_skills else []

    candidates: list[str] = []
    if cv is None and job is None:
        candidates = [
            "Tôi nên chuẩn bị những thông tin gì trong CV trước khi ứng tuyển?",
            "Làm sao để viết Career Summary nổi bật dù chưa có nhiều kinh nghiệm?",
            "Nếu chọn một CV và một vị trí cụ thể, trợ lý có thể hỗ trợ những gì?",
        ]
    elif intent == "job_match_evaluation":
        if missing_skills:
            top_missing = ", ".join(missing_skills[:2])
            candidates.append(f"Tôi nên bổ sung và chứng minh kỹ năng {top_missing} như thế nào?")
        else:
            candidates.append("Tôi cần cải thiện những kỹ năng hoặc phần nào trong CV để tăng độ phù hợp?")
        if cv is not None:
            candidates.append("Hãy viết lại Career Summary dựa trên kinh nghiệm thực tế trong CV của tôi.")
        if cv is not None and job is not None:
            target = f" cho vị trí {job_label}" if job_label else ""
            candidates.append(f"Hãy viết Cover Letter cá nhân hóa{target} từ CV của tôi.")
        candidates.append("Đề xuất cho tôi lộ trình học tập phù hợp với vị trí này.")
    elif intent == "skill_gap_analysis":
        target = f" cho vị trí {job_label}" if job_label else ""
        candidates = [
            f"Hãy xây dựng lộ trình học tập từng bước để bù đắp các kỹ năng còn thiếu{target}.",
            "Tôi nên cập nhật Career Summary như thế nào để làm nổi bật điểm mạnh hiện có?",
            f"Viết Cover Letter{target} giải thích khéo léo hướng phát triển kỹ năng của tôi.",
        ]
    elif intent == "rewrite_career_summary":
        target = f" vị trí {job_label}" if job_label else " mục tiêu nghề nghiệp của tôi"
        candidates = [
            f"Hãy viết Cover Letter cá nhân hóa cho{target} dựa trên Career Summary mới.",
            f"Với nền tảng hiện tại, tôi còn thiếu kỹ năng nào cho{target}?",
            "Đề xuất lộ trình phát triển chuyên môn tiếp theo phù hợp với kinh nghiệm của tôi.",
        ]
    elif intent == "cover_letter":
        if not wants_english:
            candidates.append("Hãy viết lại bản Cover Letter này bằng tiếng Anh chuyên nghiệp.")
        else:
            candidates.append("Hãy viết thêm một phiên bản Cover Letter bằng tiếng Việt ngắn gọn hơn.")
        candidates.append("Hãy viết lại Career Summary trong CV để đồng bộ với Cover Letter vừa tạo.")
        candidates.append("Tôi cần chuẩn bị câu trả lời phỏng vấn cho các điểm còn thiếu trong CV như thế nào?")
    elif intent == "learning_roadmap":
        target = f" vị trí {job_label}" if job_label else " mục tiêu này"
        candidates = [
            f"Tôi nên thực hành dự án mẫu nào để chứng minh các kỹ năng trong lộ trình cho{target}?",
            "Hãy phân tích kỹ năng nào cần ưu tiên học trước trong 4 tuần đầu.",
            "Viết lại Career Summary thể hiện định hướng phát triển nghề nghiệp hiện tại của tôi.",
        ]
    else:
        if cv is not None and job is not None:
            target = f" vị trí {job_label}" if job_label else "công việc đã chọn"
            candidates = [
                f"Đánh giá mức độ phù hợp giữa CV của tôi và {target}.",
                "Phân tích các kỹ năng còn thiếu và cách cải thiện cụ thể.",
                "Viết lại Career Summary hoặc Cover Letter phù hợp với vị trí này.",
            ]
        elif cv is not None:
            candidates = [
                "Hãy viết lại Career Summary dựa trên kinh nghiệm thực tế trong CV của tôi.",
                "Dựa trên đánh giá CV hiện tại, tôi nên sửa điểm nào trước?",
                "Xây dựng lộ trình phát triển kỹ năng tiếp theo từ nền tảng CV của tôi.",
            ]
        else:
            target = f" vị trí {job_label}" if job_label else "vị trí này"
            candidates = [
                f"Tôi cần chuẩn bị những kỹ năng cốt lõi nào để ứng tuyển {target}?",
                f"Xây dựng lộ trình học tập từng bước để đáp ứng yêu cầu của {target}.",
                "Nếu tôi chọn thêm CV đã phân tích, bạn có thể viết Cover Letter cá nhân hóa không?",
            ]

    seen = {req.message.strip().casefold()}
    for turn in req.history[-4:]:
        if turn.role == "user":
            seen.add(turn.content.strip().casefold())

    filtered: list[str] = []
    for item in candidates:
        clean_item = sanitize_free_text(item)
        if clean_item and clean_item.casefold() not in seen:
            seen.add(clean_item.casefold())
            filtered.append(_truncate_text(clean_item, 240))
        if len(filtered) == 3:
            break

    while len(filtered) < 2:
        fallback_q = (
            "Bạn muốn tôi phân tích sâu hơn phần nào trong CV của bạn?"
            if len(filtered) == 0
            else "Bạn có muốn tôi gợi ý lộ trình cải thiện kỹ năng tiếp theo không?"
        )
        filtered.append(fallback_q)

    return filtered[:3]


def _extract_reply_and_followups(
    raw_reply: str,
    intent: str,
    wants_english: bool,
    req: CareerAssistantRequest,
) -> tuple[str, list[str]]:
    """Extract reply body and validate dynamic follow-ups with deterministic fallback."""
    match_result = req.context.match_result if req.context else None
    extracted_followups: list[str] = []

    block_match = _FOLLOWUPS_BLOCK_RE.search(raw_reply)
    if block_match:
        payload = block_match.group("payload").strip()
        if payload.startswith("```"):
            lines = [line for line in payload.splitlines() if not line.strip().startswith("```")]
            payload = "\n".join(lines).strip()
        try:
            parsed = json.loads(payload)
            if isinstance(parsed, list):
                seen = {req.message.strip().casefold()}
                for item in parsed:
                    if not isinstance(item, str):
                        continue
                    cleaned = sanitize_free_text(item).strip()
                    if len(cleaned) < 8 or len(cleaned) > 240:
                        continue
                    if "<<<" in cleaned or ">>>" in cleaned:
                        continue
                    if match_result is None and _MATCH_SCORE_CLAIM_RE.search(cleaned):
                        continue
                    key = cleaned.casefold()
                    if key in seen:
                        continue
                    seen.add(key)
                    extracted_followups.append(cleaned)
                    if len(extracted_followups) == 3:
                        break
        except (ValueError, TypeError):
            extracted_followups = []

        reply_body = _FOLLOWUPS_BLOCK_RE.sub("", raw_reply).strip()
    else:
        reply_body = _STRAY_FOLLOWUPS_RE.sub("", raw_reply).strip()

    if not reply_body:
        reply_body = (
            "Tôi đã ghi nhận yêu cầu của bạn. "
            "Hãy cung cấp thêm thông tin CV hoặc công việc mục tiêu để tôi tư vấn chi tiết hơn."
        )

    if len(extracted_followups) < 2:
        fallback_followups = _build_contextual_followups(intent, wants_english, req)
        seen_existing = {q.casefold() for q in extracted_followups}
        for q in fallback_followups:
            if q.casefold() not in seen_existing:
                extracted_followups.append(q)
                seen_existing.add(q.casefold())
            if len(extracted_followups) == 3:
                break

    return _truncate_text(reply_body, _MAX_REPLY_CHARS), extracted_followups[:3]


def _enforce_match_score_guardrail(
    reply: str,
    match_result: MatchResult | None,
    has_cv_and_job: bool,
) -> str:
    """Prevent LLM-fabricated or altered Match Scores and ensure missing-score disclosure."""
    if match_result is None:

        def _redact_fabricated(match: re.Match[str]) -> str:
            return f"{match.group('prefix')}chưa có điểm Matching chính thức"

        sanitized_reply = _MATCH_SCORE_CLAIM_RE.sub(_redact_fabricated, reply)
        if has_cv_and_job and "không có điểm matching chính thức" not in sanitized_reply.casefold():
            sanitized_reply = f"{_NO_OFFICIAL_MATCH_NOTICE}\n\n{sanitized_reply}"
        return sanitized_reply

    authoritative_score = match_result.match_score

    def _align_score(match: re.Match[str]) -> str:
        cited = int(match.group("score"))
        if cited == authoritative_score:
            return match.group(0)
        return f"{match.group('prefix')}{authoritative_score}/100"

    return _MATCH_SCORE_CLAIM_RE.sub(_align_score, reply)


def _sanitize_list(items: list[str]) -> list[str]:
    """Sanitize non-empty string items deterministically."""
    cleaned: list[str] = []
    for item in items:
        if item and item.strip():
            sanitized = sanitize_free_text(item)
            if sanitized:
                cleaned.append(sanitized)
    return cleaned


def _truncate_text(text: str, max_len: int) -> str:
    """Bound long free-text blocks to keep prompt context concise."""
    if len(text) <= max_len:
        return text
    return text[: max_len - 3].rstrip() + "..."


def _append_cv_context(context_parts: list[str], cv: StructuredCv) -> None:
    """Append non-empty, sanitized, PII-free CV details to prompt context."""
    if cv.career_summary:
        clean_summary = sanitize_free_text(cv.career_summary)
        if clean_summary:
            context_parts.append(f"Tóm tắt định hướng: {clean_summary}")

    clean_skills = _sanitize_list(cv.skills)
    if clean_skills:
        context_parts.append(f"Kỹ năng ứng viên: {', '.join(clean_skills)}")

    skill_set = {s.casefold() for s in clean_skills}
    extra_techs = [t for t in _sanitize_list(cv.technologies) if t.casefold() not in skill_set]
    if extra_techs:
        context_parts.append(f"Công nghệ sử dụng: {', '.join(extra_techs)}")

    years = calculate_total_experience_years(cv.work_experience)
    if years > 0:
        context_parts.append(f"Tổng số năm kinh nghiệm: {years:.1f} năm")

    exp_lines: list[str] = []
    for exp in cv.work_experience[:15]:
        role = sanitize_free_text(exp.job_title) if exp.job_title else ""
        company = sanitize_free_text(exp.company) if exp.company else ""
        period_parts = [p for p in [exp.start_date, exp.end_date] if p and p.strip()]
        period = " -> ".join(period_parts) if period_parts else sanitize_free_text(exp.duration or "")
        desc = (
            _truncate_text(sanitize_free_text(exp.description), _MAX_ITEM_DESCRIPTION_CHARS) if exp.description else ""
        )

        header_bits: list[str] = []
        if role:
            header_bits.append(role)
        if company:
            header_bits.append(f"tại {company}")
        if period:
            header_bits.append(f"({period})")
        elif exp.years_of_experience > 0:
            header_bits.append(f"({exp.years_of_experience:.1f} năm)")

        if header_bits or desc:
            line = " ".join(header_bits) if header_bits else "Kinh nghiệm"
            if desc:
                line = f"{line} — {desc}"
            exp_lines.append(f"- {line}")
    if exp_lines:
        context_parts.append("Kinh nghiệm làm việc và vị trí đã đảm nhiệm:\n" + "\n".join(exp_lines))

    edu_lines: list[str] = []
    for edu in cv.education[:10]:
        parts: list[str] = []
        if edu.degree:
            clean_degree = sanitize_free_text(edu.degree)
            if clean_degree:
                parts.append(clean_degree)
        if edu.field_of_study:
            clean_field = sanitize_free_text(edu.field_of_study)
            if clean_field:
                parts.append(f"ngành {clean_field}")
        if edu.institution:
            clean_inst = sanitize_free_text(edu.institution)
            if clean_inst:
                parts.append(f"tại {clean_inst}")
        if edu.graduation_year:
            clean_year = sanitize_free_text(edu.graduation_year)
            if clean_year:
                parts.append(f"({clean_year})")
        if parts:
            edu_lines.append("- " + " ".join(parts))
    if edu_lines:
        context_parts.append("Học vấn:\n" + "\n".join(edu_lines))

    proj_lines: list[str] = []
    for proj in cv.projects[:10]:
        clean_name = sanitize_free_text(proj.name)
        if not clean_name:
            continue
        proj_techs = _sanitize_list(proj.technologies)
        tech_part = f" [Công nghệ: {', '.join(proj_techs[:15])}]" if proj_techs else ""
        clean_desc = (
            f" — {_truncate_text(sanitize_free_text(proj.description), _MAX_ITEM_DESCRIPTION_CHARS)}"
            if proj.description and proj.description.strip()
            else ""
        )
        proj_lines.append(f"- {clean_name}{tech_part}{clean_desc}")
    if proj_lines:
        context_parts.append("Dự án cá nhân:\n" + "\n".join(proj_lines))

    clean_certs = _sanitize_list(cv.certificates)
    if clean_certs:
        context_parts.append(f"Chứng chỉ: {', '.join(clean_certs[:20])}")


def _append_cv_evaluation_context(context_parts: list[str], cv_eval: CareerCvEvaluation) -> None:
    """Append AI CV Analyzer quality evaluation details when available."""
    if cv_eval.cv_score is not None:
        context_parts.append(f"Điểm đánh giá CV (AI CV Analyzer): {cv_eval.cv_score}/100")

    clean_strengths = _sanitize_list(cv_eval.strengths)
    if clean_strengths:
        context_parts.append(f"Điểm mạnh CV: {'; '.join(clean_strengths[:10])}")

    clean_weaknesses = _sanitize_list(cv_eval.weaknesses)
    if clean_weaknesses:
        context_parts.append(f"Điểm yếu CV: {'; '.join(clean_weaknesses[:10])}")

    clean_improvements = _sanitize_list(cv_eval.improvement_suggestions)
    if clean_improvements:
        context_parts.append(f"Đề xuất cải thiện CV: {'; '.join(clean_improvements[:10])}")


class CareerAssistantService:
    """Conversational career guidance layer consuming authorized context provided by ASP.NET Core."""

    def __init__(self, llm: LlmPort) -> None:
        self.llm = llm

    async def chat(self, req: CareerAssistantRequest) -> CareerAssistantResponse:
        """Process candidate inquiry with minimal context and delimited conversation history."""
        start_time = time.perf_counter()
        correlation_id = correlation_id_ctx.get()

        # Build minimal career context (PII minimized: no candidate_id, full name, email, or phone;
        # free text is deterministically sanitized for email and phone redaction)
        context_parts: list[str] = []
        if req.context:
            if req.context.cv:
                _append_cv_context(context_parts, req.context.cv)
            if req.context.cv_evaluation:
                _append_cv_evaluation_context(context_parts, req.context.cv_evaluation)
            if req.context.job:
                job = req.context.job
                clean_title = sanitize_free_text(job.title)
                if clean_title:
                    context_parts.append(f"Vị trí công việc đang quan tâm: {clean_title}")
                if job.required_skills:
                    clean_req = _sanitize_list(job.required_skills)
                    if clean_req:
                        context_parts.append(f"Kỹ năng yêu cầu: {', '.join(clean_req)}")
                if job.preferred_skills:
                    clean_pref = _sanitize_list(job.preferred_skills)
                    if clean_pref:
                        context_parts.append(f"Kỹ năng ưu tiên: {', '.join(clean_pref)}")
                if job.description:
                    clean_job_desc = _truncate_text(sanitize_free_text(job.description), _MAX_JOB_DESCRIPTION_CHARS)
                    if clean_job_desc:
                        context_parts.append(f"Mô tả công việc: {clean_job_desc}")
            if req.context.match_result:
                mr = req.context.match_result
                context_parts.append(f"Điểm phù hợp hiện tại: {mr.match_score}/100")
                if mr.matched_skills:
                    clean_matched = _sanitize_list(mr.matched_skills)
                    if clean_matched:
                        context_parts.append(f"Kỹ năng đã khớp: {', '.join(clean_matched)}")
                if mr.missing_skills:
                    clean_missing = _sanitize_list(mr.missing_skills)
                    if clean_missing:
                        context_parts.append(f"Kỹ năng còn thiếu: {', '.join(clean_missing)}")
                if mr.experience_comparison:
                    clean_exp_cmp = sanitize_free_text(mr.experience_comparison)
                    if clean_exp_cmp:
                        context_parts.append(f"Đánh giá kinh nghiệm: {clean_exp_cmp}")
                if mr.education_comparison:
                    clean_edu_cmp = sanitize_free_text(mr.education_comparison)
                    if clean_edu_cmp:
                        context_parts.append(f"Đánh giá học vấn: {clean_edu_cmp}")
                if mr.project_domain_relevance:
                    clean_proj_rel = sanitize_free_text(mr.project_domain_relevance)
                    if clean_proj_rel:
                        context_parts.append(f"Độ phù hợp dự án: {clean_proj_rel}")
                if mr.match_explanation:
                    clean_mr_exp = sanitize_free_text(mr.match_explanation)
                    if clean_mr_exp:
                        context_parts.append(f"Giải thích kết quả khớp: {clean_mr_exp}")
                if mr.warning:
                    clean_warning = sanitize_free_text(mr.warning)
                    if clean_warning:
                        context_parts.append(f"Lưu ý đánh giá: {clean_warning}")
            elif req.context.cv is not None and req.context.job is not None:
                context_parts.append(
                    "Trạng thái Matching: Hiện không có điểm Matching chính thức cho cặp CV và việc làm này. "
                    "Tuyệt đối không tự tính, ước lượng hoặc bịa điểm Matching."
                )

        context_str = (
            _truncate_text("\n".join(context_parts), _MAX_CAREER_CONTEXT_CHARS)
            if context_parts
            else "Không có thông tin hồ sơ bổ sung."
        )

        # Format delimited conversation history (sanitizing content for email and phone numbers)
        history_parts = [f"[{msg.role}]: {sanitize_free_text(msg.content)}" for msg in req.history[-10:]]
        chat_history_str = "\n".join(history_parts) if history_parts else "Chưa có lượt trò chuyện trước đó."

        intent = _detect_career_intent(req.message)
        wants_english = _wants_english_cover_letter(req.message)
        workflow_instruction = _build_workflow_instruction(intent, wants_english, req)

        prompt = CAREER_ASSISTANT_USER_TEMPLATE_V1.format(
            workflow_instruction=workflow_instruction,
            context_str=context_str,
            chat_history_str=chat_history_str,
            user_message=sanitize_free_text(req.message),
        )

        raw_llm_output = await self.llm.generate_text(
            prompt=prompt,
            system_prompt=CAREER_ASSISTANT_SYSTEM_PROMPT_V1,
            temperature=0.4,
        )
        raw_reply, followups = _extract_reply_and_followups(raw_llm_output, intent, wants_english, req)
        has_cv_and_job = bool(req.context and req.context.cv is not None and req.context.job is not None)
        match_result = req.context.match_result if req.context else None
        reply = _enforce_match_score_guardrail(raw_reply, match_result, has_cv_and_job)

        elapsed_ms = (time.perf_counter() - start_time) * 1000.0

        logger.info(
            "Career assistant answered query (intent=%s, len=%d, followups=%d, elapsed=%.2fms)",
            intent,
            len(reply),
            len(followups),
            elapsed_ms,
        )

        meta = ResponseMeta(
            algorithm_version="career-v0",
            prompt_version="v1",
            provider=self.llm.provider_name,
            model=self.llm.model_name,
            processing_time_ms=round(elapsed_ms, 2),
            correlation_id=correlation_id,
        )

        return CareerAssistantResponse(
            reply=reply,
            suggested_followups=followups,
            meta=meta,
        )
