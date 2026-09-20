"""Unit tests for deterministic project domain relevance evaluator."""

from app.contracts.cv import ProjectItem
from app.domain.matching.project_match import evaluate_project_relevance
from app.domain.matching.scoring import MATCHING_ALGORITHM_VERSION


def test_project_relevance_matching_technologies():
    """Verify overlapping technologies are identified with alias normalization."""
    projects = [
        ProjectItem(
            name="E-Commerce API",
            technologies=["ReactJS", "FastAPI", "PostgreSQL"],
        ),
        ProjectItem(
            name="Mobile App",
            technologies=["Flutter", "Dart"],
        ),
    ]
    required_skills = ["React", "Python"]
    preferred_skills = ["Docker"]

    res = evaluate_project_relevance(
        projects=projects,
        required_skills=required_skills,
        preferred_skills=preferred_skills,
    )

    assert res.relevant_project_count == 1
    assert res.total_project_count == 2
    assert "React" in res.matched_technologies
    assert "1/2 dự án thực tế" in res.relevance_explanation


def test_project_relevance_no_overlap_honest_explanation():
    """Verify projects with no overlapping technologies honestly state non-relevance."""
    projects = [
        ProjectItem(name="PHP CMS", technologies=["Wordpress", "PHP", "MySQL"]),
    ]
    required_skills = ["Golang", "Kubernetes"]

    res = evaluate_project_relevance(
        projects=projects,
        required_skills=required_skills,
    )

    assert res.relevant_project_count == 0
    assert res.total_project_count == 1
    assert res.matched_technologies == []
    assert "chưa thể hiện sự trùng khớp" in res.relevance_explanation


def test_project_relevance_empty_projects():
    """Verify empty projects list states no project information provided."""
    res = evaluate_project_relevance(
        projects=[],
        required_skills=["Python", "FastAPI"],
    )

    assert res.relevant_project_count == 0
    assert res.total_project_count == 0
    assert "Chưa có thông tin dự án thực tế" in res.relevance_explanation


def test_project_relevance_job_without_skills():
    """Verify job without skills states relevance cannot be evaluated."""
    projects = [ProjectItem(name="Sample", technologies=["Python"])]
    res = evaluate_project_relevance(
        projects=projects,
        required_skills=[],
        preferred_skills=[],
    )

    assert res.relevant_project_count == 0
    assert "không có yêu cầu kỹ năng cụ thể" in res.relevance_explanation


def test_matching_algorithm_version_is_matching_v0():
    """Verify constant MATCHING_ALGORITHM_VERSION equals 'matching-v0'."""
    assert MATCHING_ALGORITHM_VERSION == "matching-v0"

