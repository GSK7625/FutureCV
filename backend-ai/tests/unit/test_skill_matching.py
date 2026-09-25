"""Unit tests for skill normalization and matching calculation."""

from app.domain.cv.normalization import normalize_skill, normalize_skills
from app.domain.matching.skill_match import calculate_skill_match


def test_normalize_skill_aliases():
    """Verify alias mapping to canonical skill names."""
    assert normalize_skill("ReactJS") == "react"
    assert normalize_skill("React.js") == "react"
    assert normalize_skill("  Node.JS  ") == "node.js"
    assert normalize_skill("K8s") == "kubernetes"
    assert normalize_skill("Dotnet") == ".net"
    assert normalize_skill("C#") == "c#"


def test_normalize_skills_set():
    """Verify deduplication and normalization."""
    skills = ["React", "reactjs", "React.js", "Docker"]
    normalized = normalize_skills(skills)
    assert len(normalized) == 2
    assert "react" in normalized
    assert "docker" in normalized


def test_case_a_required_and_preferred():
    """Case A: Required contributes 80%, Preferred contributes 20%."""
    # 1 of 2 required matched (40 pts) + 1 of 1 preferred matched (20 pts) -> 60 pts
    cand = ["Python", "Kubernetes"]
    req = ["Python", "FastAPI"]
    pref = ["Kubernetes"]

    res = calculate_skill_match(candidate_skills=cand, required_skills=req, preferred_skills=pref)
    assert res.skill_score == 60.0
    assert res.matched_required_count == 1
    assert res.total_required_count == 2
    assert "FastAPI" in res.missing_skills


def test_case_b_required_only_linear_continuity():
    """Case B: Required-only scales linearly up to 100% without discontinuity."""
    req = ["Python", "Docker"]

    # 0 of 2 matched -> 0.0
    res_zero = calculate_skill_match(candidate_skills=[], required_skills=req, preferred_skills=[])
    assert res_zero.skill_score == 0.0

    # 1 of 2 matched -> 50.0 (previously had a bug resulting in 40.0)
    res_partial = calculate_skill_match(candidate_skills=["Python"], required_skills=req, preferred_skills=[])
    assert res_partial.skill_score == 50.0

    # 2 of 2 matched -> 100.0
    res_full = calculate_skill_match(candidate_skills=["Python", "Docker"], required_skills=req, preferred_skills=[])
    assert res_full.skill_score == 100.0


def test_case_c_preferred_only():
    """Case C: Preferred-only scales linearly to 100% when no required skills."""
    pref = ["AWS", "Terraform"]

    res_partial = calculate_skill_match(candidate_skills=["AWS"], required_skills=[], preferred_skills=pref)
    assert res_partial.skill_score == 50.0

    res_full = calculate_skill_match(
        candidate_skills=["AWS", "Terraform"],
        required_skills=[],
        preferred_skills=pref,
    )
    assert res_full.skill_score == 100.0


def test_case_d_no_skill_requirements_neutral():
    """Case D: Job specifying no skills provides neutral score of 100.0."""
    res = calculate_skill_match(candidate_skills=["Python"], required_skills=[], preferred_skills=[])
    assert res.skill_score == 100.0
    assert res.matched_skills == []
    assert res.missing_skills == []


def test_calculate_skill_match_canonical_alias_matching():
    """Verify skills match even when formatted as aliases."""
    cand = ["ReactJS", "K8s", "DotNet"]
    req = ["React", "Kubernetes", ".NET Core"]

    res = calculate_skill_match(candidate_skills=cand, required_skills=req)
    assert res.skill_score == 100.0
    assert len(res.missing_skills) == 0


def test_duplicate_required_skills_deduplication():
    """Verify duplicate required skills do not inflate requirement count or match count."""
    cand = ["Python"]
    req = ["Python", "Python", "Docker"]

    res = calculate_skill_match(candidate_skills=cand, required_skills=req)
    # Deduplicated requirements are Python, Docker (total = 2)
    assert res.total_required_count == 2
    assert res.matched_required_count == 1
    assert res.skill_score == 50.0
    assert res.matched_skills == ["Python"]
    assert res.missing_skills == ["Docker"]


def test_duplicate_preferred_skills_deduplication():
    """Verify duplicate preferred skills do not skew weighting."""
    cand = ["FastAPI", "Docker"]
    req = ["FastAPI"]
    pref = ["Docker", "docker", "DOCKER"]

    res = calculate_skill_match(candidate_skills=cand, required_skills=req, preferred_skills=pref)
    assert res.total_required_count == 1
    assert res.matched_required_count == 1
    # 80% for req + 20% for pref (1/1) = 100.0%
    assert res.skill_score == 100.0
    assert res.matched_skills == ["FastAPI", "Docker (Preferred)"]


def test_required_and_preferred_overlap_disjoint():
    """Verify skills present in both required and preferred are only scored once in required."""
    cand = ["Python"]
    req = ["Python", "PostgreSQL"]
    pref = ["Python", "Docker"]

    res = calculate_skill_match(candidate_skills=cand, required_skills=req, preferred_skills=pref)
    # Python is stripped from preferred because it is required
    # Required: Python (matched), PostgreSQL (missing) -> 1/2 = 40 pts
    # Preferred: Docker (missing) -> 0/1 = 0 pts
    assert res.total_required_count == 2
    assert res.matched_required_count == 1
    assert res.skill_score == 40.0
    assert res.matched_skills == ["Python"]
    assert "Python (Preferred)" not in res.matched_skills
    assert res.missing_skills == ["PostgreSQL"]


def test_alias_duplicate_skills_in_required():
    """Verify alias-equivalent skills in job requirements collapse to single canonical entry."""
    # React + ReactJS
    res_react = calculate_skill_match(
        candidate_skills=["React"],
        required_skills=["React", "ReactJS"],
    )
    assert res_react.total_required_count == 1
    assert res_react.matched_required_count == 1
    assert res_react.skill_score == 100.0
    assert res_react.matched_skills == ["React"]
    assert res_react.missing_skills == []

    # Postgres + PostgreSQL
    res_pg = calculate_skill_match(
        candidate_skills=[],
        required_skills=["PostgreSQL", "postgres"],
    )
    assert res_pg.total_required_count == 1
    assert res_pg.matched_required_count == 0
    assert res_pg.skill_score == 0.0
    assert res_pg.missing_skills == ["PostgreSQL"]

    # K8s + Kubernetes
    res_k8s = calculate_skill_match(
        candidate_skills=["k8s"],
        required_skills=["K8s", "Kubernetes"],
    )
    assert res_k8s.total_required_count == 1
    assert res_k8s.matched_required_count == 1
    assert res_k8s.skill_score == 100.0
    assert res_k8s.matched_skills == ["K8s"]


def test_mixed_casing_and_whitespace_duplicates():
    """Verify whitespace and casing variations are properly canonicalized and deduplicated."""
    res = calculate_skill_match(
        candidate_skills=["docker"],
        required_skills=["  Docker  ", "docker", "DOCKER "],
    )
    assert res.total_required_count == 1
    assert res.matched_required_count == 1
    assert res.skill_score == 100.0
    assert res.matched_skills == ["Docker"]
    assert res.missing_skills == []


def test_candidate_skill_duplicates_and_aliases():
    """Verify candidate skills with duplicates/aliases do not artificially match multiple times."""
    cand = ["Python", "python", "py", "PYTHON"]
    req = ["Python", "FastAPI"]

    res = calculate_skill_match(candidate_skills=cand, required_skills=req)
    assert res.total_required_count == 2
    assert res.matched_required_count == 1
    assert res.skill_score == 50.0
    assert res.matched_skills == ["Python"]
    assert res.missing_skills == ["FastAPI"]


def test_matched_and_missing_skills_uniqueness_and_order():
    """Verify matched_skills and missing_skills maintain uniqueness and deterministic first-seen ordering."""
    req = ["TypeScript", "ts", "React", "reactjs", "Node.js", "nodejs"]
    cand = ["typescript", "node"]

    res = calculate_skill_match(candidate_skills=cand, required_skills=req)
    assert res.total_required_count == 3
    assert res.matched_required_count == 2
    assert res.matched_skills == ["TypeScript", "Node.js"]
    assert res.missing_skills == ["React"]

