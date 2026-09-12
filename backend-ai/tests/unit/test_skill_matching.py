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


def test_calculate_skill_match_full():
    """All required and preferred skills matched yields 100 score."""
    cand = ["React", "TypeScript", "Docker", "Node.js"]
    req = ["React", "TypeScript"]
    pref = ["Docker"]

    res = calculate_skill_match(candidate_skills=cand, required_skills=req, preferred_skills=pref)
    assert res.skill_score == 100.0
    assert len(res.missing_skills) == 0
    assert len(res.matched_skills) >= 2


def test_calculate_skill_match_missing():
    """Missing required skills correctly deducted."""
    cand = ["React"]
    req = ["React", "Kubernetes", "Golang"]
    res = calculate_skill_match(candidate_skills=cand, required_skills=req)
    assert res.skill_score < 50.0
    assert "Kubernetes" in res.missing_skills
    assert "Golang" in res.missing_skills

