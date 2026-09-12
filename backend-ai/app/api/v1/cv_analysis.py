"""Endpoints for CV Analysis and Quality Evaluation."""

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from app.api.deps import get_cv_analyzer_service, verify_internal_api_key
from app.application.cv_analyzer import CvAnalyzerService
from app.contracts.cv_analysis import CvAnalysisContentRequest, CvAnalysisResponse

router = APIRouter(
    prefix="/cv",
    tags=["CV Analyzer"],
    dependencies=[Depends(verify_internal_api_key)],
)


@router.post(
    "/analyze",
    response_model=CvAnalysisResponse,
    status_code=status.HTTP_200_OK,
    summary="Upload PDF CV or send raw text for structured extraction and quality scoring",
)
async def analyze_cv_file(
    file: UploadFile = File(..., description="PDF format CV file"),
    service: CvAnalyzerService = Depends(get_cv_analyzer_service),
) -> CvAnalysisResponse:
    """
    CV Analyzer pipeline:
    1. Read and validate PDF document.
    2. Extract text with security and size constraints.
    3. Extract structured CV entities using LLM.
    4. Deterministically score completeness and generate improvement advice.
    """
    is_pdf_content_type = file.content_type == "application/pdf"
    is_pdf_extension = bool(file.filename and file.filename.lower().endswith(".pdf"))

    if not is_pdf_content_type and not is_pdf_extension:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Only PDF documents are supported for CV analysis",
        )

    file_bytes = await file.read()
    return await service.analyze_pdf(file_bytes)


@router.post(
    "/analyze-text",
    response_model=CvAnalysisResponse,
    status_code=status.HTTP_200_OK,
    summary="Analyze trusted pre-extracted CV text directly",
)
async def analyze_cv_text(
    req: CvAnalysisContentRequest,
    service: CvAnalyzerService = Depends(get_cv_analyzer_service),
) -> CvAnalysisResponse:
    """Analyze pre-extracted CV text content provided directly by ASP.NET Core."""
    return await service.analyze_text(req.raw_text)


@router.post(
    "/improve",
    response_model=CvAnalysisResponse,
    status_code=status.HTTP_200_OK,
    summary="Compatibility endpoint: Evaluate CV and return concrete improvement suggestions",
)
async def improve_cv(
    req: CvAnalysisContentRequest,
    service: CvAnalyzerService = Depends(get_cv_analyzer_service),
) -> CvAnalysisResponse:
    """
    Compatibility alias for CV improvement.
    CV improvement is part of CvAnalysis and returns quality score with actionable suggestions.
    """
    return await service.analyze_text(req.raw_text)
