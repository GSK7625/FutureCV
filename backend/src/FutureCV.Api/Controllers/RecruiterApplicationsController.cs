using FutureCV.Application.Common.Models;
using FutureCV.Application.Features.Application.DTOs;
using FutureCV.Application.Features.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FutureCV.Api.Controllers;

/// <summary>
/// FCV-83: Recruiter Dashboard - Quản lý Application và xếp hạng Candidate
/// Bao gồm: P4-UC04, P4-UC05, P4-UC06, P4-UC07
/// </summary>
[Authorize(Roles = "Employer")]
[Route("api/recruiter/applications")]
public class RecruiterApplicationsController : ApiControllerBase
{
    private readonly IApplicationService _applicationService;

    public RecruiterApplicationsController(IApplicationService applicationService)
    {
        _applicationService = applicationService;
    }

    // =========================================================================
    // P4-UC04: Xem Application và CV
    // =========================================================================

    /// <summary>
    /// Lấy danh sách Application cho một Job cụ thể
    /// </summary>
    [HttpGet("job/{jobId:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(PagedResult<ApplicationListResponse>))]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetJobApplications(
        Guid jobId,
        [FromQuery] ApplicationFilterRequest filter,
        CancellationToken cancellationToken)
    {
        var result = await _applicationService.GetJobApplicationsAsync(
            GetCurrentUserId(), jobId, filter, cancellationToken);
        return ToHttpResult(result);
    }

    /// <summary>
    /// Lấy tất cả Applications của Recruiter (tất cả Jobs)
    /// </summary>
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(PagedResult<ApplicationListResponse>))]
    public async Task<IActionResult> GetAllApplications(
        [FromQuery] ApplicationFilterRequest filter,
        CancellationToken cancellationToken)
    {
        var result = await _applicationService.GetRecruiterAllApplicationsAsync(
            GetCurrentUserId(), filter, cancellationToken);
        return ToHttpResult(result);
    }

    /// <summary>
    /// Xem chi tiết Application và CV của ứng viên
    /// </summary>
    [HttpGet("{applicationId:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(ApplicationDetailResponse))]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetApplicationDetail(
        Guid applicationId,
        CancellationToken cancellationToken)
    {
        var result = await _applicationService.GetApplicationDetailAsync(
            GetCurrentUserId(), applicationId, cancellationToken);
        return ToHttpResult(result);
    }

    // =========================================================================
    // P4-UC05: Xếp hạng Candidate
    // =========================================================================

    /// <summary>
    /// Đánh giá và xếp hạng Candidate (1-5 sao)
    /// </summary>
    [HttpPost("{applicationId:guid}/rank")]
    [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(CandidateRankingResponse))]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RankCandidate(
        Guid applicationId,
        [FromBody] RankCandidateRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _applicationService.RankCandidateAsync(
            GetCurrentUserId(), applicationId, request, cancellationToken);
        return ToHttpResult(result);
    }

    // =========================================================================
    // P4-UC06: Cập nhật Application Status
    // =========================================================================

    /// <summary>
    /// Cập nhật trạng thái Application (Applied → Screening → Interview → Offer / Rejected)
    /// </summary>
    [HttpPatch("{applicationId:guid}/status")]
    [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(ApplicationDetailResponse))]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateApplicationStatus(
        Guid applicationId,
        [FromBody] UpdateApplicationStatusRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _applicationService.UpdateApplicationStatusAsync(
            GetCurrentUserId(), applicationId, request, cancellationToken);
        return ToHttpResult(result);
    }

    // =========================================================================
    // P4-UC07: Quản lý Recruitment Pipeline
    // =========================================================================

    /// <summary>
    /// Lấy Pipeline Dashboard cho một Job (Kanban view)
    /// </summary>
    [HttpGet("job/{jobId:guid}/pipeline")]
    [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(PipelineDashboardResponse))]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetPipelineDashboard(
        Guid jobId,
        CancellationToken cancellationToken)
    {
        var result = await _applicationService.GetPipelineDashboardAsync(
            GetCurrentUserId(), jobId, cancellationToken);
        return ToHttpResult(result);
    }

    /// <summary>
    /// Di chuyển Candidate giữa các stage trong Pipeline (drag & drop)
    /// </summary>
    [HttpPatch("move-stage")]
    [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(ApplicationDetailResponse))]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> MoveCandidateStage(
        [FromBody] MoveCandidateStageRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _applicationService.MoveCandidateStageAsync(
            GetCurrentUserId(), request, cancellationToken);
        return ToHttpResult(result);
    }
}
