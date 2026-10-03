"""Unit tests for work experience comparison and timeline overlap calculation."""

from datetime import date

from app.contracts.cv import WorkExperienceItem
from app.domain.matching.experience_match import (
    calculate_experience_match,
    calculate_total_experience_years,
)


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


def test_calculate_total_experience_no_experience():
    """Empty work experience list returns 0.0 years."""
    assert calculate_total_experience_years([]) == 0.0


def test_calculate_total_experience_single_experience():
    """Single experience calculates correct duration."""
    exp_with_date = [
        WorkExperienceItem(
            job_title="Software Engineer",
            start_date="2020-01",
            end_date="2023-01",
            years_of_experience=3.0,
        )
    ]
    assert calculate_total_experience_years(exp_with_date) == 3.0

    exp_scalar_only = [
        WorkExperienceItem(
            job_title="Backend Developer",
            years_of_experience=2.5,
        )
    ]
    assert calculate_total_experience_years(exp_scalar_only) == 2.5


def test_calculate_total_experience_non_overlapping():
    """Sequential non-overlapping roles are summed correctly."""
    exps = [
        WorkExperienceItem(
            job_title="Junior Dev",
            start_date="2020-01",
            end_date="2021-01",
            years_of_experience=1.0,
        ),
        WorkExperienceItem(
            job_title="Senior Dev",
            start_date="2022-01",
            end_date="2024-01",
            years_of_experience=2.0,
        ),
    ]
    # 1.0 year + 2.0 years = 3.0 years
    assert calculate_total_experience_years(exps) == 3.0


def test_calculate_total_experience_fully_overlapping():
    """Fully concurrent roles are merged without double-counting."""
    exps = [
        WorkExperienceItem(
            job_title="Fullstack Developer",
            company="Company A",
            start_date="2021-01",
            end_date="2024-01",
            years_of_experience=3.0,
        ),
        WorkExperienceItem(
            job_title="Freelance Developer",
            company="Freelance",
            start_date="2022-01",
            end_date="2023-01",
            years_of_experience=1.0,
        ),
    ]
    # Freelance (2022-2023) is completely within Company A (2021-2024) -> total 3.0 years, not 4.0
    assert calculate_total_experience_years(exps) == 3.0


def test_calculate_total_experience_partially_overlapping():
    """Partially overlapping roles merge into a unified timeline span."""
    exps = [
        WorkExperienceItem(
            job_title="Backend Developer",
            start_date="2022-01",
            end_date="2023-01",
            years_of_experience=1.0,
        ),
        WorkExperienceItem(
            job_title="Freelance Tech Lead",
            start_date="2022-06",
            end_date="2024-01",
            years_of_experience=1.6,
        ),
    ]
    # 2022-01 -> 2023-01 and 2022-06 -> 2024-01 merge to 2022-01 -> 2024-01 = 2.0 years, not 2.6
    assert calculate_total_experience_years(exps) == 2.0


def test_calculate_total_experience_adjacent_intervals():
    """Back-to-back adjacent roles merge seamlessly."""
    exps = [
        WorkExperienceItem(
            job_title="Role 1",
            start_date="2020-01",
            end_date="2022-01",
            years_of_experience=2.0,
        ),
        WorkExperienceItem(
            job_title="Role 2",
            start_date="2022-01",
            end_date="2024-01",
            years_of_experience=2.0,
        ),
    ]
    # 2020-01 to 2024-01 = 4.0 years
    assert calculate_total_experience_years(exps) == 4.0


def test_calculate_total_experience_duplicate_entries():
    """Exact duplicate entries are deduplicated whether dates are present or absent."""
    # With dates:
    exps_dates = [
        WorkExperienceItem(
            job_title="Backend Engineer",
            company="VNG",
            start_date="2022-01",
            end_date="2023-01",
            years_of_experience=1.0,
        ),
        WorkExperienceItem(
            job_title="Backend Engineer",
            company="VNG",
            start_date="2022-01",
            end_date="2023-01",
            years_of_experience=1.0,
        ),
    ]
    assert calculate_total_experience_years(exps_dates) == 1.0

    # Without dates (scalar duplicate):
    exps_scalar = [
        WorkExperienceItem(
            job_title="Backend Engineer",
            company="VNG",
            years_of_experience=2.0,
        ),
        WorkExperienceItem(
            job_title="Backend Engineer",
            company="VNG",
            years_of_experience=2.0,
        ),
    ]
    assert calculate_total_experience_years(exps_scalar) == 2.0


def test_calculate_total_experience_ongoing_role_with_injected_reference_date():
    """Ongoing roles resolve against injected reference date deterministically."""
    exps = [
        WorkExperienceItem(
            job_title="Tech Lead",
            start_date="2022-01",
            end_date=None,  # Ongoing role
            years_of_experience=2.0,
        )
    ]
    fixed_ref_date = date(2024, 1, 1)
    # 2022-01 to 2024-01 = 2.0 years
    assert calculate_total_experience_years(exps, reference_date=fixed_ref_date) == 2.0


def test_calculate_total_experience_invalid_dates_fallback():
    """Invalid interval (start > end) safely falls back to valid scalar years without crashing."""
    exps = [
        WorkExperienceItem.model_construct(
            job_title="Developer",
            company="",
            start_date="2025-01",
            end_date="2022-01",  # Invalid: end before start
            years_of_experience=1.5,
            duration="",
        )
    ]
    assert calculate_total_experience_years(exps) == 1.5


def test_calculate_total_experience_scalar_sum_fallback_when_dates_absent():
    """When dates are absent, deduplicated scalar years are summed as documented limitation."""
    exps = [
        WorkExperienceItem(
            job_title="Backend Developer",
            company="Company A",
            years_of_experience=2.0,
        ),
        WorkExperienceItem(
            job_title="Frontend Developer",
            company="Company B",
            years_of_experience=3.0,
        ),
    ]
    # Without temporal coordinates, 2.0 + 3.0 = 5.0 years
    assert calculate_total_experience_years(exps) == 5.0


def test_calculate_total_experience_malformed_end_date_does_not_become_ongoing():
    """
    CRITICAL PROOF (FIX A): Malformed end_date MUST NOT be interpreted as ongoing employment.
    If treated as ongoing from 2020-01 to 2026-01, it would yield 6.0 years.
    Instead, it must reject the invalid interval and safely use the scalar fallback (1.0 year).
    """
    exps = [
        WorkExperienceItem(
            job_title="Backend Developer",
            start_date="2020-01",
            end_date="invalid-garbage-date",
            years_of_experience=1.0,
        )
    ]
    ref_date = date(2026, 1, 1)
    total = calculate_total_experience_years(exps, reference_date=ref_date)
    assert total == 1.0
    assert total != 6.0


def test_calculate_total_experience_malformed_start_date_fallback():
    """Malformed start_date invalidates the interval and falls back to scalar years."""
    exps = [
        WorkExperienceItem(
            job_title="Backend Developer",
            start_date="not-a-valid-date",
            end_date="2024-01",
            years_of_experience=2.5,
        )
    ]
    assert calculate_total_experience_years(exps) == 2.5


def test_calculate_total_experience_explicit_ongoing_tokens():
    """Explicit recognized ongoing tokens ('present', 'current', 'ongoing', 'hiện tại') use reference_date."""
    ref_date = date(2024, 1, 1)
    tokens = ["present", "current", "ongoing", "hiện tại", "  PRESENT  "]
    for token in tokens:
        exps = [
            WorkExperienceItem(
                job_title="Engineer",
                start_date="2022-01",
                end_date=token,
                years_of_experience=2.0,
            )
        ]
        assert calculate_total_experience_years(exps, reference_date=ref_date) == 2.0


def test_calculate_total_experience_empty_string_end_date_not_ongoing():
    """
    CRITICAL PROOF (BLOCKER 2): Empty string end_date ('') indicates missing/unusable date info, NOT ongoing.
    The interval is rejected, falling back to scalar years_of_experience (1.0).
    It must NEVER expand to reference_date (which would yield 6.0 years from 2020-01 to 2026-01).
    """
    exps = [
        WorkExperienceItem(
            job_title="Backend Developer",
            start_date="2020-01",
            end_date="",
            years_of_experience=1.0,
        )
    ]
    ref_date = date(2026, 1, 1)
    total = calculate_total_experience_years(exps, reference_date=ref_date)
    assert total == 1.0
    assert total != 6.0


def test_calculate_total_experience_none_end_date_is_ongoing():
    """StructuredCv schema defines end_date=None as ongoing/current employment."""
    exps = [
        WorkExperienceItem(
            job_title="Backend Developer",
            start_date="2022-01",
            end_date=None,
            years_of_experience=2.0,
        )
    ]
    ref_date = date(2024, 1, 1)
    # 2022-01 to 2024-01 = 2.0 years
    assert calculate_total_experience_years(exps, reference_date=ref_date) == 2.0


def test_calculate_total_experience_present_end_date_is_ongoing():
    """Literal token 'present' resolves against reference_date as ongoing employment."""
    exps = [
        WorkExperienceItem(
            job_title="Backend Developer",
            start_date="2022-01",
            end_date="present",
            years_of_experience=2.0,
        )
    ]
    ref_date = date(2024, 1, 1)
    assert calculate_total_experience_years(exps, reference_date=ref_date) == 2.0


def test_calculate_total_experience_invalid_end_date_falls_back():
    """Malformed non-date end_date is rejected and falls back to scalar years."""
    exps = [
        WorkExperienceItem(
            job_title="Backend Developer",
            start_date="2020-01",
            end_date="not-a-date",
            years_of_experience=1.0,
        )
    ]
    ref_date = date(2026, 1, 1)
    total = calculate_total_experience_years(exps, reference_date=ref_date)
    assert total == 1.0
    assert total != 6.0


def test_calculate_total_experience_mixed_dated_and_undated_conservative():
    """
    CRITICAL PROOF (FIX B): When a valid dated timeline exists, it is authoritative.
    Undated roles are NOT blindly added to avoid double-counting overlapping unplaced roles.
    """
    exps = [
        WorkExperienceItem(
            job_title="Backend Developer",
            company="Company A",
            start_date="2022-01",
            end_date="2024-01",
            years_of_experience=2.0,
        ),
        WorkExperienceItem(
            job_title="Freelance Developer",
            company="Freelance",
            start_date=None,
            end_date=None,
            years_of_experience=1.5,
        ),
    ]
    # Authoritative dated timeline = 2.0 years (NOT 3.5 years double-counted)
    assert calculate_total_experience_years(exps) == 2.0
