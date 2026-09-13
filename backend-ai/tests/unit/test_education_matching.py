"""Unit tests for education level matching and degree rank extraction."""

from app.domain.matching.education_match import (
    _get_degree_rank,
    calculate_education_match,
)


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


def test_mba_requirement_vs_bootcamp_certificate():
    """Bootcamp Certificate must NOT match MBA as rank 2; must yield conservative baseline score 50."""
    res = calculate_education_match(
        candidate_degrees=["Bootcamp Certificate"],
        required_education="MBA",
    )
    assert res.score == 50.0
    assert "chưa được xác định tương đương" in res.comparison_text
    assert "MBA" in res.comparison_text


def test_mba_requirement_vs_mba():
    """MBA candidate exactly meets MBA requirement."""
    res = calculate_education_match(
        candidate_degrees=["MBA in Finance"],
        required_education="MBA",
    )
    assert res.score == 100.0
    assert "đáp ứng hoặc vượt" in res.comparison_text


def test_bachelor_requirement_vs_bsc():
    """BSc candidate meets Bachelor requirement via clear alias."""
    res = calculate_education_match(
        candidate_degrees=["BSc in Computer Science"],
        required_education="Bachelor",
    )
    assert res.score == 100.0


def test_master_requirement_vs_bachelor():
    """Bachelor candidate is exactly 1 level below Master requirement (score 75)."""
    res = calculate_education_match(
        candidate_degrees=["Bachelor of Science"],
        required_education="Master",
    )
    assert res.score == 75.0
    assert "gần tương đương" in res.comparison_text


def test_unknown_requirement_vs_known_candidate_degree():
    """Unrecognized job requirement cannot be ordinally compared (score 50 conservative)."""
    res = calculate_education_match(
        candidate_degrees=["Bachelor of Computer Science"],
        required_education="Specialized Guild Credential XYZ",
    )
    assert res.score == 50.0
    assert "chưa được xác định theo khung văn bằng chuẩn" in res.comparison_text


def test_known_requirement_vs_unknown_candidate_degree():
    """Unrecognized candidate degree does not satisfy recognized Bachelor requirement (score 50)."""
    res = calculate_education_match(
        candidate_degrees=["Fullstack Web Development Bootcamp"],
        required_education="Bachelor",
    )
    assert res.score == 50.0
    assert "chưa được xác định tương đương" in res.comparison_text


def test_unknown_requirement_vs_unknown_candidate_degree():
    """Both unrecognized values must NOT falsely return 100; conservative baseline 50."""
    res = calculate_education_match(
        candidate_degrees=["Non-standard Diploma 123"],
        required_education="Non-standard Credential 456",
    )
    assert res.score == 50.0
    assert "chưa được xác định theo khung chuẩn" in res.comparison_text


def test_missing_requirement_whitespace_and_none():
    """Missing or whitespace-only education requirement awards full score 100."""
    res_none = calculate_education_match(candidate_degrees=["High School"], required_education=None)
    assert res_none.score == 100.0

    res_empty = calculate_education_match(candidate_degrees=["High School"], required_education="")
    assert res_empty.score == 100.0

    res_ws = calculate_education_match(candidate_degrees=["High School"], required_education="   ")
    assert res_ws.score == 100.0


def test_missing_candidate_education():
    """Candidate providing no degrees when required receives baseline score 50."""
    res_empty = calculate_education_match(candidate_degrees=[], required_education="Bachelor")
    assert res_empty.score == 50.0
    assert "chưa cung cấp thông tin" in res_empty.comparison_text

    res_blank = calculate_education_match(candidate_degrees=["", "   "], required_education="Bachelor")
    assert res_blank.score == 50.0
    assert "chưa cung cấp thông tin" in res_blank.comparison_text


def test_candidate_exceeds_requirement():
    """Candidate holding a higher degree (e.g. Master) exceeds Bachelor requirement (score 100)."""
    res = calculate_education_match(
        candidate_degrees=["Master of Science in Data Science"],
        required_education="Bachelor",
    )
    assert res.score == 100.0


def test_candidate_multiple_degrees_highest_rank_evaluated():
    """Candidate with both non-degree certificate and valid degree is scored on highest degree."""
    res = calculate_education_match(
        candidate_degrees=["Bootcamp Certificate", "BSc in Software Engineering"],
        required_education="Bachelor",
    )
    assert res.score == 100.0


def test_degree_rank_extraction_and_alias_coverage():
    """Verify _get_degree_rank returns correct ranks for aliases and None for unknowns."""
    # Doctorate (rank 5)
    assert _get_degree_rank("Doctor of Philosophy") == 5
    assert _get_degree_rank("PhD in Robotics") == 5
    assert _get_degree_rank("Ph.D.") == 5
    assert _get_degree_rank("Tiến sĩ Toán tin") == 5

    # Master (rank 4)
    assert _get_degree_rank("Master of Science") == 4
    assert _get_degree_rank("MSc Artificial Intelligence") == 4
    assert _get_degree_rank("MS in CS") == 4
    assert _get_degree_rank("MBA") == 4
    assert _get_degree_rank("M.B.A.") == 4
    assert _get_degree_rank("Thạc sĩ Quản trị Kinh doanh") == 4

    # Bachelor (rank 3)
    assert _get_degree_rank("Bachelor of Engineering") == 3
    assert _get_degree_rank("Bachelor's Degree") == 3
    assert _get_degree_rank("BSc Computer Science") == 3
    assert _get_degree_rank("B.Sc.") == 3
    assert _get_degree_rank("BS in Math") == 3
    assert _get_degree_rank("B.S.") == 3
    assert _get_degree_rank("BEng Software") == 3
    assert _get_degree_rank("B.Eng.") == 3
    assert _get_degree_rank("BE Mechanical") == 3
    assert _get_degree_rank("B.E.") == 3
    assert _get_degree_rank("Cử nhân CNTT") == 3
    assert _get_degree_rank("Kỹ sư Phần mềm") == 3
    assert _get_degree_rank("Đại học Bách Khoa") == 3

    # Associate (rank 2)
    assert _get_degree_rank("Associate Degree") == 2
    assert _get_degree_rank("Cao đẳng Thực hành") == 2

    # High School (rank 1)
    assert _get_degree_rank("High School Diploma") == 1
    assert _get_degree_rank("THPT") == 1
    assert _get_degree_rank("Trung học phổ thông") == 1
    assert _get_degree_rank("Cấp 3") == 1

    # Unknown / Non-degree strings -> None (MUST NOT return 2)
    assert _get_degree_rank("Bootcamp Certificate") is None
    assert _get_degree_rank("Online Course Certificate") is None
    assert _get_degree_rank("Cybersecurity Specialist") is None
    assert _get_degree_rank("Systems Administrator") is None
    assert _get_degree_rank("Fullstack Web Developer") is None
    assert _get_degree_rank("Random Free Text") is None
    assert _get_degree_rank("") is None
    assert _get_degree_rank("   ") is None
    assert _get_degree_rank(None) is None
