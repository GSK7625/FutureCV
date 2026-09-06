using FutureCV.Application.Common.Models;
using FutureCV.Application.Features.Application.DTOs;

namespace FutureCV.Application.Features.Application.Interfaces;

/// <summary>
/// Service interface cho quản lý Application và Recruitment Pipeline
/// Bao gồm: P3-UC05, P3-UC06, P3-UC07, P4-UC04, P4-UC05, P4-UC06, P4-UC07
/// </summary>
public interface IApplicationService
{
    // =====================================================================
    // CANDIDATE USE CASES
    // =====================================================================
    
    /// <summary>
    /// P3-UC05: Candidate ứng tuyển vào Job bằng CV đã chọn
    /// </summary>
    Task<ServiceResult<ApplicationCreatedResponse>> ApplyToJobAsync(
        Guid candidateUserId,
        CreateApplicationRequest request,
        CancellationToken cancellationToken = default);
    
    /// <summary>
    /// P3-UC06: Candidate theo dõi danh sách Application của mình
    /// </summary>
    Task<ServiceResult<PagedResult<ApplicationListResponse>>> GetMyApplicationsAsync(
        Guid candidateUserId,
        ApplicationFilterRequest filter,
        CancellationToken cancellationToken = default);
    
    /// <summary>
    /// P3-UC06: Candidate xem chi tiết một Application
    /// </summary>
    Task<ServiceResult<ApplicationDetailResponse>> GetMyApplicationDetailAsync(
        Guid candidateUserId,
        Guid applicationId,
        CancellationToken cancellationToken = default);
    
    /// <summary>
    /// P3-UC07: Candidate rút Application
    /// </summary>
    Task<ServiceResult<bool>> WithdrawApplicationAsync(
        Guid candidateUserId,
        Guid applicationId,
        WithdrawApplicationRequest request,
        CancellationToken cancellationToken = default);
    
    // =====================================================================
    // RECRUITER USE CASES
    // =====================================================================
    
    /// <summary>
    /// P4-UC04: Recruiter xem danh sách Application cho Job của mình
    /// </summary>
    Task<ServiceResult<PagedResult<ApplicationListResponse>>> GetJobApplicationsAsync(
        Guid recruiterUserId,
        Guid jobId,
        ApplicationFilterRequest filter,
        CancellationToken cancellationToken = default);
    
    /// <summary>
    /// P4-UC04: Recruiter xem chi tiết Application và CV của ứng viên
    /// </summary>
    Task<ServiceResult<ApplicationDetailResponse>> GetApplicationDetailAsync(
        Guid recruiterUserId,
        Guid applicationId,
        CancellationToken cancellationToken = default);
    
    /// <summary>
    /// P4-UC05: Recruiter xếp hạng và đánh giá Candidate
    /// </summary>
    Task<ServiceResult<CandidateRankingResponse>> RankCandidateAsync(
        Guid recruiterUserId,
        Guid applicationId,
        RankCandidateRequest request,
        CancellationToken cancellationToken = default);
    
    /// <summary>
    /// P4-UC06: Recruiter cập nhật trạng thái Application
    /// </summary>
    Task<ServiceResult<ApplicationDetailResponse>> UpdateApplicationStatusAsync(
        Guid recruiterUserId,
        Guid applicationId,
        UpdateApplicationStatusRequest request,
        CancellationToken cancellationToken = default);
    
    /// <summary>
    /// P4-UC07: Recruiter xem Pipeline Dashboard cho một Job
    /// </summary>
    Task<ServiceResult<PipelineDashboardResponse>> GetPipelineDashboardAsync(
        Guid recruiterUserId,
        Guid jobId,
        CancellationToken cancellationToken = default);
    
    /// <summary>
    /// P4-UC07: Di chuyển Candidate giữa các stage trong Pipeline (auto-update status)
    /// </summary>
    Task<ServiceResult<ApplicationDetailResponse>> MoveCandidateStageAsync(
        Guid recruiterUserId,
        MoveCandidateStageRequest request,
        CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Lấy danh sách tất cả Applications của Recruiter (tất cả Jobs)
    /// </summary>
    Task<ServiceResult<PagedResult<ApplicationListResponse>>> GetRecruiterAllApplicationsAsync(
        Guid recruiterUserId,
        ApplicationFilterRequest filter,
        CancellationToken cancellationToken = default);
}
