namespace FutureCV.Application.Features.Admin.DTOs;

public sealed record AdminUserResponse(
    Guid Id,
    string Email,
    string? Phone,
    string? FullName,
    IReadOnlyList<string> Roles,
    bool IsLockedOut,
    DateTimeOffset? LockoutEnd,
    DateTimeOffset CreatedAt);

public sealed record LockUserRequest(
    string Reason);

public sealed record UpdateCompanyStatusRequest(
    string Status,
    string? Note);

public sealed record AuditLogResponse(
    Guid Id,
    Guid? UserId,
    string Action,
    string? EntityType,
    string? EntityId,
    string? PayloadJson,
    string? IpAddress,
    DateTime CreatedAt);

public sealed record UserQueryFilter(
    string? Search = null,
    string? Role = null,
    bool? IsLocked = null,
    int PageIndex = 1,
    int PageSize = 10);

public sealed record CompanyQueryFilter(
    string? Search = null,
    string? Status = null,
    int PageIndex = 1,
    int PageSize = 10);

public sealed record AuditLogQueryFilter(
    Guid? UserId = null,
    string? Action = null,
    int PageIndex = 1,
    int PageSize = 10);

public sealed record DashboardStatistics(
    int TotalUsers,
    int TotalCandidates,
    int TotalEmployers,
    int TotalAdmins,
    int ActiveUsers,
    int LockedUsers,
    int TotalCompanies,
    int VerifiedCompanies,
    int PendingCompanies,
    int RejectedCompanies,
    int TotalJobs,
    int ActiveJobs,
    int PendingJobs,
    int RejectedJobs,
    int ClosedJobs,
    int TotalApplications,
    List<UserGrowthData> UserGrowthLast7Days,
    List<JobGrowthData> JobGrowthLast7Days);

public sealed record UserGrowthData(
    string Date,
    int Count);

public sealed record JobGrowthData(
    string Date,
    int Count);
