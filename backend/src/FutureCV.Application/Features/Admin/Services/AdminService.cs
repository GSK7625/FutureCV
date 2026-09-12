using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using FutureCV.Application.Common.Interfaces;
using FutureCV.Application.Common.Models;
using FutureCV.Application.Features.Admin.DTOs;
using FutureCV.Application.Features.Admin.Interfaces;
using FutureCV.Application.Features.Employer.DTOs;
using FutureCV.Domain.Entities;

namespace FutureCV.Application.Features.Admin.Services;

public class AdminService : IAdminService
{
    private readonly IApplicationDbContext _context;
    private readonly IIdentityService _identityService;

    public AdminService(
        IApplicationDbContext context,
        IIdentityService identityService)
    {
        _context         = context;
        _identityService = identityService;
    }

    // -------------------------------------------------------------------------
    // User Management
    // -------------------------------------------------------------------------

    public async Task<ServiceResult<PagedResult<AdminUserResponse>>> GetUsersAsync(
        UserQueryFilter filter, CancellationToken cancellationToken = default)
    {
        var usersPaged = await _identityService.GetUsersAsync(filter, cancellationToken);
        var userIds = usersPaged.Items.Select(u => u.Id).ToList();

        // Fetch candidate & employer full names for display
        var candidateNames = await _context.Candidates
            .Where(c => userIds.Contains(c.UserId))
            .ToDictionaryAsync(c => c.UserId, c => c.FullName, cancellationToken);

        var employerNames = await _context.Employers
            .Where(e => userIds.Contains(e.UserId))
            .ToDictionaryAsync(e => e.UserId, e => e.FullName, cancellationToken);

        var items = new List<AdminUserResponse>();

        foreach (var u in usersPaged.Items)
        {
            string? fullName = candidateNames.GetValueOrDefault(u.Id)
                ?? employerNames.GetValueOrDefault(u.Id);

            items.Add(new AdminUserResponse(
                u.Id,
                u.Email,
                u.Phone,
                fullName,
                u.Roles,
                u.IsLockedOut,
                u.LockoutEnd,
                u.CreatedAt));
        }

        var result = new PagedResult<AdminUserResponse>(items, usersPaged.TotalCount, usersPaged.PageIndex, usersPaged.PageSize);
        return ServiceResult.Success(result);
    }

    public async Task<ServiceResult<bool>> LockUserAsync(
        Guid adminUserId, Guid targetUserId, string reason, string? ipAddress, CancellationToken cancellationToken = default)
    {
        if (adminUserId == targetUserId)
            return ServiceResult.Failure<bool>("You cannot lock your own account.");

        var lockResult = await _identityService.LockUserAsync(targetUserId, cancellationToken);
        if (!lockResult.IsSuccess)
            return lockResult;

        // Revoke all active refresh tokens immediately
        var activeTokens = await _context.RefreshTokens
            .Where(r => r.UserId == targetUserId && r.RevokedAt == null)
            .ToListAsync(cancellationToken);

        foreach (var token in activeTokens)
        {
            token.RevokedAt = DateTimeOffset.UtcNow;
        }

        // Write Audit Log
        _context.AuditLogs.Add(new AuditLog
        {
            UserId      = adminUserId,
            Action      = "User.Locked",
            EntityType  = "User",
            EntityId    = targetUserId.ToString(),
            PayloadJson = JsonSerializer.Serialize(new { Reason = reason }),
            IpAddress   = ipAddress,
        });

        await _context.SaveChangesAsync(cancellationToken);
        return ServiceResult.Success(true);
    }

    public async Task<ServiceResult<bool>> UnlockUserAsync(
        Guid adminUserId, Guid targetUserId, string? ipAddress, CancellationToken cancellationToken = default)
    {
        var unlockResult = await _identityService.UnlockUserAsync(targetUserId, cancellationToken);
        if (!unlockResult.IsSuccess)
            return unlockResult;

        // Write Audit Log
        _context.AuditLogs.Add(new AuditLog
        {
            UserId     = adminUserId,
            Action     = "User.Unlocked",
            EntityType = "User",
            EntityId   = targetUserId.ToString(),
            IpAddress  = ipAddress,
        });

        await _context.SaveChangesAsync(cancellationToken);
        return ServiceResult.Success(true);
    }

    // -------------------------------------------------------------------------
    // Company Verification & Management
    // -------------------------------------------------------------------------

    public async Task<ServiceResult<PagedResult<CompanyProfileResponse>>> GetCompaniesAsync(
        CompanyQueryFilter filter, CancellationToken cancellationToken = default)
    {
        var pageIndex = filter.PageIndex < 1 ? 1 : filter.PageIndex;
        var pageSize  = filter.PageSize is < 1 or > 100 ? 10 : filter.PageSize;

        var query = _context.Companies.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var search = filter.Search.Trim().ToLower();
            query = query.Where(c =>
                c.Name.ToLower().Contains(search) ||
                c.TaxCode.ToLower().Contains(search));
        }

        if (!string.IsNullOrWhiteSpace(filter.Status))
        {
            var status = filter.Status.Trim();
            query = query.Where(c => c.VerifiedStatus.ToLower() == status.ToLower());
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var companies = await query
            .OrderByDescending(c => c.CreatedAt)
            .Skip((pageIndex - 1) * pageSize)
            .Take(pageSize)
            .Select(c => new CompanyProfileResponse(
                c.Id, c.Name, c.TaxCode, c.LogoUrl, c.Scale, c.Industry,
                c.WebsiteUrl, c.Address, c.Description,
                c.VerifiedStatus, c.VerifiedAt, c.CreatedAt))
            .ToListAsync(cancellationToken);

        var result = new PagedResult<CompanyProfileResponse>(companies, totalCount, pageIndex, pageSize);
        return ServiceResult.Success(result);
    }

    public async Task<ServiceResult<CompanyProfileResponse>> UpdateCompanyStatusAsync(
        Guid adminUserId, Guid companyId, UpdateCompanyStatusRequest request, string? ipAddress, CancellationToken cancellationToken = default)
    {
        var company = await _context.Companies
            .FirstOrDefaultAsync(c => c.Id == companyId, cancellationToken);

        if (company is null)
            return ServiceResult.NotFound<CompanyProfileResponse>("Company not found.");

        company.VerifiedStatus = request.Status;
        company.VerifiedAt     = request.Status.Equals("Verified", StringComparison.OrdinalIgnoreCase)
            ? DateTimeOffset.UtcNow
            : null;

        // Write Audit Log
        _context.AuditLogs.Add(new AuditLog
        {
            UserId      = adminUserId,
            Action      = "Company.StatusUpdated",
            EntityType  = "Company",
            EntityId    = companyId.ToString(),
            PayloadJson = JsonSerializer.Serialize(new { Status = request.Status, Note = request.Note }),
            IpAddress   = ipAddress,
        });

        await _context.SaveChangesAsync(cancellationToken);

        var response = new CompanyProfileResponse(
            company.Id, company.Name, company.TaxCode, company.LogoUrl,
            company.Scale, company.Industry, company.WebsiteUrl, company.Address,
            company.Description, company.VerifiedStatus, company.VerifiedAt, company.CreatedAt);

        return ServiceResult.Success(response);
    }

    // -------------------------------------------------------------------------
    // Audit Log Management
    // -------------------------------------------------------------------------

    public async Task<ServiceResult<PagedResult<AuditLogResponse>>> GetAuditLogsAsync(
        AuditLogQueryFilter filter, CancellationToken cancellationToken = default)
    {
        var pageIndex = filter.PageIndex < 1 ? 1 : filter.PageIndex;
        var pageSize  = filter.PageSize is < 1 or > 100 ? 10 : filter.PageSize;

        var query = _context.AuditLogs.AsNoTracking();

        if (filter.UserId.HasValue)
            query = query.Where(a => a.UserId == filter.UserId.Value);

        if (!string.IsNullOrWhiteSpace(filter.Action))
        {
            var action = filter.Action.Trim().ToLower();
            query = query.Where(a => a.Action.ToLower().Contains(action));
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var logs = await query
            .OrderByDescending(a => a.CreatedAt)
            .Skip((pageIndex - 1) * pageSize)
            .Take(pageSize)
            .Select(a => new AuditLogResponse(
                a.Id, a.UserId, a.Action, a.EntityType, a.EntityId,
                a.PayloadJson, a.IpAddress, a.CreatedAt))
            .ToListAsync(cancellationToken);

        var result = new PagedResult<AuditLogResponse>(logs, totalCount, pageIndex, pageSize);
        return ServiceResult.Success(result);
    }

    // -------------------------------------------------------------------------
    // Dashboard Statistics
    // -------------------------------------------------------------------------

    public async Task<ServiceResult<DashboardStatistics>> GetDashboardStatisticsAsync(
        CancellationToken cancellationToken = default)
    {
        var now = DateTimeOffset.UtcNow;
        var sevenDaysAgo = now.AddDays(-7).Date;

        // User statistics
        var allUsers = await _identityService.GetAllUsersAsync(cancellationToken);
        var totalUsers = allUsers.Count;
        var activeUsers = allUsers.Count(u => !u.IsLockedOut);
        var lockedUsers = allUsers.Count(u => u.IsLockedOut);

        var totalCandidates = allUsers.Count(u => u.Roles.Contains("Candidate"));
        var totalEmployers = allUsers.Count(u => u.Roles.Contains("Employer"));
        var totalAdmins = allUsers.Count(u => u.Roles.Contains("Admin"));

        // Company statistics
        var companies = await _context.Companies.AsNoTracking().ToListAsync(cancellationToken);
        var totalCompanies = companies.Count;
        var verifiedCompanies = companies.Count(c => c.VerifiedStatus.Equals("Verified", StringComparison.OrdinalIgnoreCase));
        var pendingCompanies = companies.Count(c => c.VerifiedStatus.Equals("Pending", StringComparison.OrdinalIgnoreCase));
        var rejectedCompanies = companies.Count(c => c.VerifiedStatus.Equals("Rejected", StringComparison.OrdinalIgnoreCase));

        // Job statistics
        var jobs = await _context.Jobs.AsNoTracking().ToListAsync(cancellationToken);
        var totalJobs = jobs.Count;
        var activeJobs = jobs.Count(j => j.ApprovalStatus.Equals("Approved", StringComparison.OrdinalIgnoreCase) && !j.IsExpired);
        var pendingJobs = jobs.Count(j => j.ApprovalStatus.Equals("Pending", StringComparison.OrdinalIgnoreCase));
        var rejectedJobs = jobs.Count(j => j.ApprovalStatus.Equals("Rejected", StringComparison.OrdinalIgnoreCase));
        var closedJobs = jobs.Count(j => j.IsExpired);

        // Application statistics
        var totalApplications = await _context.Applications.CountAsync(cancellationToken);

        // User growth last 7 days
        var userGrowth = allUsers
            .Where(u => u.CreatedAt >= sevenDaysAgo)
            .GroupBy(u => u.CreatedAt.Date)
            .Select(g => new UserGrowthData(g.Key.ToString("yyyy-MM-dd"), g.Count()))
            .OrderBy(x => x.Date)
            .ToList();

        // Fill missing dates with 0
        var userGrowthFilled = new List<UserGrowthData>();
        for (int i = 0; i < 7; i++)
        {
            var date = sevenDaysAgo.AddDays(i).ToString("yyyy-MM-dd");
            var existing = userGrowth.FirstOrDefault(x => x.Date == date);
            userGrowthFilled.Add(existing ?? new UserGrowthData(date, 0));
        }

        // Job growth last 7 days
        var jobGrowth = jobs
            .Where(j => j.CreatedAt >= sevenDaysAgo)
            .GroupBy(j => j.CreatedAt.Date)
            .Select(g => new JobGrowthData(g.Key.ToString("yyyy-MM-dd"), g.Count()))
            .OrderBy(x => x.Date)
            .ToList();

        // Fill missing dates with 0
        var jobGrowthFilled = new List<JobGrowthData>();
        for (int i = 0; i < 7; i++)
        {
            var date = sevenDaysAgo.AddDays(i).ToString("yyyy-MM-dd");
            var existing = jobGrowth.FirstOrDefault(x => x.Date == date);
            jobGrowthFilled.Add(existing ?? new JobGrowthData(date, 0));
        }

        var statistics = new DashboardStatistics(
            totalUsers,
            totalCandidates,
            totalEmployers,
            totalAdmins,
            activeUsers,
            lockedUsers,
            totalCompanies,
            verifiedCompanies,
            pendingCompanies,
            rejectedCompanies,
            totalJobs,
            activeJobs,
            pendingJobs,
            rejectedJobs,
            closedJobs,
            totalApplications,
            userGrowthFilled,
            jobGrowthFilled);

        return ServiceResult.Success(statistics);
    }
}
