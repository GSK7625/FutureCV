"""Deterministic skill matching logic with canonical normalization."""

from dataclasses import dataclass, field

from app.domain.cv.normalization import normalize_skill


@dataclass(frozen=True)
class SkillMatchResult:
    """Outcome of skill comparison."""

    matched_skills: list[str] = field(default_factory=list)
    missing_skills: list[str] = field(default_factory=list)
    skill_score: float = 0.0
    matched_required_count: int = 0
    total_required_count: int = 0


def calculate_skill_match(
    candidate_skills: list[str],
    required_skills: list[str],
    preferred_skills: list[str] | None = None,
) -> SkillMatchResult:
    """
    Compare candidate skills against job required and preferred skills.

    Scoring formula:
    - Required skills: up to 80% of skill score.
    - Preferred skills: up to 20% bonus.
    """
    preferred = preferred_skills or []
    norm_candidate_skills = {normalize_skill(s): s for s in candidate_skills if s.strip()}

    matched_skills: list[str] = []
    missing_skills: list[str] = []

    matched_req_count = 0
    for req in required_skills:
        req_clean = req.strip()
        if not req_clean:
            continue
        norm_req = normalize_skill(req_clean)
        if norm_req in norm_candidate_skills:
            matched_req_count += 1
            matched_skills.append(req_clean)
        else:
            missing_skills.append(req_clean)

    total_req = len([r for r in required_skills if r.strip()])

    matched_pref_count = 0
    for pref in preferred:
        pref_clean = pref.strip()
        if not pref_clean:
            continue
        norm_pref = normalize_skill(pref_clean)
        if norm_pref in norm_candidate_skills:
            matched_pref_count += 1
            if pref_clean not in matched_skills:
                matched_skills.append(f"{pref_clean} (Preferred)")

    total_pref = len([p for p in preferred if p.strip()])

    # Compute score
    if total_req > 0:
        req_ratio = matched_req_count / total_req
        req_score = req_ratio * 80.0
        pref_score = (matched_pref_count / total_pref * 20.0) if total_pref > 0 else (20.0 if req_ratio >= 1.0 else 0.0)
        total_skill_score = min(100.0, req_score + pref_score)
    elif total_pref > 0:
        total_skill_score = (matched_pref_count / total_pref) * 100.0
    else:
        # If job specified no skills, fallback to high neutral score
        total_skill_score = 75.0

    return SkillMatchResult(
        matched_skills=matched_skills,
        missing_skills=missing_skills,
        skill_score=round(total_skill_score, 2),
        matched_required_count=matched_req_count,
        total_required_count=total_req,
    )

