using FutureCV.Application.Common.Interfaces;
using FutureCV.Application.Common.Models;
using FutureCV.Application.Features.Application.DTOs;
using FutureCV.Application.Features.Application.Interfaces;
using FutureCV.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace FutureCV.Application.Features.Application.Services;

public partial class ApplicationService
{    
    // =====================================================================
    // P4-UC06: Update Application Status
    // =====================================================================
    
    public async Task<ServiceResult<ApplicationDetailResponse>> UpdateApplicationStatusAsync(
        Guid recruiterUserId,
        Guid applicationId,
        UpdateApplicationStatusRequest request,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var employer = await _context.Employers
                .FirstOrDefaultAsync(e => e.UserId == recruiterUserId, cancellationToken);
            
            if (employer == null)
                return ServiceResult.NotFound<ApplicationDetailResponse>("Không tìm thấy hồ sơ nhà tuyển dụng.");

            var application = await _context.Applications
                .Include(a => a.Job)
                .Include(a => a.Candidate)
                .Include(a => a.CV)
                .Include(a => a.Ranking)
                .Include(a => a.StatusHistoryRecords)
                .FirstOrDefaultAsync(a => a.Id == applicationId && !a.IsDeleted, cancellationToken);

            if (application == null)
                return ServiceResult.NotFound<ApplicationDetailResponse>("Không tìm thấy đơn ứng tuyển.");

            // Verify recruiter owns the job
            if (application.Job.PostedById != employer.Id)
                return ServiceResult.Forbidden<ApplicationDetailResponse>("Bạn không có quyền cập nhật trạng thái ứng tuyển này.");

            // Validate status transition
            if (application.Status == ApplicationStatus.Withdrawn)
                return ServiceResult.Failure<ApplicationDetailResponse>("Không thể cập nhật trạng thái của đơn đã bị rút.");

            // Validate new status
            var validStatuses = new[] { ApplicationStatus.Applied, ApplicationStatus.Screening, ApplicationStatus.Interview, ApplicationStatus.Offer, ApplicationStatus.Rejected };
            if (!validStatuses.Contains(request.NewStatus))
                return ServiceResult.Failure<ApplicationDetailResponse>("Trạng thái không hợp lệ.");

            var oldStatus = application.Status;
            
            if (oldStatus == request.NewStatus)
                return ServiceResult.Failure<ApplicationDetailResponse>("Trạng thái mới giống trạng thái hiện tại.");

            // Update status
            application.Status = request.NewStatus;
            application.LastStatusChangedAt = DateTimeOffset.UtcNow;
            application.LastStatusChangedBy = recruiterUserId;

            // Create history record
            var statusHistory = new ApplicationStatusHistory
            {
                Id = Guid.NewGuid(),
                ApplicationId = application.Id,
                FromStatus = oldStatus,
                ToStatus = request.NewStatus,
                Reason = request.Reason,
                Comment = request.Comment,
                ChangedBy = recruiterUserId,
                ChangedAt = DateTimeOffset.UtcNow,
                NotificationSent = false
            };

            _context.ApplicationStatusHistories.Add(statusHistory);
            await _context.SaveChangesAsync(cancellationToken);

            // TODO: Send notification to candidate if request.SendNotification is true

            // Reload with all includes for response
            application = await _context.Applications
                .Include(a => a.Candidate)
                .Include(a => a.Job).ThenInclude(j => j.Company)
                .Include(a => a.Job).ThenInclude(j => j.Location)
                .Include(a => a.CV)
                .Include(a => a.Ranking)
                .Include(a => a.StatusHistoryRecords)
                .FirstOrDefaultAsync(a => a.Id == applicationId, cancellationToken);

            return ServiceResult.Success(MapToApplicationDetailResponse(application!));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating application status {ApplicationId}", applicationId);
            return ServiceResult.InfrastructureError<ApplicationDetailResponse>("Có lỗi xảy ra khi cập nhật trạng thái ứng tuyển.");
        }
    }

    // =====================================================================
    // P4-UC07: Get Pipeline Dashboard
    // =====================================================================
    
    public async Task<ServiceResult<PipelineDashboardResponse>> GetPipelineDashboardAsync(
        Guid recruiterUserId,
        Guid jobId,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var employer = await _context.Employers
                .FirstOrDefaultAsync(e => e.UserId == recruiterUserId, cancellationToken);
            
            if (employer == null)
                return ServiceResult.NotFound<PipelineDashboardResponse>("Không tìm thấy hồ sơ nhà tuyển dụng.");

            var job = await _context.Jobs
                .FirstOrDefaultAsync(j => j.Id == jobId && j.PostedById == employer.Id && !j.IsDeleted, cancellationToken);
            
            if (job == null)
                return ServiceResult.Forbidden<PipelineDashboardResponse>("Bạn không có quyền xem pipeline của công việc này.");

            var applications = await _context.Applications
                .Include(a => a.Candidate)
                .Include(a => a.Ranking)
                .Where(a => a.JobId == jobId && !a.IsDeleted && a.Status != ApplicationStatus.Withdrawn)
                .ToListAsync(cancellationToken);

            var totalApplications = applications.Count;
            var activeApplications = applications.Count(a => a.Status != ApplicationStatus.Rejected);

            // Group by stage
            var stages = new[] { ApplicationStatus.Applied, ApplicationStatus.Screening, ApplicationStatus.Interview, ApplicationStatus.Offer, ApplicationStatus.Rejected };
            
            var stageStats = stages.Select(stage =>
            {
                var stageApps = applications.Where(a => a.Status == stage).ToList();
                var avgDays = stageApps.Any() 
                    ? (int)stageApps.Average(a => (DateTimeOffset.UtcNow - a.LastStatusChangedAt.GetValueOrDefault(a.AppliedAt)).TotalDays)
                    : 0;

                return new PipelineStageStats(
                    StageName: GetStageName(stage),
                    Status: stage,
                    Count: stageApps.Count,
                    AvgDaysInStage: avgDays);
            }).ToList();

            // Build candidate cards by stage
            var candidatesByStage = stages.ToDictionary(
                stage => stage,
                stage => (IReadOnlyList<PipelineCandidateCard>)applications
                    .Where(a => a.Status == stage)
                    .OrderByDescending(a => a.Ranking?.ManualRating ?? 0)
                    .ThenByDescending(a => a.MatchScore ?? 0)
                    .Select(a => new PipelineCandidateCard(
                        ApplicationId: a.Id,
                        CandidateId: a.CandidateId,
                        CandidateName: a.Candidate.FullName,
                        CandidateAvatar: a.Candidate.AvatarUrl,
                        Status: a.Status,
                        MatchScore: a.MatchScore,
                        ManualRating: a.Ranking?.ManualRating,
                        Tags: !string.IsNullOrEmpty(a.Ranking?.Tags) 
                            ? System.Text.Json.JsonSerializer.Deserialize<List<string>>(a.Ranking.Tags) 
                            : null,
                        DaysInCurrentStage: (int)(DateTimeOffset.UtcNow - a.LastStatusChangedAt.GetValueOrDefault(a.AppliedAt)).TotalDays,
                        AppliedAt: a.AppliedAt))
                    .ToList());

            return ServiceResult.Success(new PipelineDashboardResponse(
                JobId: jobId,
                JobTitle: job.Title,
                TotalApplications: totalApplications,
                ActiveApplications: activeApplications,
                Stages: stageStats,
                CandidatesByStage: candidatesByStage));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting pipeline dashboard for job {JobId}", jobId);
            return ServiceResult.InfrastructureError<PipelineDashboardResponse>("Có lỗi xảy ra khi tải pipeline dashboard.");
        }
    }

    // =====================================================================
    // P4-UC07: Move Candidate Stage (auto-update status)
    // =====================================================================
    
    public async Task<ServiceResult<ApplicationDetailResponse>> MoveCandidateStageAsync(
        Guid recruiterUserId,
        MoveCandidateStageRequest request,
        CancellationToken cancellationToken = default)
    {
        // This essentially calls UpdateApplicationStatusAsync with the new stage as status
        var updateRequest = new UpdateApplicationStatusRequest(
            NewStatus: request.NewStage,
            Reason: request.Reason ?? $"Di chuyển sang giai đoạn {GetStageName(request.NewStage)}",
            Comment: null,
            SendNotification: true);

        return await UpdateApplicationStatusAsync(recruiterUserId, request.ApplicationId, updateRequest, cancellationToken);
    }

    // =====================================================================
    // Get All Recruiter Applications
    // =====================================================================
    
    public async Task<ServiceResult<PagedResult<ApplicationListResponse>>> GetRecruiterAllApplicationsAsync(
        Guid recruiterUserId,
        ApplicationFilterRequest filter,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var employer = await _context.Employers
                .FirstOrDefaultAsync(e => e.UserId == recruiterUserId, cancellationToken);
            
            if (employer == null)
                return ServiceResult.NotFound<PagedResult<ApplicationListResponse>>("Không tìm thấy hồ sơ nhà tuyển dụng.");

            var query = _context.Applications
                .Include(a => a.Candidate)
                .Include(a => a.Job)
                    .ThenInclude(j => j.Company)
                .Include(a => a.Ranking)
                .Where(a => a.Job.PostedById == employer.Id && !a.IsDeleted)
                .AsQueryable();

            // Filter by status
            if (!string.IsNullOrEmpty(filter.Status))
                query = query.Where(a => a.Status == filter.Status);

            // Filter by keyword (candidate name or job title)
            if (!string.IsNullOrEmpty(filter.Keyword))
                query = query.Where(a => a.Candidate.FullName.Contains(filter.Keyword) || a.Job.Title.Contains(filter.Keyword));

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
                "rating" => query.OrderByDescending(a => a.Ranking != null ? a.Ranking.ManualRating : 0).ThenByDescending(a => a.AppliedAt),
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
                    null,
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
            _logger.LogError(ex, "Error getting all applications for recruiter {RecruiterUserId}", recruiterUserId);
            return ServiceResult.InfrastructureError<PagedResult<ApplicationListResponse>>("Có lỗi xảy ra khi tải danh sách ứng tuyển.");
        }
    }

    // =====================================================================
    // Helper Methods
    // =====================================================================

    private ApplicationDetailResponse MapToApplicationDetailResponse(Domain.Entities.Application application)
    {
        var matchedSkills = !string.IsNullOrEmpty(application.MatchedSkillsJson)
            ? System.Text.Json.JsonSerializer.Deserialize<List<string>>(application.MatchedSkillsJson)
            : null;

        var missingSkills = !string.IsNullOrEmpty(application.MissingSkillsJson)
            ? System.Text.Json.JsonSerializer.Deserialize<List<string>>(application.MissingSkillsJson)
            : null;

        return new ApplicationDetailResponse(
            Id: application.Id,
            CandidateId: application.CandidateId,
            JobId: application.JobId,
            CvId: application.CvId,
            Candidate: new ApplicationCandidateResponse(
                Id: application.Candidate.Id,
                FullName: application.Candidate.FullName,
                Phone: application.Candidate.Phone,
                Email: null,
                AvatarUrl: application.Candidate.AvatarUrl,
                Summary: application.Candidate.Summary,
                DesiredPosition: application.Candidate.DesiredPosition,
                DesiredSalaryMin: application.Candidate.DesiredSalaryMin,
                DesiredSalaryMax: application.Candidate.DesiredSalaryMax),
            Job: new ApplicationJobResponse(
                Id: application.Job.Id,
                Title: application.Job.Title,
                CompanyName: application.Job.Company.Name,
                CompanyLogoUrl: application.Job.Company.LogoUrl,
                LocationName: application.Job.Location?.Name,
                SalaryMin: application.Job.SalaryMin,
                SalaryMax: application.Job.SalaryMax,
                SalaryCurrency: application.Job.SalaryCurrency,
                Deadline: application.Job.Deadline,
                IsActive: application.Job.IsActive,
                IsExpired: application.Job.IsExpired),
            CV: new ApplicationCvResponse(
                Id: application.CV.Id,
                Title: application.CV.Title,
                FileUrl: application.CV.FileUrl,
                FileType: application.CV.FileType),
            CoverLetter: application.CoverLetter,
            MatchScore: application.MatchScore,
            MatchExplanation: application.MatchExplanation,
            MatchedSkills: matchedSkills,
            MissingSkills: missingSkills,
            Status: application.Status,
            AppliedAt: application.AppliedAt,
            LastStatusChangedAt: application.LastStatusChangedAt,
            Ranking: application.Ranking != null ? new CandidateRankingResponse(
                Id: application.Ranking.Id,
                RankPosition: application.Ranking.RankPosition,
                Score: application.Ranking.Score,
                ManualRating: application.Ranking.ManualRating,
                ReviewComment: application.Ranking.ReviewComment,
                Tags: !string.IsNullOrEmpty(application.Ranking.Tags) 
                    ? System.Text.Json.JsonSerializer.Deserialize<List<string>>(application.Ranking.Tags) 
                    : null,
                RankedByName: null,
                ComputedAt: application.Ranking.ComputedAt) : null,
            StatusHistory: application.StatusHistoryRecords
                .OrderBy(h => h.ChangedAt)
                .Select(h => new StatusHistoryResponse(
                    Id: h.Id,
                    FromStatus: h.FromStatus,
                    ToStatus: h.ToStatus,
                    Reason: h.Reason,
                    Comment: h.Comment,
                    ChangedByName: null,
                    ChangedAt: h.ChangedAt))
                .ToList());
    }

    private string GetStageName(string status) => status switch
    {
        ApplicationStatus.Applied => "Mới ứng tuyển",
        ApplicationStatus.Screening => "Sàng lọc hồ sơ",
        ApplicationStatus.Interview => "Phỏng vấn",
        ApplicationStatus.Offer => "Gửi offer",
        ApplicationStatus.Rejected => "Từ chối",
        ApplicationStatus.Withdrawn => "Đã rút",
        _ => status
    };
}