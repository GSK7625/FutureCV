"""Matching application service orchestrating hybrid deterministic scoring and LLM explanations."""

import time

from app.application.semantic_representation import (
    build_cv_semantic_text,
    build_job_semantic_text,
)
from app.application.text_sanitization import sanitize_free_text
from app.contracts.common import ResponseMeta
from app.contracts.cv import StructuredCv
from app.contracts.job import StructuredJob
from app.contracts.matching import MATCH_RESULT_CONTRACT_VERSION, MatchResult
from app.core.exceptions import ProviderError, RateLimitExceededError
from app.domain.matching.education_match import calculate_education_match
from app.domain.matching.experience_match import (
    calculate_experience_match,
    calculate_total_experience_years,
)
from app.domain.matching.project_match import evaluate_project_relevance
from app.domain.matching.scoring import (
    MATCHING_ALGORITHM_VERSION,
    MATCHING_V1_ALGORITHM_VERSION,
    compute_overall_match_score,
    compute_overall_match_score_v1,
)
from app.domain.matching.similarity import cosine_similarity, similarity_to_semantic_score
from app.domain.matching.skill_match import calculate_skill_match
from app.observability.logging import correlation_id_ctx, get_logger
from app.ports.embeddings import EmbeddingPort
from app.ports.llm import LlmPort
from app.prompts.match_explanation_v1 import (
    MATCH_EXPLANATION_SYSTEM_PROMPT_V1,
    MATCH_EXPLANATION_USER_TEMPLATE_V1,
)

logger = get_logger(__name__)


class MatchingService:
    """Core matching engine evaluating candidate CV compatibility with a Job Posting."""

    def __init__(
        self,
        llm: LlmPort,
        embedding_provider: EmbeddingPort | None = None,
        matching_algorithm: str = MATCHING_ALGORITHM_VERSION,
    ) -> None:
        self.llm = llm
        self.embedding_provider = embedding_provider
        self.matching_algorithm = matching_algorithm

    @property
    def is_v1_active(self) -> bool:
        """Return True if matching-v1-experimental algorithm is active."""
        return self.matching_algorithm == MATCHING_V1_ALGORITHM_VERSION

    @property
    def algorithm_variant(self) -> str:
        """Return the active matching algorithm variant identifier."""
        return self.matching_algorithm

    async def match(
        self,
        cv: StructuredCv,
        job: StructuredJob,
        generate_explanation: bool = True,
        precomputed_job_embedding: list[float] | None = None,
        precomputed_cv_embedding: list[float] | None = None,
    ) -> MatchResult:
        """
        Evaluate candidate CV against a Job Posting using multi-criteria scoring.

        When algorithm is 'matching-v0':
        - Uses Skill (50%), Experience (30%), Education (20%).
        - Project relevance is informational only.
        - ZERO embedding calls or vector operations are executed.

        When algorithm is 'matching-v1-experimental':
        - Uses Skill (40%), Experience (20%), Education (10%), Project (10%), Semantic (20%).
        - Generates/uses text embeddings and computes pure domain cosine similarity.
        - Controlled failure if embedding provider fails (no silent fallback).

        When generate_explanation is True:
        - Calls LLM for detailed natural language explanation (llm_invoked=True).
        When generate_explanation is False:
        - Generates deterministic summary without calling LLM (llm_invoked=False).
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

        # 2. Skill matching
        skill_res = calculate_skill_match(
            candidate_skills=all_candidate_skills,
            required_skills=job.required_skills,
            preferred_skills=job.preferred_skills,
        )

        # 3. Experience matching
        candidate_years = calculate_total_experience_years(cv.work_experience)
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

        # 5. Project relevance evaluation
        proj_res = evaluate_project_relevance(
            projects=cv.projects,
            required_skills=job.required_skills,
            preferred_skills=job.preferred_skills,
        )

        # 6. Overall match score calculation
        if self.matching_algorithm == MATCHING_ALGORITHM_VERSION:
            # Baseline v0 scoring (zero embedding calls)
            overall_v0 = compute_overall_match_score(
                skill_res=skill_res,
                exp_res=exp_res,
                edu_res=edu_res,
            )
            final_score = overall_v0.final_score
            skill_score = overall_v0.skill_score
            experience_score = overall_v0.experience_score
            education_score = overall_v0.education_score
            project_score = proj_res.project_score
            semantic_score = 0.0

        elif self.matching_algorithm == MATCHING_V1_ALGORITHM_VERSION:
            if self.embedding_provider is None:
                raise ProviderError(
                    "Embedding provider is required for matching-v1-experimental",
                    provider="unconfigured",
                )

            # Resolve embeddings: reuse precomputed if available (e.g. from ranking batch)
            cv_vector = precomputed_cv_embedding
            job_vector = precomputed_job_embedding

            if cv_vector is None or job_vector is None:
                cv_text = build_cv_semantic_text(cv)
                job_text = build_job_semantic_text(job)

                if cv_vector is None and job_vector is not None:
                    vectors = await self.embedding_provider.embed_texts([cv_text])
                    if len(vectors) != 1:
                        raise ProviderError(
                            f"Embedding provider returned {len(vectors)} vectors for 1 requested text",
                            provider=self.embedding_provider.provider_name,
                        )
                    cv_vector = vectors[0]
                elif cv_vector is not None and job_vector is None:
                    vectors = await self.embedding_provider.embed_texts([job_text])
                    if len(vectors) != 1:
                        raise ProviderError(
                            f"Embedding provider returned {len(vectors)} vectors for 1 requested text",
                            provider=self.embedding_provider.provider_name,
                        )
                    job_vector = vectors[0]
                else:
                    # Single-match: embed both texts in a single batch call
                    vectors = await self.embedding_provider.embed_texts([cv_text, job_text])
                    if len(vectors) != 2:
                        raise ProviderError(
                            f"Embedding provider returned {len(vectors)} vectors for 2 requested texts",
                            provider=self.embedding_provider.provider_name,
                        )
                    cv_vector = vectors[0]
                    job_vector = vectors[1]

            sim = cosine_similarity(cv_vector, job_vector)
            semantic_score = similarity_to_semantic_score(sim)

            overall_v1 = compute_overall_match_score_v1(
                skill_res=skill_res,
                exp_res=exp_res,
                edu_res=edu_res,
                proj_res=proj_res,
                semantic_score=semantic_score,
            )
            final_score = overall_v1.final_score
            skill_score = overall_v1.skill_score
            experience_score = overall_v1.experience_score
            education_score = overall_v1.education_score
            project_score = overall_v1.project_score

        else:
            raise ValueError(f"Unsupported matching algorithm variant '{self.matching_algorithm}'")

        # 7. Explanation generation (LLM if requested with deterministic fallback on ProviderError;
        # deterministic summary for bulk ranking)
        llm_invoked = False
        explanation_mode: str = "deterministic"
        if generate_explanation:
            llm_invoked = True
            clean_job_title = sanitize_free_text(job.title)
            clean_matched_skills = sanitize_free_text(", ".join(skill_res.matched_skills)) or "Không có"
            clean_missing_skills = sanitize_free_text(", ".join(skill_res.missing_skills)) or "Không có"
            clean_exp_cmp = sanitize_free_text(exp_res.comparison_text)
            clean_edu_cmp = sanitize_free_text(edu_res.comparison_text)

            prompt = MATCH_EXPLANATION_USER_TEMPLATE_V1.format(
                job_title=clean_job_title,
                match_score=final_score,
                skill_score=skill_score,
                experience_score=experience_score,
                education_score=education_score,
                matched_skills=clean_matched_skills,
                missing_skills=clean_missing_skills,
                experience_comparison=clean_exp_cmp,
                education_comparison=clean_edu_cmp,
            )

            try:
                explanation = await self.llm.generate_text(
                    prompt=prompt,
                    system_prompt=MATCH_EXPLANATION_SYSTEM_PROMPT_V1,
                    temperature=0.3,
                )
                explanation_mode = "llm"
            except (ProviderError, RateLimitExceededError) as exc:
                logger.warning(
                    "LLM explanation failed with %s (%s). Falling back to deterministic explanation.",
                    exc.__class__.__name__,
                    exc,
                )
                if self.is_v1_active:
                    explanation = (
                        f"Điểm phù hợp: {final_score}/100 "
                        f"(Kỹ năng: {skill_score:.0f}%, "
                        f"Kinh nghiệm: {experience_score:.0f}%, "
                        f"Học vấn: {education_score:.0f}%, "
                        f"Dự án: {project_score:.0f}%, "
                        f"Độ tương đồng ngữ nghĩa: {semantic_score:.0f}%). "
                        f"Khớp {len(skill_res.matched_skills)} kỹ năng, "
                        f"thiếu {len(skill_res.missing_skills)} kỹ năng yêu cầu."
                    )
                else:
                    explanation = (
                        f"Điểm phù hợp: {final_score}/100 "
                        f"(Kỹ năng: {skill_score:.0f}%, "
                        f"Kinh nghiệm: {experience_score:.0f}%, "
                        f"Học vấn: {education_score:.0f}%). "
                        f"Khớp {len(skill_res.matched_skills)} kỹ năng, "
                        f"thiếu {len(skill_res.missing_skills)} kỹ năng yêu cầu."
                    )
                explanation_mode = "deterministic-fallback"
        else:
            # Deterministic concise summary avoiding LLM inference cost and latency during bulk ranking
            if self.is_v1_active:
                explanation = (
                    f"Điểm phù hợp: {final_score}/100 "
                    f"(Kỹ năng: {skill_score:.0f}%, "
                    f"Kinh nghiệm: {experience_score:.0f}%, "
                    f"Học vấn: {education_score:.0f}%, "
                    f"Dự án: {project_score:.0f}%, "
                    f"Độ tương đồng ngữ nghĩa: {semantic_score:.0f}%). "
                    f"Khớp {len(skill_res.matched_skills)} kỹ năng, "
                    f"thiếu {len(skill_res.missing_skills)} kỹ năng yêu cầu."
                )
            else:
                explanation = (
                    f"Điểm phù hợp: {final_score}/100 "
                    f"(Kỹ năng: {skill_score:.0f}%, "
                    f"Kinh nghiệm: {experience_score:.0f}%, "
                    f"Học vấn: {education_score:.0f}%). "
                    f"Khớp {len(skill_res.matched_skills)} kỹ năng, "
                    f"thiếu {len(skill_res.missing_skills)} kỹ năng yêu cầu."
                )
            explanation_mode = "deterministic"

        elapsed_ms = (time.perf_counter() - start_time) * 1000.0

        logger.info(
            "Completed Job Matching (variant=%s, score=%d, matched=%d, missing=%d, llm=%s, mode=%s, elapsed=%.2fms)",
            self.matching_algorithm,
            final_score,
            len(skill_res.matched_skills),
            len(skill_res.missing_skills),
            llm_invoked,
            explanation_mode,
            elapsed_ms,
        )

        emb_prov_name = self.embedding_provider.provider_name if self.is_v1_active and self.embedding_provider else None
        emb_model_name = self.embedding_provider.model_name if self.is_v1_active and self.embedding_provider else None

        meta = ResponseMeta(
            contract_version=MATCH_RESULT_CONTRACT_VERSION,
            algorithm_version=self.matching_algorithm,
            algorithm_variant=self.matching_algorithm,
            schema_version="1.0.0",
            prompt_version="v1" if generate_explanation else "deterministic",
            provider=self.llm.provider_name,
            model=self.llm.model_name,
            embedding_provider=emb_prov_name,
            embedding_model=emb_model_name,
            llm_invoked=llm_invoked,
            explanation_mode=explanation_mode,  # type: ignore[arg-type]
            processing_time_ms=round(elapsed_ms, 2),
            correlation_id=correlation_id,
        )

        return MatchResult(
            match_score=final_score,
            matched_skills=skill_res.matched_skills,
            missing_skills=skill_res.missing_skills,
            experience_comparison=exp_res.comparison_text,
            education_comparison=edu_res.comparison_text,
            project_domain_relevance=proj_res.relevance_explanation,
            match_explanation=explanation,
            meta=meta,
        )
