"""Contracts representing structured CV data."""

from pydantic import BaseModel, Field


class WorkExperienceItem(BaseModel):
    """Work experience entry in structured CV."""

    job_title: str = Field(description="Job title or role")
    company: str = Field(default="", description="Company or organization name")
    duration: str = Field(default="", description="Period or duration of employment")
    years_of_experience: float = Field(default=0.0, description="Estimated years of experience in this role")
    description: str = Field(default="", description="Key responsibilities and achievements")


class EducationItem(BaseModel):
    """Education entry in structured CV."""

    degree: str = Field(description="Degree or qualification (e.g. Bachelor, Master)")
    institution: str = Field(default="", description="University or educational institution")
    field_of_study: str = Field(default="", description="Major or specialization")
    graduation_year: str | None = Field(default=None, description="Year of completion")


class ProjectItem(BaseModel):
    """Project entry in structured CV."""

    name: str = Field(description="Project title or name")
    description: str = Field(default="", description="Project overview and role")
    technologies: list[str] = Field(default_factory=list, description="Technologies and tools used")


class StructuredCv(BaseModel):
    """Normalized, structured representation of a candidate's CV."""

    full_name: str | None = Field(default=None, description="Candidate full name")
    email: str | None = Field(default=None, description="Candidate email address")
    phone: str | None = Field(default=None, description="Candidate phone number")
    career_summary: str | None = Field(default=None, description="Professional summary or bio")
    skills: list[str] = Field(default_factory=list, description="List of technical and soft skills")
    work_experience: list[WorkExperienceItem] = Field(default_factory=list, description="Chronological work history")
    education: list[EducationItem] = Field(default_factory=list, description="Academic background")
    certificates: list[str] = Field(default_factory=list, description="Certifications and licenses")
    projects: list[ProjectItem] = Field(default_factory=list, description="Key projects completed")
    technologies: list[str] = Field(default_factory=list, description="Technologies and frameworks")

