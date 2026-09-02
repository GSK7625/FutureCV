using System.Text.Json;
using FutureCV.Application.Common.Interfaces;
using FutureCV.Application.Common.Models;
using FutureCV.Application.Features.Admin.DTOs;
using FutureCV.Application.Features.Admin.Interfaces;
using FutureCV.Application.Features.Employer.DTOs;
using FutureCV.Domain.Entities;
using FutureCV.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace FutureCV.Infrastructure.Services;

public class AdminService : IAdminService
{
    private readonly IApplicationDbContext _context;
    private readonly UserManager<AppUser> _userManager;

    public AdminService(
        IApplicationDbContext context,
        UserManager<AppUser> userManager)
    {
        _context     = context;
        _userManager = userManager;
    }

    // -------------------------------------------------------------------------
    // User Management
    // -------------------------------------------------------------------------

    public async Task<ServiceResult<PagedResult<AdminUserResponse>>> GetUsersAsync(
        UserQueryFilter filter, CancellationToken cancellationToken = default)
    {
        var pageIndex = filter.PageIndex < 1 ? 1 : filter.PageIndex;
        var pageSize  = filter.PageSize is < 1 or > 100 ? 10 : filter.PageSize;

        var query = _userManager.Users.AsNoTracking();

        // 1. Search filter (Email or Phone)
        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var search = filter.Search.Trim().ToLower();
            query = query.Where(u =>
                (u.Email != null && u.Email.ToLower().Contains(search)) ||
                (u.PhoneNumber != null && u.PhoneNumber.Contains(search)));
        }

        // 2. Lock status filter
        if (filter.IsLocked.HasValue)
        {
            var now = DateTimeOffset.UtcNow;
            query = filter.IsLocked.Value
                ? query.Where(u => u.LockoutEnd != null && u.LockoutEnd > now)
                : query.Where(u => u.LockoutEnd == null || u.LockoutEnd <= now);
        }

        // 3. Role filter
        if (!string.IsNullOrWhiteSpace(filter.Role))
        {
            var roleName = filter.Role.Trim();
            var usersInRole = await _userManager.GetUsersInRoleAsync(roleName);
            var userIdsInRole = usersInRole.Select(u => u.Id).ToList();
            
            query = query.Where(u => userIdsInRole.Contains(u.Id));
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var users = await query
            .OrderByDescending(u => u.CreatedAt)
            .Skip((pageIndex - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        // Fetch candidate & employer full names for display
        var userIds = users.Select(u => u.Id).ToList();

        var candidateNames = await _context.Candidates
            .Where(c => userIds.Contains(c.UserId))
            .ToDictionaryAsync(c => c.UserId, c => c.FullName, cancellationToken);

        var employerNames = await _context.Employers
            .Where(e => userIds.Contains(e.UserId))
            .ToDictionaryAsync(e => e.UserId, e => e.FullName, cancellationToken);

        var items = new List<AdminUserResponse>();
        var nowCheck = DateTimeOffset.UtcNow;

        foreach (var u in users)
        {
            var roles = await _userManager.GetRolesAsync(u);
            string? fullName = candidateNames.GetValueOrDefault(u.Id)
                ?? employerNames.GetValueOrDefault(u.Id);

            var isLocked = u.LockoutEnd.HasValue && u.LockoutEnd.Value > nowCheck;

            items.Add(new AdminUserResponse(
                u.Id,
                u.Email ?? string.Empty,
                u.PhoneNumber,
                fullName,
                roles.ToList(),
                isLocked,
                u.LockoutEnd,
                u.CreatedAt.UtcDateTime));
        }

        var result = new PagedResult<AdminUserResponse>(items, totalCount, pageIndex, pageSize);
        return ServiceResult.Success(result);
    }

    public async Task<ServiceResult<bool>> LockUserAsync(
        Guid adminUserId, Guid targetUserId, string reason, string? ipAddress, CancellationToken cancellationToken = default)
    {
        if (adminUserId == targetUserId)
            return ServiceResult.Failure<bool>("You cannot lock your own account.");

        var targetUser = await _userManager.FindByIdAsync(targetUserId.ToString());
        if (targetUser is null)
            return ServiceResult.NotFound<bool>("Target user not found.");

        // Lockout user
        var lockResult = await _userManager.SetLockoutEndDateAsync(targetUser, DateTimeOffset.MaxValue);
        if (!lockResult.Succeeded)
        {
            var errorMsg = string.Join("; ", lockResult.Errors.Select(e => e.Description));
            return ServiceResult.Failure<bool>($"Failed to lock user: {errorMsg}");
        }

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
        var targetUser = await _userManager.FindByIdAsync(targetUserId.ToString());
        if (targetUser is null)
            return ServiceResult.NotFound<bool>("Target user not found.");

        // Unlock user
        var unlockResult = await _userManager.SetLockoutEndDateAsync(targetUser, null);
        if (!unlockResult.Succeeded)
        {
            var errorMsg = string.Join("; ", unlockResult.Errors.Select(e => e.Description));
            return ServiceResult.Failure<bool>($"Failed to unlock user: {errorMsg}");
        }

        await _userManager.ResetAccessFailedCountAsync(targetUser);

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
}
