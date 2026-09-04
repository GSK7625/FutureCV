"""Contracts for CV Analysis feature."""

from pydantic import BaseModel, Field

from app.contracts.common import ResponseMeta
from app.contracts.cv import StructuredCv


class CvAnalysisContentRequest(BaseModel):
    """Request payload when sending trusted raw text or pre-extracted content instead of PDF file."""

    raw_text: str = Field(description="Raw extracted text of the CV document")
    candidate_id: str | None = Field(default=None, description="Optional candidate identifier for tracking")


class CvAnalysisResponse(BaseModel):
    """Result of CV analysis containing structured extraction and quality evaluation."""

    structured_cv: StructuredCv = Field(description="Extracted structured CV information")
    cv_score: int = Field(description="Overall CV quality score between 0 and 100", ge=0, le=100)
    strengths: list[str] = Field(default_factory=list, description="Key structural and content strengths identified")
    weaknesses: list[str] = Field(default_factory=list, description="Weaknesses or missing critical components")
    improvement_suggestions: list[str] = Field(
        default_factory=list,
        description="Actionable suggestions to improve CV quality and impact",
    )
    meta: ResponseMeta = Field(default_factory=ResponseMeta, description="Execution metadata")

