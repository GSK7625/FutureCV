"""Matching application service orchestrating hybrid deterministic scoring and LLM explanations."""

import time

from app.contracts.common import ResponseMeta
from app.contracts.cv import StructuredCv
from app.contracts.job import StructuredJob
from app.contracts.matching import MatchResult
from app.domain.matching.education_match import calculate_education_match
from app.domain.matching.experience_match import calculate_experience_match
from app.domain.matching.project_match import evaluate_project_relevance
from app.domain.matching.scoring import MATCHING_ALGORITHM_VERSION, compute_overall_match_score
from app.domain.matching.skill_match import calculate_skill_match
from app.observability.logging import correlation_id_ctx, get_logger
from app.ports.llm import LlmPort
from app.prompts.match_explanation_v1 import (
    MATCH_EXPLANATION_SYSTEM_PROMPT_V1,
    MATCH_EXPLANATION_USER_TEMPLATE_V1,
)

logger = get_logger(__name__)


class MatchingService:
    """Core matching engine evaluating candidate CV compatibility with a Job Posting."""

    def __init__(self, llm: LlmPort) -> None:
        self.llm = llm

    async def match(
        self,
        cv: StructuredCv,
        job: StructuredJob,
        generate_explanation: bool = True,
    ) -> MatchResult:
        """
        Evaluate candidate CV against a Job Posting using deterministic multi-criteria scoring.

        When generate_explanation is True: calls LLM for detailed natural language explanation.
        When generate_explanation is False: constructs a concise deterministic explanation without LLM calls.
        """
        start_time = time.perf_counter()
        correlation_id = correlation_id_ctx.get()

        # 1. Candidate skill gathering
        all_candidate_skills = list(cv.skills)
        for tech in cv.technologies:
            if tech not in all_candidate_skills:
                all_candidate_skills.append(tech)
        for proj in cv.projects:
            for p_tech in proj.technologies:
                if p_tech not in all_candidate_skills:
                    all_candidate_skills.append(p_tech)

        # 2. Skill matching (matching-v0)
        skill_res = calculate_skill_match(
            candidate_skills=all_candidate_skills,
            required_skills=job.required_skills,
            preferred_skills=job.preferred_skills,
        )

        # 3. Experience matching
        candidate_years = sum(exp.years_of_experience for exp in cv.work_experience)
        exp_res = calculate_experience_match(
            candidate_years=candidate_years,
            required_years=job.minimum_experience_years,
        )

        # 4. Education matching
        candidate_degrees = [edu.degree for edu in cv.education]
        edu_res = calculate_education_match(
            candidate_degrees=candidate_degrees,
            required_education=job.education_requirement,
        )

        # 5. Aggregate overall match score (matching-v0 baseline)
        overall = compute_overall_match_score(
            skill_res=skill_res,
            exp_res=exp_res,
            edu_res=edu_res,
        )

        # 6. Informational project relevance evaluation
        proj_res = evaluate_project_relevance(
            projects=cv.projects,
            required_skills=job.required_skills,
            preferred_skills=job.preferred_skills,
        )

        # 7. Explanation generation (LLM if requested; deterministic fallback for candidate ranking)
        if generate_explanation:
            prompt = MATCH_EXPLANATION_USER_TEMPLATE_V1.format(
                job_title=job.title,
                match_score=overall.final_score,
                skill_score=overall.skill_score,
                experience_score=overall.experience_score,
                education_score=overall.education_score,
                matched_skills=", ".join(skill_res.matched_skills) or "Không có",
                missing_skills=", ".join(skill_res.missing_skills) or "Không có",
                experience_comparison=exp_res.comparison_text,
                education_comparison=edu_res.comparison_text,
            )

            explanation = await self.llm.generate_text(
                prompt=prompt,
                system_prompt=MATCH_EXPLANATION_SYSTEM_PROMPT_V1,
                temperature=0.3,
            )
        else:
            # Deterministic concise summary avoiding LLM inference cost during bulk ranking
            explanation = (
                f"Điểm phù hợp: {overall.final_score}/100 "
                f"(Kỹ năng: {overall.skill_score:.0f}%, "
                f"Kinh nghiệm: {overall.experience_score:.0f}%, "
                f"Học vấn: {overall.education_score:.0f}%). "
                f"Khớp {len(skill_res.matched_skills)} kỹ năng, "
                f"thiếu {len(skill_res.missing_skills)} kỹ năng yêu cầu."
            )

        elapsed_ms = (time.perf_counter() - start_time) * 1000.0

        logger.info(
            "Completed Job Matching (score=%d, matched=%d, missing=%d, llm=%s, elapsed=%.2fms)",
            overall.final_score,
            len(skill_res.matched_skills),
            len(skill_res.missing_skills),
            generate_explanation,
            elapsed_ms,
        )

        meta = ResponseMeta(
            algorithm_version=MATCHING_ALGORITHM_VERSION,
            prompt_version="v1" if generate_explanation else "deterministic-v0",
            provider=self.llm.provider_name,
            model=self.llm.model_name,
            processing_time_ms=round(elapsed_ms, 2),
            correlation_id=correlation_id,
        )

        return MatchResult(
            match_score=overall.final_score,
            matched_skills=skill_res.matched_skills,
            missing_skills=skill_res.missing_skills,
            experience_comparison=exp_res.comparison_text,
            education_comparison=edu_res.comparison_text,
            project_domain_relevance=proj_res.relevance_explanation,
            match_explanation=explanation,
            meta=meta,
        )
