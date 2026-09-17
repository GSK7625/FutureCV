"""Comprehensive match score aggregation with centralized, inspectable weights."""

from dataclasses import dataclass

from app.domain.matching.education_match import EducationMatchResult
from app.domain.matching.experience_match import ExperienceMatchResult
from app.domain.matching.skill_match import SkillMatchResult

# Centralized, versioned weights for Matching Engine
SKILL_WEIGHT: float = 0.50
EXPERIENCE_WEIGHT: float = 0.30
EDUCATION_WEIGHT: float = 0.20


@dataclass(frozen=True)
class OverallMatchScore:
    """Consolidated match scoring calculation."""

    final_score: int
    skill_score: float
    experience_score: float
    education_score: float
    skill_weight: float = SKILL_WEIGHT
    experience_weight: float = EXPERIENCE_WEIGHT
    education_weight: float = EDUCATION_WEIGHT


def compute_overall_match_score(
    skill_res: SkillMatchResult,
    exp_res: ExperienceMatchResult,
    edu_res: EducationMatchResult,
) -> OverallMatchScore:
    """
    Compute weighted total match score (0-100) combining skills, experience, and education.

    Formula:
    Score = (SkillScore * 0.50) + (ExperienceScore * 0.30) + (EducationScore * 0.20)
    """
    weighted_total = (
        (skill_res.skill_score * SKILL_WEIGHT)
        + (exp_res.score * EXPERIENCE_WEIGHT)
        + (edu_res.score * EDUCATION_WEIGHT)
    )

    final_score = round(max(0.0, min(100.0, weighted_total)))

    return OverallMatchScore(
        final_score=final_score,
        skill_score=skill_res.skill_score,
        experience_score=exp_res.score,
        education_score=edu_res.score,
    )
