"""Career Assistant application service orchestrating conversational career guidance."""

import time

from app.contracts.career import CareerAssistantRequest, CareerAssistantResponse
from app.contracts.common import ResponseMeta
from app.observability.logging import correlation_id_ctx, get_logger
from app.ports.llm import LlmPort
from app.prompts.career_v1 import (
    CAREER_ASSISTANT_SYSTEM_PROMPT_V1,
    CAREER_ASSISTANT_USER_TEMPLATE_V1,
)

logger = get_logger(__name__)


class CareerAssistantService:
    """Conversational career guidance layer consuming authorized context provided by ASP.NET Core."""

    def __init__(self, llm: LlmPort) -> None:
        self.llm = llm

    async def chat(self, req: CareerAssistantRequest) -> CareerAssistantResponse:
        """Process candidate inquiry with context and conversation history."""
        start_time = time.perf_counter()
        correlation_id = correlation_id_ctx.get()

        # Build context summary string
        context_parts: list[str] = []
        if req.context:
            if req.context.candidate_id:
                context_parts.append(f"Mã ứng viên: {req.context.candidate_id}")
            if req.context.cv:
                cv = req.context.cv
                context_parts.append(f"Họ tên ứng viên: {cv.full_name or 'N/A'}")
                context_parts.append(f"Kỹ năng: {', '.join(cv.skills)}")
                years = sum(w.years_of_experience for w in cv.work_experience)
                context_parts.append(f"Số năm kinh nghiệm: {years:.1f} năm")
            if req.context.job:
                job = req.context.job
                context_parts.append(f"Công việc đang xem: {job.title}")
                context_parts.append(f"Yêu cầu kỹ năng: {', '.join(job.required_skills)}")
            if req.context.match_result:
                mr = req.context.match_result
                context_parts.append(f"Điểm phù hợp: {mr.match_score}/100")
                context_parts.append(f"Kỹ năng khớp: {', '.join(mr.matched_skills)}")
                context_parts.append(f"Kỹ năng còn thiếu: {', '.join(mr.missing_skills)}")

        context_str = "\n".join(context_parts) if context_parts else "Không có ngữ cảnh bổ sung."

        # Format conversation history
        history_parts = [f"{msg.role}: {msg.content}" for msg in req.history[-6:]]
        chat_history_str = "\n".join(history_parts) if history_parts else "Chưa có lịch sử trước đó."

        prompt = CAREER_ASSISTANT_USER_TEMPLATE_V1.format(
            context_str=context_str,
            chat_history_str=chat_history_str,
            user_message=req.message,
        )

        reply = await self.llm.generate_text(
            prompt=prompt,
            system_prompt=CAREER_ASSISTANT_SYSTEM_PROMPT_V1,
            temperature=0.4,
        )

        elapsed_ms = (time.perf_counter() - start_time) * 1000.0

        followups = [
            "Làm thế nào để bổ sung các kỹ năng còn thiếu vào CV hiệu quả?",
            "Gợi ý cho tôi cách viết Cover Letter gây ấn tượng cho vị trí này.",
            "Lộ trình học tập đề xuất để nâng cao điểm phù hợp là gì?",
        ]

        logger.info("Career assistant answered query (len=%d, elapsed=%.2fms)", len(reply), elapsed_ms)

        meta = ResponseMeta(
            algorithm_version="1.0.0",
            prompt_version="v1",
            provider=self.llm.__class__.__name__,
            model="default",
            processing_time_ms=round(elapsed_ms, 2),
            correlation_id=correlation_id,
        )

        return CareerAssistantResponse(
            reply=reply,
            suggested_followups=followups,
            meta=meta,
        )
