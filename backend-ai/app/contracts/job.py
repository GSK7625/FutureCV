"""Contracts representing structured Job data."""

from typing import Annotated

from pydantic import BaseModel, Field


class StructuredJob(BaseModel):
    """Normalized, structured representation of a Job Posting."""

    title: str = Field(max_length=300, description="Job title")
    description: str = Field(default="", max_length=20000, description="Full job description")
    required_skills: list[Annotated[str, Field(max_length=200)]] = Field(
        default_factory=list,
        max_length=100,
        description="Mandatory skills required for the role",
    )
    preferred_skills: list[Annotated[str, Field(max_length=200)]] = Field(
        default_factory=list,
        max_length=100,
        description="Nice-to-have or bonus skills",
    )
    minimum_experience_years: float | None = Field(
        default=None,
        ge=0.0,
        le=60.0,
        description="Minimum years of professional experience required (0 to 60)",
    )
    education_requirement: str | None = Field(
        default=None,
        max_length=1000,
        description="Minimum education degree required (e.g. Bachelor, Master)",
    )
    location: str | None = Field(default=None, max_length=300, description="Job location or remote")
    salary: str | None = Field(default=None, max_length=200, description="Salary or compensation range")
    employment_type: str | None = Field(
        default=None,
        max_length=100,
        description="Full-time, Part-time, Contract, etc.",
    )
