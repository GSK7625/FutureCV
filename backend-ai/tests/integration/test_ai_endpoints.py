"""Integration tests for all AI service HTTP endpoints."""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_cv_analyze_text_endpoint():
    """Verify POST /api/v1/cv/analyze-text parses raw text into structured CV and analysis."""
    payload = {
        "raw_text": (
            "Nguyễn Văn B - Senior Backend Engineer. Skills: Python, FastAPI, Docker. 3 years experience at ABC."
        ),
        "candidate_id": "cand-test-01",
    }
    response = client.post("/api/v1/cv/analyze-text", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "cv_score" in data
    assert "structured_cv" in data
    assert "strengths" in data
    assert "improvement_suggestions" in data
    assert "meta" in data


def test_cv_improve_endpoint_alias():
    """Verify POST /api/v1/cv/improve compatibility alias returns quality evaluation."""
    payload = {
        "raw_text": "Trần Thị C - Frontend Developer. Skills: React, CSS.",
    }
    response = client.post("/api/v1/cv/improve", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "cv_score" in data
    assert "improvement_suggestions" in data


def test_job_match_endpoint():
    """Verify POST /api/v1/job/match compares CV and Job successfully."""
    payload = {
        "cv": {
            "full_name": "Lê Văn D",
            "skills": ["Python", "FastAPI", "PostgreSQL"],
            "work_experience": [{"job_title": "Backend Dev", "years_of_experience": 2.5}],
            "education": [{"degree": "Bachelor of IT"}],
        },
        "job": {
            "title": "Python Developer",
            "required_skills": ["Python", "FastAPI"],
            "preferred_skills": ["Docker"],
            "minimum_experience_years": 2.0,
            "education_requirement": "Bachelor",
        },
    }
    response = client.post("/api/v1/job/match", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "match_score" in data
    assert data["match_score"] >= 70
    assert "matched_skills" in data
    assert "Python" in data["matched_skills"]
    assert "match_explanation" in data


def test_candidates_rank_endpoint():
    """Verify POST /api/v1/candidates/rank evaluates pool of candidates."""
    payload = {
        "job": {
            "title": "Backend Engineer",
            "required_skills": ["C#", ".NET"],
            "minimum_experience_years": 3.0,
        },
        "candidates": [
            {
                "candidate_id": "c1",
                "cv": {
                    "full_name": "Candidate 1",
                    "skills": ["C#", ".NET"],
                    "work_experience": [{"job_title": "Lead", "years_of_experience": 4.0}],
                },
            },
            {
                "candidate_id": "c2",
                "cv": {
                    "full_name": "Candidate 2",
                    "skills": ["PHP"],
                    "work_experience": [],
                },
            },
        ],
    }
    response = client.post("/api/v1/candidates/rank", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["total_evaluated"] == 2
    assert len(data["ranked_candidates"]) == 2
    assert data["ranked_candidates"][0]["rank"] == 1
    assert data["ranked_candidates"][0]["candidate_id"] == "c1"


def test_career_chat_endpoint():
    """Verify POST /api/v1/career/chat returns conversational advice."""
    payload = {
        "message": "Làm thế nào để cải thiện điểm phù hợp với công việc .NET Backend?",
        "history": [],
        "context": {
            "candidate_id": "cand-001",
            "cv": {
                "full_name": "Phạm Văn E",
                "skills": ["C#"],
                "work_experience": [],
                "education": [],
            },
        },
    }
    response = client.post("/api/v1/career/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "reply" in data
    assert len(data["reply"]) > 0
    assert "suggested_followups" in data


def test_career_chat_endpoint_with_match_result_and_missing_match_result():
    """Verify /api/v1/career/chat grounds on match_result or discloses absence when missing."""
    with_match = {
        "message": "Giải thích điểm phù hợp của tôi.",
        "history": [],
        "context": {
            "cv": {"skills": ["Python", "FastAPI"]},
            "job": {"title": "Python Dev", "required_skills": ["Python", "FastAPI", "Docker"]},
            "match_result": {
                "match_score": 76,
                "matched_skills": ["Python", "FastAPI"],
                "missing_skills": ["Docker"],
                "experience_comparison": "2 năm phù hợp.",
                "education_comparison": "Cử nhân CNTT.",
                "project_domain_relevance": "Dự án API liên quan.",
                "match_explanation": "Khớp 2/3 kỹ năng bắt buộc.",
            },
        },
    }
    resp_ok = client.post("/api/v1/career/chat", json=with_match)
    assert resp_ok.status_code == 200
    assert "76/100" in resp_ok.json()["reply"]

    without_match = {
        "message": "Tôi phù hợp không?",
        "history": [],
        "context": {
            "cv": {"skills": ["Python"]},
            "job": {"title": "Python Dev", "required_skills": ["Python", "Docker"]},
            "match_result": None,
        },
    }
    resp_no_match = client.post("/api/v1/career/chat", json=without_match)
    assert resp_no_match.status_code == 200
    assert "không có điểm Matching chính thức" in resp_no_match.json()["reply"]


def test_career_chat_endpoint_with_enriched_cv_and_evaluation():
    """Verify /api/v1/career/chat accepts enriched CV fields and cv_evaluation."""
    payload = {
        "message": "Tôi nên cải thiện điểm CV như thế nào?",
        "history": [],
        "context": {
            "cv": {
                "career_summary": "Backend Developer",
                "skills": ["C#", ".NET"],
                "work_experience": [
                    {
                        "job_title": "Backend Engineer",
                        "company": "FutureTech",
                        "years_of_experience": 3.0,
                        "description": "Developed REST APIs",
                    }
                ],
                "education": [{"degree": "Bachelor", "institution": "HUST", "field_of_study": "IT"}],
                "projects": [{"name": "Payment API", "technologies": [".NET", "Redis"]}],
                "certificates": ["AWS SAA"],
            },
            "cv_evaluation": {
                "cv_score": 84,
                "strengths": ["Good API experience"],
                "weaknesses": ["Missing metrics"],
                "improvement_suggestions": ["Add latency numbers"],
            },
        },
    }
    response = client.post("/api/v1/career/chat", json=payload)
    assert response.status_code == 200
    assert "84/100" in response.json()["reply"]


def test_career_chat_endpoint_english_cover_letter_and_dynamic_followups():
    """Verify /api/v1/career/chat supports English Cover Letter and returns dynamic contextual follow-ups."""
    payload = {
        "message": "Viết Cover Letter bằng tiếng Anh cho vị trí này.",
        "history": [],
        "context": {
            "cv": {
                "career_summary": "Backend Engineer",
                "skills": ["Python", "FastAPI"],
                "work_experience": [{"job_title": "Backend Engineer", "company": "TechCo", "years_of_experience": 2.0}],
            },
            "job": {
                "title": "Python Backend Developer",
                "required_skills": ["Python", "FastAPI", "Docker"],
            },
        },
    }
    response = client.post("/api/v1/career/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "Dear Hiring Manager" in data["reply"]
    assert 2 <= len(data["suggested_followups"]) <= 3
    assert "<<<FOLLOWUPS>>>" not in data["reply"]
