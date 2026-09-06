namespace FutureCV.Application.Features.Application.DTOs;

// =====================================================================
// Request DTOs
// =====================================================================

/// <summary>
/// Request để Candidate ứng tuyển vào Job (P3-UC05)
/// </summary>
public sealed record CreateApplicationRequest(
    Guid JobId,
    Guid CvId,
    string? CoverLetter = null);

/// <summary>
/// Request để lọc và phân trang danh sách Application (P4-UC04, P3-UC06)
/// </summary>
public sealed record ApplicationFilterRequest(
    string? Status = null,           // Applied, Screening, Interview, Offer, Rejected, Withdrawn
    string? Keyword = null,          // Tìm theo tên candidate hoặc job title
    DateTime? FromDate = null,
    DateTime? ToDate = null,
    string? SortBy = "newest",       // newest, oldest, status
    int PageIndex = 1,
    int PageSize = 10);

/// <summary>
/// Request để cập nhật trạng thái Application (P4-UC06)
/// </summary>
public sealed record UpdateApplicationStatusRequest(
    string NewStatus,                 // Applied, Screening, Interview, Offer, Rejected
    string? Reason = null,
    string? Comment = null,
    bool SendNotification = true);

/// <summary>
/// Request để rút Application (P3-UC07)
/// </summary>
public sealed record WithdrawApplicationRequest(
    string Reason,                    // Lý do rút đơn
    string? Comment = null);

/// <summary>
/// Request để xếp hạng/đánh giá Candidate (P4-UC05)
/// </summary>
public sealed record RankCandidateRequest(
    int ManualRating,                 // 1-5 sao
    string? ReviewComment = null,
    List<string>? Tags = null,        // ["Top Talent", "Strong Consider"]
    string? PrivateNotes = null);

// =====================================================================
// Response DTOs
// =====================================================================

/// <summary>
/// Thông tin CV đính kèm trong Application
/// </summary>
public sealed record ApplicationCvResponse(
    Guid Id,
    string? Title,
    string? FileUrl,
    string? FileType);

/// <summary>
/// Thông tin Candidate trong Application (cho Recruiter)
/// </summary>
public sealed record ApplicationCandidateResponse(
    Guid Id,
    string FullName,
    string? Phone,
    string? Email,
    string? AvatarUrl,
    string? Summary,
    string? DesiredPosition,
    int? DesiredSalaryMin,
    int? DesiredSalaryMax);

/// <summary>
/// Thông tin Job trong Application (cho Candidate)
/// </summary>
public sealed record ApplicationJobResponse(
    Guid Id,
    string Title,
    string CompanyName,
    string? CompanyLogoUrl,
    string? LocationName,
    int? SalaryMin,
    int? SalaryMax,
    string SalaryCurrency,
    DateTime? Deadline,
    bool IsActive,
    bool IsExpired);

/// <summary>
/// Lịch sử thay đổi trạng thái
/// </summary>
public sealed record StatusHistoryResponse(
    Guid Id,
    string FromStatus,
    string ToStatus,
    string? Reason,
    string? Comment,
    string? ChangedByName,
    DateTimeOffset ChangedAt);

/// <summary>
/// Thông tin xếp hạng Candidate (P4-UC05)
/// </summary>
public sealed record CandidateRankingResponse(
    Guid Id,
    int RankPosition,
    int Score,
    int? ManualRating,
    string? ReviewComment,
    List<string>? Tags,
    string? RankedByName,
    DateTimeOffset ComputedAt);

/// <summary>
/// Response chi tiết Application (P4-UC04, P3-UC06)
/// </summary>
public sealed record ApplicationDetailResponse(
    Guid Id,
    Guid CandidateId,
    Guid JobId,
    Guid CvId,
    ApplicationCandidateResponse Candidate,
    ApplicationJobResponse Job,
    ApplicationCvResponse CV,
    string? CoverLetter,
    int? MatchScore,
    string? MatchExplanation,
    List<string>? MatchedSkills,
    List<string>? MissingSkills,
    string Status,
    DateTimeOffset AppliedAt,
    DateTimeOffset? LastStatusChangedAt,
    CandidateRankingResponse? Ranking,
    IReadOnlyList<StatusHistoryResponse> StatusHistory);

/// <summary>
/// Response danh sách Application (P4-UC04, P3-UC06)
/// </summary>
public sealed record ApplicationListResponse(
    Guid Id,
    Guid CandidateId,
    string CandidateName,
    string? CandidateEmail,
    string? CandidatePhone,
    Guid JobId,
    string JobTitle,
    string CompanyName,
    string Status,
    int? MatchScore,
    int? ManualRating,
    DateTimeOffset AppliedAt,
    DateTimeOffset? LastStatusChangedAt);

/// <summary>
/// Response sau khi tạo Application thành công (P3-UC05)
/// </summary>
public sealed record ApplicationCreatedResponse(
    Guid Id,
    Guid JobId,
    string JobTitle,
    string CompanyName,
    string Status,
    DateTimeOffset AppliedAt,
    string Message = "Ứng tuyển thành công!");

// =====================================================================
// Pipeline DTOs (P4-UC07)
// =====================================================================

/// <summary>
/// Thống kê theo từng giai đoạn Pipeline
/// </summary>
public sealed record PipelineStageStats(
    string StageName,
    string Status,
    int Count,
    int AvgDaysInStage);

/// <summary>
/// Candidate card trong Pipeline Kanban
/// </summary>
public sealed record PipelineCandidateCard(
    Guid ApplicationId,
    Guid CandidateId,
    string CandidateName,
    string? CandidateAvatar,
    string Status,
    int? MatchScore,
    int? ManualRating,
    List<string>? Tags,
    int DaysInCurrentStage,
    DateTimeOffset AppliedAt);

/// <summary>
/// Response Pipeline Dashboard (P4-UC07)
/// </summary>
public sealed record PipelineDashboardResponse(
    Guid JobId,
    string JobTitle,
    int TotalApplications,
    int ActiveApplications,
    IReadOnlyList<PipelineStageStats> Stages,
    Dictionary<string, IReadOnlyList<PipelineCandidateCard>> CandidatesByStage);

/// <summary>
/// Request để di chuyển Candidate giữa các stage (P4-UC07)
/// </summary>
public sealed record MoveCandidateStageRequest(
    Guid ApplicationId,
    string NewStage,                  // Applied -> Screening -> Interview -> Offer
    string? Reason = null);
