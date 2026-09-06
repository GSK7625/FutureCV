using FutureCV.Application.Common.Interfaces;
using FutureCV.Application.Common.Models;
using FutureCV.Application.Features.Application.DTOs;
using FutureCV.Application.Features.Application.Interfaces;
using FutureCV.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace FutureCV.Application.Features.Application.Services;

/// <summary>
/// Service implementation cho quản lý Application và Recruitment Pipeline
/// </summary>
public partial class ApplicationService : IApplicationService
{
    private readonly IApplicationDbContext _context;
    private readonly ILogger<ApplicationService> _logger;

    public ApplicationService(
        IApplicationDbContext context,
        ILogger<ApplicationService> logger)
    {
        _context = context;
        _logger = logger;
    }

    // =====================================================================
    // P3-UC05: Apply to Job
    // =====================================================================
    
    public async Task<ServiceResult<ApplicationCreatedResponse>> ApplyToJobAsync(
        Guid candidateUserId,
        CreateApplicationRequest request,
        CancellationToken cancellationToken = default)
    {
        try
        {
            // 1. Tìm Candidate từ userId
            var candidate = await _context.Candidates
                .FirstOrDefaultAsync(c => c.UserId == candidateUserId && !c.IsDeleted, cancellationToken);
            
            if (candidate == null)
                return ServiceResult.NotFound<ApplicationCreatedResponse>("Không tìm thấy hồ sơ ứng viên.");

            // 2. Kiểm tra Job tồn tại và còn mở
            var job = await _context.Jobs
                .Include(j => j.Company)
                .FirstOrDefaultAsync(j => j.Id == request.JobId && !j.IsDeleted, cancellationToken);
            
            if (job == null)
                return ServiceResult.NotFound<ApplicationCreatedResponse>("Công việc không tồn tại.");
            
            if (!job.IsActive)
                return ServiceResult.Failure<ApplicationCreatedResponse>("Công việc này đã đóng.");
            
            if (job.IsExpired || (job.Deadline.HasValue && job.Deadline.Value < DateTime.UtcNow))
                return ServiceResult.Failure<ApplicationCreatedResponse>("Công việc này đã hết hạn nộp hồ sơ.");

            // 3. Kiểm tra CV tồn tại và thuộc về candidate
            var cv = await _context.CandidateCvs
                .FirstOrDefaultAsync(c => c.Id == request.CvId && c.CandidateId == candidate.Id, cancellationToken);
            
            if (cv == null)
                return ServiceResult.NotFound<ApplicationCreatedResponse>("CV không tồn tại hoặc không thuộc về bạn.");

            // 4. Kiểm tra đã ứng tuyển chưa (BR-05: 1 UV chỉ ứng tuyển 1 lần/job)
            var existingApplication = await _context.Applications
                .FirstOrDefaultAsync(a => a.CandidateId == candidate.Id && a.JobId == request.JobId && !a.IsDeleted, cancellationToken);
            
            if (existingApplication != null)
                return ServiceResult.Conflict<ApplicationCreatedResponse>("Bạn đã ứng tuyển vào công việc này rồi.");

            // 5. Tạo Application mới
            var application = new Domain.Entities.Application
            {
                Id = Guid.NewGuid(),
                CandidateId = candidate.Id,
                JobId = request.JobId,
                CvId = request.CvId,
                CoverLetter = request.CoverLetter,
                Status = ApplicationStatus.Applied,
                AppliedAt = DateTimeOffset.UtcNow
            };

            _context.Applications.Add(application);

            // 6. Tạo StatusHistory record đầu tiên
            var statusHistory = new ApplicationStatusHistory
            {
                Id = Guid.NewGuid(),
                ApplicationId = application.Id,
                FromStatus = "",
                ToStatus = ApplicationStatus.Applied,
                Reason = "Ứng viên nộp đơn",
                ChangedAt = DateTimeOffset.UtcNow
            };

            _context.ApplicationStatusHistories.Add(statusHistory);

            await _context.SaveChangesAsync(cancellationToken);

            // 7. Return response
            return ServiceResult.Success(new ApplicationCreatedResponse(
                Id: application.Id,
                JobId: job.Id,
                JobTitle: job.Title,
                CompanyName: job.Company.Name,
                Status: application.Status,
                AppliedAt: application.AppliedAt));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error applying to job {JobId}", request.JobId);
            return ServiceResult.InfrastructureError<ApplicationCreatedResponse>("Có lỗi xảy ra khi nộp đơn ứng tuyển.");
        }
    }

    // =====================================================================
    // P3-UC06: Get My Applications (Candidate)
    // =====================================================================
    
    public async Task<ServiceResult<PagedResult<ApplicationListResponse>>> GetMyApplicationsAsync(
        Guid candidateUserId,
        ApplicationFilterRequest filter,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var candidate = await _context.Candidates
                .FirstOrDefaultAsync(c => c.UserId == candidateUserId && !c.IsDeleted, cancellationToken);
            
            if (candidate == null)
                return ServiceResult.NotFound<PagedResult<ApplicationListResponse>>("Không tìm thấy hồ sơ ứng viên.");

            var query = _context.Applications
                .Include(a => a.Job)
                    .ThenInclude(j => j.Company)
                .Include(a => a.Candidate)
                .Include(a => a.Ranking)
                .Where(a => a.CandidateId == candidate.Id && !a.IsDeleted)
                .AsQueryable();

            // Filter by status
            if (!string.IsNullOrEmpty(filter.Status))
                query = query.Where(a => a.Status == filter.Status);

            // Filter by keyword (job title)
            if (!string.IsNullOrEmpty(filter.Keyword))
                query = query.Where(a => a.Job.Title.Contains(filter.Keyword));

            // Filter by date range
            if (filter.FromDate.HasValue)
                query = query.Where(a => a.AppliedAt >= filter.FromDate.Value);
            
            if (filter.ToDate.HasValue)
                query = query.Where(a => a.AppliedAt <= filter.ToDate.Value);

            // Sort
            query = filter.SortBy?.ToLower() switch
            {
                "oldest" => query.OrderBy(a => a.AppliedAt),
                "status" => query.OrderBy(a => a.Status).ThenByDescending(a => a.AppliedAt),
                _ => query.OrderByDescending(a => a.AppliedAt) // newest (default)
            };

            var totalCount = await query.CountAsync(cancellationToken);
            
            var items = await query
                .Skip((filter.PageIndex - 1) * filter.PageSize)
                .Take(filter.PageSize)
                .Select(a => new ApplicationListResponse(
                    a.Id,
                    a.CandidateId,
                    a.Candidate.FullName,
                    null, // Candidate không cần thấy email của mình
                    a.Candidate.Phone,
                    a.JobId,
                    a.Job.Title,
                    a.Job.Company.Name,
                    a.Status,
                    a.MatchScore,
                    a.Ranking != null ? a.Ranking.ManualRating : null,
                    a.AppliedAt,
                    a.LastStatusChangedAt))
                .ToListAsync(cancellationToken);

            return ServiceResult.Success(
                new PagedResult<ApplicationListResponse>(items, totalCount, filter.PageIndex, filter.PageSize));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting applications for candidate {CandidateUserId}", candidateUserId);
            return ServiceResult.InfrastructureError<PagedResult<ApplicationListResponse>>("Có lỗi xảy ra khi tải danh sách ứng tuyển.");
        }
    }

    // =====================================================================
    // P3-UC06: Get Application Detail (Candidate)
    // =====================================================================
    
    public async Task<ServiceResult<ApplicationDetailResponse>> GetMyApplicationDetailAsync(
        Guid candidateUserId,
        Guid applicationId,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var candidate = await _context.Candidates
                .FirstOrDefaultAsync(c => c.UserId == candidateUserId && !c.IsDeleted, cancellationToken);
            
            if (candidate == null)
                return ServiceResult.NotFound<ApplicationDetailResponse>("Không tìm thấy hồ sơ ứng viên.");

            var application = await _context.Applications
                .Include(a => a.Candidate)
                .Include(a => a.Job)
                    .ThenInclude(j => j.Company)
                .Include(a => a.Job)
                    .ThenInclude(j => j.Location)
                .Include(a => a.CV)
                .Include(a => a.Ranking)
                .Include(a => a.StatusHistoryRecords)
                .FirstOrDefaultAsync(a => a.Id == applicationId && a.CandidateId == candidate.Id && !a.IsDeleted, cancellationToken);

            if (application == null)
                return ServiceResult.NotFound<ApplicationDetailResponse>("Không tìm thấy đơn ứng tuyển.");

            return ServiceResult.Success(MapToApplicationDetailResponse(application));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting application detail {ApplicationId}", applicationId);
            return ServiceResult.InfrastructureError<ApplicationDetailResponse>("Có lỗi xảy ra khi tải chi tiết ứng tuyển.");
        }
    }

    // =====================================================================
    // P3-UC07: Withdraw Application
    // =====================================================================
    
    public async Task<ServiceResult<bool>> WithdrawApplicationAsync(
        Guid candidateUserId,
        Guid applicationId,
        WithdrawApplicationRequest request,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var candidate = await _context.Candidates
                .FirstOrDefaultAsync(c => c.UserId == candidateUserId && !c.IsDeleted, cancellationToken);
            
            if (candidate == null)
                return ServiceResult.NotFound<bool>("Không tìm thấy hồ sơ ứng viên.");

            var application = await _context.Applications
                .FirstOrDefaultAsync(a => a.Id == applicationId && a.CandidateId == candidate.Id && !a.IsDeleted, cancellationToken);

            if (application == null)
                return ServiceResult.NotFound<bool>("Không tìm thấy đơn ứng tuyển.");

            // Chỉ cho phép rút khi status là Applied hoặc Screening
            if (application.Status == ApplicationStatus.Rejected || application.Status == ApplicationStatus.Withdrawn)
                return ServiceResult.Failure<bool>("Không thể rút đơn đã được xử lý.");

            var oldStatus = application.Status;
            application.Status = ApplicationStatus.Withdrawn;
            application.LastStatusChangedAt = DateTimeOffset.UtcNow;

            // Tạo history record
            var statusHistory = new ApplicationStatusHistory
            {
                Id = Guid.NewGuid(),
                ApplicationId = application.Id,
                FromStatus = oldStatus,
                ToStatus = ApplicationStatus.Withdrawn,
                Reason = request.Reason,
                Comment = request.Comment,
                ChangedAt = DateTimeOffset.UtcNow
            };

            _context.ApplicationStatusHistories.Add(statusHistory);
            await _context.SaveChangesAsync(cancellationToken);

            return ServiceResult.Success(true);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error withdrawing application {ApplicationId}", applicationId);
            return ServiceResult.InfrastructureError<bool>("Có lỗi xảy ra khi rút đơn ứng tuyển.");
        }
    }

    // =====================================================================
    // CONTINUATION MARKER - Part 2
    // =====================================================================
}