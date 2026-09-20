"""CV Analyzer application service orchestrating document parsing, extraction, and quality scoring."""

import time

from pydantic import BaseModel, Field

from app.contracts.common import ResponseMeta
from app.contracts.cv import StructuredCv
from app.contracts.cv_analysis import CvAnalysisResponse
from app.core.config import Settings, get_settings
from app.core.exceptions import DocumentParsingError
from app.domain.cv.scoring import evaluate_cv_quality
from app.observability.logging import correlation_id_ctx, get_logger
from app.ports.document_parser import DocumentParserPort
from app.ports.llm import LlmPort
from app.prompts.cv_analysis_v1 import (
    CV_ANALYSIS_SYSTEM_PROMPT_V1,
    CV_ANALYSIS_USER_PROMPT_TEMPLATE_V1,
)
from app.prompts.cv_extraction_v1 import (
    CV_EXTRACTION_SYSTEM_PROMPT_V1,
    CV_EXTRACTION_USER_PROMPT_TEMPLATE_V1,
)

logger = get_logger(__name__)


class CvQualitativeFeedback(BaseModel):
    """Internal application structured model for qualitative critique from LLM."""

    strengths: list[str] = Field(default_factory=list, description="Key professional strengths")
    weaknesses: list[str] = Field(default_factory=list, description="Specific areas of weakness")
    improvement_suggestions: list[str] = Field(
        default_factory=list,
        description="Actionable improvement suggestions",
    )


class CvAnalyzerService:
    """Orchestrates CV document parsing, structured data extraction, and quality evaluation."""

    def __init__(self, parser: DocumentParserPort, llm: LlmPort, settings: Settings | None = None) -> None:
        self.parser = parser
        self.llm = llm
        self.settings = settings or get_settings()

    async def analyze_pdf(self, file_bytes: bytes) -> CvAnalysisResponse:
        """Parse raw PDF document and perform end-to-end CV analysis."""
        raw_text = await self.parser.parse_pdf(file_bytes)
        return await self.analyze_text(raw_text)

    async def analyze_text(self, raw_text: str) -> CvAnalysisResponse:
        """Extract structured CV from raw text and compute quality score and improvement advice."""
        start_time = time.perf_counter()
        correlation_id = correlation_id_ctx.get()

        # Enforce character safety limit consistently with PDF parsing
        if len(raw_text) > self.settings.max_extracted_text_chars:
            raise DocumentParsingError(
                f"CV text length ({len(raw_text)} characters) exceeds maximum allowed limit of "
                f"{self.settings.max_extracted_text_chars} characters",
                details={
                    "reason": "text_limit_exceeded",
                    "max_chars": self.settings.max_extracted_text_chars,
                    "actual_chars": len(raw_text),
                },
            )

        # 1. LLM Structured Extraction (raw CV text may contain PII to extract candidate profile)
        extract_prompt = CV_EXTRACTION_USER_PROMPT_TEMPLATE_V1.format(raw_cv_text=raw_text)
        structured_cv = await self.llm.generate_structured(
            prompt=extract_prompt,
            response_model=StructuredCv,
            system_prompt=CV_EXTRACTION_SYSTEM_PROMPT_V1,
            temperature=0.1,
        )

        # 2. Deterministic Quality Evaluation (Structural Completeness)
        structural_eval = evaluate_cv_quality(structured_cv.model_dump())

        # 3. Redact PII (full_name, email, phone) before second-stage qualitative LLM evaluation
        analysis_prompt = CV_ANALYSIS_USER_PROMPT_TEMPLATE_V1.format(
            career_summary=structured_cv.career_summary or "Chưa có",
            skills=", ".join(structured_cv.skills) or "Chưa có",
            work_experience=f"{len(structured_cv.work_experience)} vị trí",
            education=f"{len(structured_cv.education)} bằng cấp",
            projects=f"{len(structured_cv.projects)} dự án",
            certificates=", ".join(structured_cv.certificates) or "Không có",
            cv_score=structural_eval.cv_score,
        )

        # 4. LLM Qualitative Evaluation returning structured feedback model
        qualitative_feedback = await self.llm.generate_structured(
            prompt=analysis_prompt,
            response_model=CvQualitativeFeedback,
            system_prompt=CV_ANALYSIS_SYSTEM_PROMPT_V1,
            temperature=0.3,
        )

        # 5. Merge deterministic and qualitative feedback independently, preserving order and deduplicating
        def _dedup_preserve_order(items: list[str]) -> list[str]:
            return list(dict.fromkeys(item.strip() for item in items if item.strip()))

        merged_strengths = _dedup_preserve_order(structural_eval.strengths + qualitative_feedback.strengths)
        merged_weaknesses = _dedup_preserve_order(structural_eval.weaknesses + qualitative_feedback.weaknesses)
        merged_suggestions = _dedup_preserve_order(
            structural_eval.improvement_suggestions + qualitative_feedback.improvement_suggestions
        )

        elapsed_ms = (time.perf_counter() - start_time) * 1000.0

        logger.info(
            "Completed CV analysis (score=%d, strengths=%d, weaknesses=%d, elapsed=%.2fms)",
            structural_eval.cv_score,
            len(merged_strengths),
            len(merged_weaknesses),
            elapsed_ms,
        )

        meta = ResponseMeta(
            algorithm_version="cv-v0",
            prompt_version="v1",
            provider=self.llm.provider_name,
            model=self.llm.model_name,
            processing_time_ms=round(elapsed_ms, 2),
            correlation_id=correlation_id,
        )

        return CvAnalysisResponse(
            structured_cv=structured_cv,
            cv_score=structural_eval.cv_score,
            strengths=merged_strengths,
            weaknesses=merged_weaknesses,
            improvement_suggestions=merged_suggestions,
            meta=meta,
        )
