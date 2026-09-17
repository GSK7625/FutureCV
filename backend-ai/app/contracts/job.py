"""Contracts representing structured Job data."""

from pydantic import BaseModel, Field


class StructuredJob(BaseModel):
    """Normalized, structured representation of a Job Posting."""

    title: str = Field(description="Job title")
    description: str = Field(default="", description="Full job description")
    required_skills: list[str] = Field(default_factory=list, description="Mandatory skills required for the role")
    preferred_skills: list[str] = Field(default_factory=list, description="Nice-to-have or bonus skills")
    minimum_experience_years: float | None = Field(
        default=None,
        description="Minimum years of professional experience required",
    )
    education_requirement: str | None = Field(
        default=None,
        description="Minimum education degree required (e.g. Bachelor, Master)",
    )
    location: str | None = Field(default=None, description="Job location or remote")
    salary: str | None = Field(default=None, description="Salary or compensation range")
    employment_type: str | None = Field(default=None, description="Full-time, Part-time, Contract, etc.")

