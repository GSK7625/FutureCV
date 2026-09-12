"""CV Analyzer application service orchestrating document parsing, extraction, and quality scoring."""

import time

from app.contracts.common import ResponseMeta
from app.contracts.cv import StructuredCv
from app.contracts.cv_analysis import CvAnalysisResponse
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


class CvAnalyzerService:
    """Orchestrates CV document parsing, structured data extraction, and quality evaluation."""

    def __init__(self, parser: DocumentParserPort, llm: LlmPort) -> None:
        self.parser = parser
        self.llm = llm

    async def analyze_pdf(self, file_bytes: bytes) -> CvAnalysisResponse:
        """Parse raw PDF document and perform end-to-end CV analysis."""
        raw_text = await self.parser.parse_pdf(file_bytes)
        return await self.analyze_text(raw_text)

    async def analyze_text(self, raw_text: str) -> CvAnalysisResponse:
        """Extract structured CV from raw text and compute quality score and improvement advice."""
        start_time = time.perf_counter()
        correlation_id = correlation_id_ctx.get()

        # 1. LLM Structured Extraction
        extract_prompt = CV_EXTRACTION_USER_PROMPT_TEMPLATE_V1.format(raw_cv_text=raw_text)
        structured_cv = await self.llm.generate_structured(
            prompt=extract_prompt,
            response_model=StructuredCv,
            system_prompt=CV_EXTRACTION_SYSTEM_PROMPT_V1,
            temperature=0.1,
        )

        # 2. Deterministic Quality Evaluation (Structural Completeness)
        structural_eval = evaluate_cv_quality(structured_cv.model_dump())

        # 3. LLM Qualitative Evaluation & Refinement
        analysis_prompt = CV_ANALYSIS_USER_PROMPT_TEMPLATE_V1.format(
            full_name=structured_cv.full_name or "N/A",
            career_summary=structured_cv.career_summary or "Chưa có",
            skills=", ".join(structured_cv.skills) or "Chưa có",
            work_experience=f"{len(structured_cv.work_experience)} vị trí",
            education=f"{len(structured_cv.education)} bằng cấp",
            projects=f"{len(structured_cv.projects)} dự án",
            certificates=", ".join(structured_cv.certificates) or "Không có",
            cv_score=structural_eval.cv_score,
        )

        qualitative_text = await self.llm.generate_text(
            prompt=analysis_prompt,
            system_prompt=CV_ANALYSIS_SYSTEM_PROMPT_V1,
            temperature=0.3,
        )

        # Merge structural strengths and suggestions with qualitative notes if available
        all_strengths = list(structural_eval.strengths)
        all_weaknesses = list(structural_eval.weaknesses)
        all_suggestions = list(structural_eval.improvement_suggestions)

        if qualitative_text and len(qualitative_text.strip()) > 20:
            all_suggestions.append(f"Gợi ý chuyên sâu từ chuyên gia AI: {qualitative_text.strip()[:300]}...")

        elapsed_ms = (time.perf_counter() - start_time) * 1000.0

        logger.info(
            "Completed CV analysis (score=%d, strengths=%d, weaknesses=%d, elapsed=%.2fms)",
            structural_eval.cv_score,
            len(all_strengths),
            len(all_weaknesses),
            elapsed_ms,
        )

        meta = ResponseMeta(
            algorithm_version="1.0.0",
            prompt_version="v1",
            provider=self.llm.__class__.__name__,
            model="default",
            processing_time_ms=round(elapsed_ms, 2),
            correlation_id=correlation_id,
        )

        return CvAnalysisResponse(
            structured_cv=structured_cv,
            cv_score=structural_eval.cv_score,
            strengths=all_strengths,
            weaknesses=all_weaknesses,
            improvement_suggestions=all_suggestions,
            meta=meta,
        )

