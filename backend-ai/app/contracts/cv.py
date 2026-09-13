"""Contracts representing structured CV data."""

from typing import Annotated

from pydantic import BaseModel, Field


class WorkExperienceItem(BaseModel):
    """Work experience entry in structured CV."""

    job_title: str = Field(max_length=300, description="Job title or role")
    company: str = Field(default="", max_length=200, description="Company or organization name")
    duration: str = Field(default="", max_length=100, description="Period or duration of employment")
    start_date: str | None = Field(
        default=None,
        max_length=50,
        description="Normalized start date (e.g. YYYY-MM or YYYY-MM-DD)",
    )
    end_date: str | None = Field(
        default=None,
        max_length=50,
        description="Normalized end date (e.g. YYYY-MM or YYYY-MM-DD), or None if current/ongoing",
    )
    years_of_experience: float = Field(
        default=0.0,
        ge=0.0,
        le=60.0,
        description="Estimated years of experience in this role (0 to 60)",
    )
    description: str = Field(default="", max_length=8000, description="Key responsibilities and achievements")


class EducationItem(BaseModel):
    """Education entry in structured CV."""

    degree: str = Field(max_length=200, description="Degree or qualification (e.g. Bachelor, Master)")
    institution: str = Field(default="", max_length=200, description="University or educational institution")
    field_of_study: str = Field(default="", max_length=200, description="Major or specialization")
    graduation_year: str | None = Field(default=None, max_length=50, description="Year of completion")


class ProjectItem(BaseModel):
    """Project entry in structured CV."""

    name: str = Field(max_length=300, description="Project title or name")
    description: str = Field(default="", max_length=8000, description="Project overview and role")
    technologies: list[Annotated[str, Field(max_length=200)]] = Field(
        default_factory=list,
        max_length=100,
        description="Technologies and tools used",
    )


class StructuredCv(BaseModel):
    """Normalized, structured representation of a candidate's CV."""

    full_name: str | None = Field(default=None, max_length=200, description="Candidate full name")
    email: str | None = Field(default=None, max_length=256, description="Candidate email address")
    phone: str | None = Field(default=None, max_length=50, description="Candidate phone number")
    career_summary: str | None = Field(default=None, max_length=4000, description="Professional summary or bio")
    skills: list[Annotated[str, Field(max_length=200)]] = Field(
        default_factory=list,
        max_length=100,
        description="List of technical and soft skills",
    )
    work_experience: list[WorkExperienceItem] = Field(
        default_factory=list,
        max_length=30,
        description="Chronological work history",
    )
    education: list[EducationItem] = Field(
        default_factory=list,
        max_length=20,
        description="Academic background",
    )
    certificates: list[Annotated[str, Field(max_length=300)]] = Field(
        default_factory=list,
        max_length=50,
        description="Certifications and licenses",
    )
    projects: list[ProjectItem] = Field(
        default_factory=list,
        max_length=30,
        description="Key projects completed",
    )
    technologies: list[Annotated[str, Field(max_length=200)]] = Field(
        default_factory=list,
        max_length=100,
        description="Technologies and frameworks",
    )
