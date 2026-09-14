"""Unit tests for work experience comparison."""

from app.domain.matching.experience_match import calculate_experience_match


def test_experience_match_exceeds_requirement():
    """Candidate with more years than required receives full 100 score."""
    res = calculate_experience_match(candidate_years=5.0, required_years=3.0)
    assert res.score == 100.0
    assert "vượt" in res.comparison_text


def test_experience_match_shortage():
    """Candidate with fewer years than required receives proportional score."""
    res = calculate_experience_match(candidate_years=1.5, required_years=3.0)
    assert res.score == 50.0
    assert "thiếu" in res.comparison_text


def test_experience_match_no_requirement():
    """When no requirement set, candidate gets 100 score."""
    res = calculate_experience_match(candidate_years=1.0, required_years=None)
    assert res.score == 100.0

