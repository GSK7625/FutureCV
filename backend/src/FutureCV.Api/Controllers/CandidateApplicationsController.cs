using FutureCV.Application.Common.Models;
using FutureCV.Application.Features.Application.DTOs;
using FutureCV.Application.Features.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FutureCV.Api.Controllers;

/// <summary>
/// Candidate Application endpoints - P3-UC05, P3-UC06, P3-UC07
/// </summary>
[Authorize(Roles = "Candidate")]
[Route("api/candidate/applications")]
public class CandidateApplicationsController : ApiControllerBase
{
    private readonly IApplicationService _applicationService;

    public CandidateApplicationsController(IApplicationService applicationService)
    {
        _applicationService = applicationService;
    }

    // =========================================================================
    // P3-UC05: Ứng tuyển bằng CV đã chọn
    // =========================================================================

    /// <summary>
    /// Ứng tuyển vào Job với CV đã chọn
    /// </summary>
    [HttpPost]
    [ProducesResponseType(StatusCodes.Status201Created, Type = typeof(ApplicationCreatedResponse))]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> ApplyToJob(
        [FromBody] CreateApplicationRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _applicationService.ApplyToJobAsync(
            GetCurrentUserId(), request, cancellationToken);
        return ToHttpResult(result, created: true);
    }

    // =========================================================================
    // P3-UC06: Theo dõi Application
    // =========================================================================

    /// <summary>
    /// Lấy danh sách Application của Candidate
    /// </summary>
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(PagedResult<ApplicationListResponse>))]
    public async Task<IActionResult> GetMyApplications(
        [FromQuery] ApplicationFilterRequest filter,
        CancellationToken cancellationToken)
    {
        var result = await _applicationService.GetMyApplicationsAsync(
            GetCurrentUserId(), filter, cancellationToken);
        return ToHttpResult(result);
    }

    /// <summary>
    /// Xem chi tiết một Application
    /// </summary>
    [HttpGet("{applicationId:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(ApplicationDetailResponse))]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetMyApplicationDetail(
        Guid applicationId,
        CancellationToken cancellationToken)
    {
        var result = await _applicationService.GetMyApplicationDetailAsync(
            GetCurrentUserId(), applicationId, cancellationToken);
        return ToHttpResult(result);
    }

    // =========================================================================
    // P3-UC07: Rút Application
    // =========================================================================

    /// <summary>
    /// Rút đơn ứng tuyển
    /// </summary>
    [HttpPatch("{applicationId:guid}/withdraw")]
    [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(bool))]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> WithdrawApplication(
        Guid applicationId,
        [FromBody] WithdrawApplicationRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _applicationService.WithdrawApplicationAsync(
            GetCurrentUserId(), applicationId, request, cancellationToken);
        return ToHttpResult(result);
    }
}
