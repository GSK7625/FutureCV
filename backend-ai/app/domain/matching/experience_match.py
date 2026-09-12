"""Deterministic experience comparison and evaluation."""

from dataclasses import dataclass


@dataclass(frozen=True)
class ExperienceMatchResult:
    """Outcome of work experience comparison."""

    score: float
    comparison_text: str
    candidate_years: float
    required_years: float


def calculate_experience_match(
    candidate_years: float,
    required_years: float | None = None,
) -> ExperienceMatchResult:
    """
    Compare candidate's years of experience against minimum requirement.

    Scoring:
    - If requirement is None or 0: 100.
    - If candidate meets or exceeds requirement: 100.
    - If candidate has partial experience: proportional score.
    """
    req_years = required_years or 0.0

    if req_years <= 0.0:
        return ExperienceMatchResult(
            score=100.0,
            comparison_text="Vị trí không yêu cầu số năm kinh nghiệm tối thiểu.",
            candidate_years=candidate_years,
            required_years=0.0,
        )

    if candidate_years >= req_years:
        surplus = round(candidate_years - req_years, 1)
        text = (
            f"Ứng viên có {candidate_years:.1f} năm kinh nghiệm, "
            f"đáp ứng hoàn toàn yêu cầu ({req_years:.1f} năm, vượt {surplus:.1f} năm)."
        )
        return ExperienceMatchResult(
            score=100.0,
            comparison_text=text,
            candidate_years=candidate_years,
            required_years=req_years,
        )

    # Partial experience
    ratio = max(0.0, candidate_years / req_years)
    score = round(ratio * 100.0, 2)
    shortage = round(req_years - candidate_years, 1)
    text = (
        f"Ứng viên có {candidate_years:.1f} năm kinh nghiệm, "
        f"thấp hơn yêu cầu {req_years:.1f} năm (thiếu khoảng {shortage:.1f} năm)."
    )

    return ExperienceMatchResult(
        score=score,
        comparison_text=text,
        candidate_years=candidate_years,
        required_years=req_years,
    )

