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
    // P4-UC04: Get Job Applications (Recruiter)
    // =====================================================================
    
    public async Task<ServiceResult<PagedResult<ApplicationListResponse>>> GetJobApplicationsAsync(
        Guid recruiterUserId,
        Guid jobId,
        ApplicationFilterRequest filter,
        CancellationToken cancellationToken = default)
    {
        try
        {
            // Verify recruiter owns this job
            var employer = await _context.Employers
                .FirstOrDefaultAsync(e => e.UserId == recruiterUserId, cancellationToken);
            
            if (employer == null)
                return ServiceResult.NotFound<PagedResult<ApplicationListResponse>>("Không tìm thấy hồ sơ nhà tuyển dụng.");

            var job = await _context.Jobs
                .FirstOrDefaultAsync(j => j.Id == jobId && j.PostedById == employer.Id && !j.IsDeleted, cancellationToken);
            
            if (job == null)
                return ServiceResult.Forbidden<PagedResult<ApplicationListResponse>>("Bạn không có quyền xem ứng tuyển của công việc này.");

            var query = _context.Applications
                .Include(a => a.Candidate)
                .Include(a => a.Job)
                    .ThenInclude(j => j.Company)
                .Include(a => a.Ranking)
                .Where(a => a.JobId == jobId && !a.IsDeleted)
                .AsQueryable();

            // Filter by status
            if (!string.IsNullOrEmpty(filter.Status))
                query = query.Where(a => a.Status == filter.Status);

            // Filter by keyword (candidate name)
            if (!string.IsNullOrEmpty(filter.Keyword))
                query = query.Where(a => a.Candidate.FullName.Contains(filter.Keyword));

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
                    null, // Sẽ populate từ User nếu cần
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
            _logger.LogError(ex, "Error getting applications for job {JobId}", jobId);
            return ServiceResult.InfrastructureError<PagedResult<ApplicationListResponse>>("Có lỗi xảy ra khi tải danh sách ứng tuyển.");
        }
    }

    // =====================================================================
    // P4-UC04: Get Application Detail (Recruiter)
    // =====================================================================
    
    public async Task<ServiceResult<ApplicationDetailResponse>> GetApplicationDetailAsync(
        Guid recruiterUserId,
        Guid applicationId,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var employer = await _context.Employers
                .FirstOrDefaultAsync(e => e.UserId == recruiterUserId, cancellationToken);
            
            if (employer == null)
                return ServiceResult.NotFound<ApplicationDetailResponse>("Không tìm thấy hồ sơ nhà tuyển dụng.");

            var application = await _context.Applications
                .Include(a => a.Candidate)
                .Include(a => a.Job)
                    .ThenInclude(j => j.Company)
                .Include(a => a.Job)
                    .ThenInclude(j => j.Location)
                .Include(a => a.CV)
                .Include(a => a.Ranking)
                .Include(a => a.StatusHistoryRecords)
                .FirstOrDefaultAsync(a => a.Id == applicationId && !a.IsDeleted, cancellationToken);

            if (application == null)
                return ServiceResult.NotFound<ApplicationDetailResponse>("Không tìm thấy đơn ứng tuyển.");

            // Verify recruiter owns the job
            if (application.Job.PostedById != employer.Id)
                return ServiceResult.Forbidden<ApplicationDetailResponse>("Bạn không có quyền xem ứng tuyển này.");

            return ServiceResult.Success(MapToApplicationDetailResponse(application));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting application detail {ApplicationId}", applicationId);
            return ServiceResult.InfrastructureError<ApplicationDetailResponse>("Có lỗi xảy ra khi tải chi tiết ứng tuyển.");
        }
    }

    // =====================================================================
    // P4-UC05: Rank Candidate
    // =====================================================================
    
    public async Task<ServiceResult<CandidateRankingResponse>> RankCandidateAsync(
        Guid recruiterUserId,
        Guid applicationId,
        RankCandidateRequest request,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var employer = await _context.Employers
                .FirstOrDefaultAsync(e => e.UserId == recruiterUserId, cancellationToken);
            
            if (employer == null)
                return ServiceResult.NotFound<CandidateRankingResponse>("Không tìm thấy hồ sơ nhà tuyển dụng.");

            var application = await _context.Applications
                .Include(a => a.Job)
                .Include(a => a.Ranking)
                .FirstOrDefaultAsync(a => a.Id == applicationId && !a.IsDeleted, cancellationToken);

            if (application == null)
                return ServiceResult.NotFound<CandidateRankingResponse>("Không tìm thấy đơn ứng tuyển.");

            // Verify recruiter owns the job
            if (application.Job.PostedById != employer.Id)
                return ServiceResult.Forbidden<CandidateRankingResponse>("Bạn không có quyền đánh giá ứng viên này.");

            // Validate rating (1-5 stars)
            if (request.ManualRating < 1 || request.ManualRating > 5)
                return ServiceResult.Failure<CandidateRankingResponse>("Đánh giá phải từ 1 đến 5 sao.");

            CandidateRanking ranking;
            
            if (application.Ranking != null)
            {
                // Update existing ranking
                ranking = application.Ranking;
                ranking.ManualRating = request.ManualRating;
                ranking.ReviewComment = request.ReviewComment;
                ranking.Tags = request.Tags != null && request.Tags.Any() 
                    ? System.Text.Json.JsonSerializer.Serialize(request.Tags) 
                    : null;
                ranking.PrivateNotes = request.PrivateNotes;
                ranking.RankedBy = recruiterUserId;
                ranking.ComputedAt = DateTimeOffset.UtcNow;
            }
            else
            {
                // Create new ranking
                ranking = new CandidateRanking
                {
                    Id = Guid.NewGuid(),
                    JobId = application.JobId,
                    ApplicationId = application.Id,
                    CandidateId = application.CandidateId,
                    RankPosition = 0, // Will be computed later if needed
                    Score = request.ManualRating * 20, // Convert 1-5 stars to 0-100 scale
                    ManualRating = request.ManualRating,
                    ReviewComment = request.ReviewComment,
                    Tags = request.Tags != null && request.Tags.Any() 
                        ? System.Text.Json.JsonSerializer.Serialize(request.Tags) 
                        : null,
                    PrivateNotes = request.PrivateNotes,
                    RankedBy = recruiterUserId,
                    ComputedAt = DateTimeOffset.UtcNow
                };
                
                _context.CandidateRankings.Add(ranking);
            }

            await _context.SaveChangesAsync(cancellationToken);

            return ServiceResult.Success(new CandidateRankingResponse(
                Id: ranking.Id,
                RankPosition: ranking.RankPosition,
                Score: ranking.Score,
                ManualRating: ranking.ManualRating,
                ReviewComment: ranking.ReviewComment,
                Tags: request.Tags,
                RankedByName: null, // Populate if needed
                ComputedAt: ranking.ComputedAt));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error ranking candidate for application {ApplicationId}", applicationId);
            return ServiceResult.InfrastructureError<CandidateRankingResponse>("Có lỗi xảy ra khi xếp hạng ứng viên.");
        }
    }

    // =====================================================================
    // CONTINUATION MARKER - Part 3
    // =====================================================================
}