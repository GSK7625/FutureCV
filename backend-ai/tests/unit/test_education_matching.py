"""Unit tests for education level matching."""

from app.domain.matching.education_match import calculate_education_match


def test_education_match_meets_requirement():
    """Candidate with required degree receives full score."""
    res = calculate_education_match(candidate_degrees=["Bachelor of Engineering"], required_education="Bachelor")
    assert res.score == 100.0


def test_education_match_no_requirement():
    """No requirement yields 100 score."""
    res = calculate_education_match(candidate_degrees=[], required_education=None)
    assert res.score == 100.0


def test_education_match_lower_degree():
    """Candidate with lower degree receives partial score."""
    res = calculate_education_match(candidate_degrees=["High School"], required_education="Bachelor")
    assert res.score <= 75.0

