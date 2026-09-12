using FutureCV.Application.Common.Models;
using FutureCV.Application.Features.Admin.DTOs;
using FutureCV.Application.Features.Employer.DTOs;

namespace FutureCV.Application.Features.Admin.Interfaces;

public interface IAdminService
{
    Task<ServiceResult<PagedResult<AdminUserResponse>>> GetUsersAsync(
        UserQueryFilter filter, CancellationToken cancellationToken = default);

    Task<ServiceResult<bool>> LockUserAsync(
        Guid adminUserId, Guid targetUserId, string reason, string? ipAddress, CancellationToken cancellationToken = default);

    Task<ServiceResult<bool>> UnlockUserAsync(
        Guid adminUserId, Guid targetUserId, string? ipAddress, CancellationToken cancellationToken = default);

    Task<ServiceResult<PagedResult<CompanyProfileResponse>>> GetCompaniesAsync(
        CompanyQueryFilter filter, CancellationToken cancellationToken = default);

    Task<ServiceResult<CompanyProfileResponse>> UpdateCompanyStatusAsync(
        Guid adminUserId, Guid companyId, UpdateCompanyStatusRequest request, string? ipAddress, CancellationToken cancellationToken = default);

    Task<ServiceResult<PagedResult<AuditLogResponse>>> GetAuditLogsAsync(
        AuditLogQueryFilter filter, CancellationToken cancellationToken = default);

    Task<ServiceResult<DashboardStatistics>> GetDashboardStatisticsAsync(
        CancellationToken cancellationToken = default);
}
