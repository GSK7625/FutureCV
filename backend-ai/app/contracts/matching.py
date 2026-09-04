"""Contracts for Job Matching and Candidate/Job Ranking features."""

from pydantic import BaseModel, Field

from app.contracts.common import ResponseMeta
from app.contracts.cv import StructuredCv
from app.contracts.job import StructuredJob


class MatchRequest(BaseModel):
    """Request payload for matching a single CV against a single Job."""

    cv: StructuredCv = Field(description="Structured CV of the candidate")
    job: StructuredJob = Field(description="Structured Job Posting")


class MatchResult(BaseModel):
    """Evaluation result comparing a candidate CV against a job description."""

    match_score: int = Field(description="Compatibility score between 0 and 100", ge=0, le=100)
    matched_skills: list[str] = Field(default_factory=list, description="Skills possessed by candidate required by job")
    missing_skills: list[str] = Field(default_factory=list, description="Required skills missing from candidate CV")
    experience_comparison: str = Field(default="", description="Detailed comparison of years of experience")
    education_comparison: str = Field(default="", description="Comparison of academic qualifications")
    project_domain_relevance: str = Field(default="", description="Relevance of past projects to job domain")
    match_explanation: str = Field(default="", description="Comprehensive natural language match explanation")
    meta: ResponseMeta = Field(default_factory=ResponseMeta, description="Execution metadata")


class CandidateItem(BaseModel):
    """Candidate representation in bulk ranking request."""

    candidate_id: str = Field(description="Unique candidate or application identifier")
    cv: StructuredCv = Field(description="Candidate's structured CV")


class CandidateRankRequest(BaseModel):
    """Request to rank multiple candidates for a single Job posting."""

    job: StructuredJob = Field(description="Target job posting")
    candidates: list[CandidateItem] = Field(description="List of candidates to evaluate and rank")


class RankedCandidateItem(BaseModel):
    """Ranked candidate entry with match result and rank position."""

    rank: int = Field(description="Ordinal position (1-based, 1 is best match)")
    candidate_id: str = Field(description="Candidate identifier")
    match_result: MatchResult = Field(description="Underlying match result")


class CandidateRankResponse(BaseModel):
    """Response containing ranked candidates sorted descending by match score."""

    job_title: str = Field(description="Title of evaluated job")
    total_evaluated: int = Field(description="Number of candidates evaluated")
    ranked_candidates: list[RankedCandidateItem] = Field(description="Candidates sorted by MatchScore descending")
    meta: ResponseMeta = Field(default_factory=ResponseMeta, description="Execution metadata")

