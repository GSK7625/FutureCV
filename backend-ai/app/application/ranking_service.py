"""Ranking application service reusing MatchingService with bounded concurrency."""

import asyncio
import time

from app.application.matching_service import MatchingService
from app.contracts.common import ResponseMeta
from app.contracts.matching import (
    CandidateItem,
    CandidateRankRequest,
    CandidateRankResponse,
    MatchResult,
    RankedCandidateItem,
)
from app.domain.matching.scoring import MATCHING_ALGORITHM_VERSION
from app.observability.logging import correlation_id_ctx, get_logger

logger = get_logger(__name__)


class RankingService:
    """Orchestrates candidate ranking by reusing MatchingService with bounded concurrency."""

    def __init__(self, matching_service: MatchingService, concurrency_limit: int = 5) -> None:
        self.matching_service = matching_service
        self.semaphore = asyncio.Semaphore(concurrency_limit)

    async def _match_single_candidate(
        self, candidate: CandidateItem, req: CandidateRankRequest
    ) -> tuple[str, MatchResult]:
        """Evaluate a single candidate against the job posting under concurrency semaphore."""
        async with self.semaphore:
            # Candidate Ranking disables LLM explanation to minimize cost and latency
            result = await self.matching_service.match(
                cv=candidate.cv,
                job=req.job,
                generate_explanation=False,
            )
            return candidate.candidate_id, result

    async def rank_candidates(self, req: CandidateRankRequest) -> CandidateRankResponse:
        """
        Rank candidates for a given job posting:
        1. Evaluates all candidates through the shared deterministic Matching Engine concurrently.
        2. Sorts results descending by MatchScore.
        3. Assigns ordinal ranks.
        """
        start_time = time.perf_counter()
        correlation_id = correlation_id_ctx.get()

        tasks = [self._match_single_candidate(c, req) for c in req.candidates]
        evaluated = await asyncio.gather(*tasks)

        # Sort descending by match_score
        sorted_results = sorted(evaluated, key=lambda item: item[1].match_score, reverse=True)

        ranked_items: list[RankedCandidateItem] = []
        for index, (candidate_id, match_res) in enumerate(sorted_results, start=1):
            ranked_items.append(
                RankedCandidateItem(
                    rank=index,
                    candidate_id=candidate_id,
                    match_result=match_res,
                )
            )

        elapsed_ms = (time.perf_counter() - start_time) * 1000.0

        logger.info(
            "Ranked %d candidates for job '%s' without LLM explanation in %.2fms",
            len(ranked_items),
            req.job.title,
            elapsed_ms,
        )

        meta = ResponseMeta(
            algorithm_version=MATCHING_ALGORITHM_VERSION,
            prompt_version="deterministic-v0",
            provider=self.matching_service.llm.provider_name,
            model=self.matching_service.llm.model_name,
            processing_time_ms=round(elapsed_ms, 2),
            correlation_id=correlation_id,
        )

        return CandidateRankResponse(
            job_title=req.job.title,
            total_evaluated=len(ranked_items),
            ranked_candidates=ranked_items,
            meta=meta,
        )
