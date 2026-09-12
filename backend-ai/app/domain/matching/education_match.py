"""Deterministic education comparison and ranking."""

from dataclasses import dataclass

# Educational levels mapped to ordinal ranks for comparison
DEGREE_RANKS: dict[str, int] = {
    "high_school": 1,
    "thpt": 1,
    "associate": 2,
    "cao đẳng": 2,
    "bachelor": 3,
    "cử nhân": 3,
    "kỹ sư": 3,
    "đại học": 3,
    "master": 4,
    "thạc sĩ": 4,
    "doctorate": 5,
    "tiến sĩ": 5,
    "phd": 5,
}


@dataclass(frozen=True)
class EducationMatchResult:
    """Outcome of education qualification comparison."""

    score: float
    comparison_text: str


def _get_degree_rank(degree_str: str | None) -> int:
    """Extract standard rank for a degree description."""
    if not degree_str:
        return 0
    lower = degree_str.lower()
    for key, rank in DEGREE_RANKS.items():
        if key in lower:
            return rank
    return 2  # default baseline if unknown degree specified


def calculate_education_match(
    candidate_degrees: list[str],
    required_education: str | None = None,
) -> EducationMatchResult:
    """
    Compare candidate degree levels with minimum required education level.

    Scoring:
    - If no requirement: 100%.
    - If meets or exceeds: 100%.
    - If 1 level lower: 75%.
    - If lower: 50%.
    """
    if not required_education or not required_education.strip():
        return EducationMatchResult(
            score=100.0,
            comparison_text="Vị trí không đặt yêu cầu bắt buộc về bằng cấp học vấn.",
        )

    req_rank = _get_degree_rank(required_education)

    if not candidate_degrees:
        return EducationMatchResult(
            score=50.0,
            comparison_text=f"Ứng viên chưa cung cấp thông tin bằng cấp. Vị trí yêu cầu: {required_education}.",
        )

    highest_cand_rank = max((_get_degree_rank(d) for d in candidate_degrees), default=0)

    if highest_cand_rank >= req_rank:
        return EducationMatchResult(
            score=100.0,
            comparison_text=f"Học vấn của ứng viên đáp ứng hoặc vượt yêu cầu vị trí ({required_education}).",
        )
    if highest_cand_rank == req_rank - 1:
        return EducationMatchResult(
            score=75.0,
            comparison_text=f"Bằng cấp của ứng viên gần tương đương yêu cầu ({required_education}).",
        )

    return EducationMatchResult(
        score=50.0,
        comparison_text=f"Bằng cấp của ứng viên thấp hơn mức yêu cầu của vị trí ({required_education}).",
    )

