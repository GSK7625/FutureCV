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

    Scoring semantics:
    - CASE A (required + preferred): (matched_req / total_req * 80) + (matched_pref / total_pref * 20)
    - CASE B (required only): (matched_req / total_req * 100)
    - CASE C (preferred only): (matched_pref / total_pref * 100)
    - CASE D (no required & no preferred skills): 100.0 (neutral criterion)
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

    # Compute score based on explicit four cases
    if total_req > 0 and total_pref > 0:
        # CASE A: required (80%) + preferred (20%)
        total_skill_score = (matched_req_count / total_req * 80.0) + (matched_pref_count / total_pref * 20.0)
    elif total_req > 0 and total_pref == 0:
        # CASE B: required only (100%)
        total_skill_score = (matched_req_count / total_req) * 100.0
    elif total_req == 0 and total_pref > 0:
        # CASE C: preferred only (100%)
        total_skill_score = (matched_pref_count / total_pref) * 100.0
    else:
        # CASE D: no skill requirements specified (neutral score 100)
        total_skill_score = 100.0

    bounded_score = max(0.0, min(100.0, total_skill_score))

    return SkillMatchResult(
        matched_skills=matched_skills,
        missing_skills=missing_skills,
        skill_score=round(bounded_score, 2),
        matched_required_count=matched_req_count,
        total_required_count=total_req,
    )
