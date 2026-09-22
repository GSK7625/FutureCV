"""Unit tests for RankingService sorting and reuse of Matching Engine."""

import pytest

from app.application.matching_service import MatchingService
from app.application.ranking_service import RankingService
from app.contracts.cv import StructuredCv
from app.contracts.job import StructuredJob
from app.contracts.matching import CandidateItem, CandidateRankRequest
from app.infrastructure.llm.providers.mock_provider import MockLlmProvider


class SpyLlmProvider(MockLlmProvider):
    """Spy LLM provider recording invocations."""

    def __init__(self) -> None:
        self.generate_text_calls = 0

    async def generate_text(
        self,
        prompt: str,
        system_prompt: str | None = None,
        temperature: float = 0.3,
    ) -> str:
        self.generate_text_calls += 1
        return await super().generate_text(prompt, system_prompt, temperature)


@pytest.mark.asyncio
async def test_ranking_service_sorts_descending():
    """Verify candidates are sorted descending by match score and ranks are 1-based ordinal."""
    llm = MockLlmProvider()
    matching_service = MatchingService(llm=llm)
    ranking_service = RankingService(matching_service=matching_service)

    job = StructuredJob(
        title="Fullstack Developer",
        required_skills=["React", "TypeScript", "Node.js"],
        minimum_experience_years=3.0,
    )

    cv1 = StructuredCv(
        full_name="High Match Candidate",
        skills=["React", "TypeScript", "Node.js", "Docker"],
        work_experience=[{"job_title": "Dev", "years_of_experience": 4.0}],
    )
    cv2 = StructuredCv(
        full_name="Low Match Candidate",
        skills=["Photoshop"],
        work_experience=[{"job_title": "Junior", "years_of_experience": 0.5}],
    )
    cv3 = StructuredCv(
        full_name="Mid Match Candidate",
        skills=["React", "TypeScript"],
        work_experience=[{"job_title": "Dev", "years_of_experience": 2.0}],
    )

    req = CandidateRankRequest(
        job=job,
        candidates=[
            CandidateItem(candidate_id="cand-2", cv=cv2),
            CandidateItem(candidate_id="cand-1", cv=cv1),
            CandidateItem(candidate_id="cand-3", cv=cv3),
        ],
    )

    response = await ranking_service.rank_candidates(req)

    assert response.total_evaluated == 3
    assert len(response.ranked_candidates) == 3

    # Verify order: cand-1 (rank 1), cand-3 (rank 2), cand-2 (rank 3)
    assert response.ranked_candidates[0].candidate_id == "cand-1"
    assert response.ranked_candidates[0].rank == 1

    assert response.ranked_candidates[1].candidate_id == "cand-3"
    assert response.ranked_candidates[1].rank == 2

    assert response.ranked_candidates[2].candidate_id == "cand-2"
    assert response.ranked_candidates[2].rank == 3

    # Check strictly descending match_score
    scores = [c.match_result.match_score for c in response.ranked_candidates]
    assert scores == sorted(scores, reverse=True)


@pytest.mark.asyncio
async def test_ranking_service_makes_zero_llm_generate_text_calls():
    """Verify Candidate Ranking disables LLM explanation and makes zero generate_text calls."""
    spy_llm = SpyLlmProvider()
    matching_service = MatchingService(llm=spy_llm)
    ranking_service = RankingService(matching_service=matching_service)

    job = StructuredJob(title="Backend Dev", required_skills=["Python", "FastAPI"])
    candidates = [
        CandidateItem(
            candidate_id=f"cand-{i}",
            cv=StructuredCv(skills=["Python"]),
        )
        for i in range(5)
    ]
    req = CandidateRankRequest(job=job, candidates=candidates)

    response = await ranking_service.rank_candidates(req)

    assert response.total_evaluated == 5
    # Strict assertion: ZERO LLM calls made
    assert spy_llm.generate_text_calls == 0
    # Deterministic explanations present
    for rc in response.ranked_candidates:
        assert len(rc.match_result.match_explanation) > 0
        assert "Điểm phù hợp:" in rc.match_result.match_explanation
        assert rc.match_result.meta.algorithm_version == "matching-v0"
