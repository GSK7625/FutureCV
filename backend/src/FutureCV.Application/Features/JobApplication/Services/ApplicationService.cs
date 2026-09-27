using System.Text.Json;
using FutureCV.Application.Common.Interfaces;
using FutureCV.Application.Common.Models;
using FutureCV.Application.Features.JobApplication.DTOs;
using FutureCV.Application.Features.JobApplication.Interfaces;
using Microsoft.EntityFrameworkCore;


namespace FutureCV.Application.Features.JobApplication.Services;
using FutureCV.Domain.Entities;

public class ApplicationService : IApplicationService
{
    private readonly IApplicationDbContext _context;

    public ApplicationService(IApplicationDbContext context)
    {
        _context = context;
    }

    // -------------------------------------------------------------------------
    // Candidate Operations
    // -------------------------------------------------------------------------

    public async Task<ServiceResult<ApplyJobResponse>> ApplyJobAsync(
        Guid userId, Guid jobId, ApplyJobRequest request, CancellationToken cancellationToken = default)
    {
        // 1. Verify candidate profile
        var candidate = await _context.Candidates
            .Include(c => c.Skills)
            .FirstOrDefaultAsync(c => c.UserId == userId, cancellationToken);

        if (candidate is null)
            return ServiceResult.NotFound<ApplyJobResponse>("Candidate profile not found.");

        // 2. Verify selected CV belongs to candidate and exists
        var cv = await _context.CandidateCvs
            .FirstOrDefaultAsync(c => c.Id == request.CvId && c.CandidateId == candidate.Id && !c.IsDeleted, cancellationToken);

        if (cv is null)
            return ServiceResult.NotFound<ApplyJobResponse>("Selected CV not found or does not belong to candidate.");

        // 3. Verify job validity
        var job = await _context.Jobs
            .Include(j => j.JobSkills)
                .ThenInclude(js => js.Skill)
            .FirstOrDefaultAsync(j => j.Id == jobId && !j.IsDeleted, cancellationToken);

        if (job is null)
            return ServiceResult.NotFound<ApplyJobResponse>("Job not found.");

        if (!job.IsActive || job.ApprovalStatus != "Approved" || (job.Deadline.HasValue && job.Deadline.Value < DateTime.UtcNow))
            return ServiceResult.Failure<ApplyJobResponse>("Job is closed, expired, or not approved for applications.");

        // 4. Check for duplicate active application (P3-UC05 E2)
        var alreadyApplied = await _context.Applications
            .AnyAsync(a => a.CandidateId == candidate.Id && a.JobId == jobId && !a.IsDeleted && a.Status != "Withdrawn", cancellationToken);

        if (alreadyApplied)
            return ServiceResult.Conflict<ApplyJobResponse>("You have already applied for this position.");

        // 5. Calculate Rule-based Match Score (Pure LINQ - No AI dependency)
        var (matchScore, explanation, matchedSkills, missingSkills) = CalculateMatchScore(candidate, job);

        // 6. Create JobApplication record
        var application = new JobApplication
        {
            CandidateId        = candidate.Id,
            JobId              = jobId,
            CvId               = request.CvId,
            CoverLetter        = request.CoverLetter,
            Status             = "Applied",
            AppliedAt          = DateTime.UtcNow,
            MatchScore         = matchScore,
            MatchExplanation   = explanation,
            MatchedSkillsJson  = JsonSerializer.Serialize(matchedSkills),
            MissingSkillsJson  = JsonSerializer.Serialize(missingSkills),
            IsDeleted          = false
        };

        // 7. Add initial status history record (P3-UC05 Step 7)
        application.StatusHistories.Add(new ApplicationStatusHistory
        {
            Application  = application,
            FromStatus   = null,
            ToStatus     = "Applied",
            ChangedById  = userId,
            Reason       = "Initial application submission",
            ChangedAt    = DateTime.UtcNow
        });

        _context.Applications.Add(application);
        await _context.SaveChangesAsync(cancellationToken);

        return ServiceResult.Success(new ApplyJobResponse(
            application.Id,
            job.Id,
            job.Title,
            application.Status,
            application.MatchScore,
            application.AppliedAt
        ));
    }

    public async Task<ServiceResult<PagedResult<CandidateApplicationListResponse>>> GetCandidateApplicationsAsync(
        Guid userId, CandidateApplicationFilterRequest filter, CancellationToken cancellationToken = default)
    {
        var candidate = await _context.Candidates
            .FirstOrDefaultAsync(c => c.UserId == userId, cancellationToken);

        if (candidate is null)
            return ServiceResult.NotFound<PagedResult<CandidateApplicationListResponse>>("Candidate profile not found.");

        var query = _context.Applications
            .AsNoTracking()
            .Where(a => a.CandidateId == candidate.Id && !a.IsDeleted);

        if (!string.IsNullOrWhiteSpace(filter.Status))
        {
            query = query.Where(a => a.Status == filter.Status);
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var pageIndex = filter.PageIndex < 1 ? 1 : filter.PageIndex;
        var pageSize  = filter.PageSize is < 1 or > 100 ? 10 : filter.PageSize;

        var items = await query
            .OrderByDescending(a => a.AppliedAt)
            .Skip((pageIndex - 1) * pageSize)
            .Take(pageSize)
            .Select(a => new CandidateApplicationListResponse(
                a.Id,
                a.JobId,
                a.Job.Title,
                a.Job.CompanyId,
                a.Job.Company.Name,
                a.Job.Company.LogoUrl,
                a.Job.Location != null ? a.Job.Location.Name : null,
                a.Job.SalaryMin,
                a.Job.SalaryMax,
                a.Job.SalaryCurrency,
                a.Status,
                a.MatchScore,
                a.AppliedAt,
                a.UpdatedAt
            ))
            .ToListAsync(cancellationToken);

        return ServiceResult.Success(new PagedResult<CandidateApplicationListResponse>(items, totalCount, pageIndex, pageSize));
    }

    public async Task<ServiceResult<CandidateApplicationDetailResponse>> GetCandidateApplicationDetailAsync(
        Guid userId, Guid applicationId, CancellationToken cancellationToken = default)
    {
        var candidate = await _context.Candidates
            .FirstOrDefaultAsync(c => c.UserId == userId, cancellationToken);

        if (candidate is null)
            return ServiceResult.NotFound<CandidateApplicationDetailResponse>("Candidate profile not found.");

        var application = await _context.Applications
            .AsNoTracking()
            .Include(a => a.Job)
                .ThenInclude(j => j.Company)
            .Include(a => a.Cv)
            .Include(a => a.StatusHistories)
            .FirstOrDefaultAsync(a => a.Id == applicationId && a.CandidateId == candidate.Id && !a.IsDeleted, cancellationToken);

        if (application is null)
            return ServiceResult.NotFound<CandidateApplicationDetailResponse>("Application not found.");

        var matchedSkills = DeserializeSkillList(application.MatchedSkillsJson);
        var missingSkills = DeserializeSkillList(application.MissingSkillsJson);

        var timeline = application.StatusHistories
            .OrderBy(h => h.ChangedAt)
            .Select(h => new ApplicationStatusTimelineItem(h.FromStatus, h.ToStatus, h.Reason, h.ChangedAt))
            .ToList();

        var response = new CandidateApplicationDetailResponse(
            application.Id,
            application.JobId,
            application.Job.Title,
            application.Job.CompanyId,
            application.Job.Company.Name,
            application.Job.Company.LogoUrl,
            application.CvId,
            application.Cv.Title,
            application.Cv.FileUrl,
            application.CoverLetter,
            application.Status,
            application.MatchScore,
            application.MatchExplanation,
            matchedSkills,
            missingSkills,
            application.AppliedAt,
            timeline
        );

        return ServiceResult.Success(response);
    }

    public async Task<ServiceResult<bool>> WithdrawApplicationAsync(
        Guid userId, Guid applicationId, WithdrawApplicationRequest request, CancellationToken cancellationToken = default)
    {
        var candidate = await _context.Candidates
            .FirstOrDefaultAsync(c => c.UserId == userId, cancellationToken);

        if (candidate is null)
            return ServiceResult.NotFound<bool>("Candidate profile not found.");

        var application = await _context.Applications
            .Include(a => a.StatusHistories)
            .FirstOrDefaultAsync(a => a.Id == applicationId && a.CandidateId == candidate.Id && !a.IsDeleted, cancellationToken);

        if (application is null)
            return ServiceResult.NotFound<bool>("Application not found.");

        // P3-UC07 E1: Cannot withdraw if already finalized (Offer, Hired, Rejected) or past Interview
        if (application.Status is "Offer" or "Hired" or "Rejected" or "Interview")
            return ServiceResult.Failure<bool>($"Cannot withdraw an application currently in '{application.Status}' status.");

        if (application.Status == "Withdrawn")
            return ServiceResult.Failure<bool>("Application has already been withdrawn.");

        var oldStatus = application.Status;
        application.Status = "Withdrawn";

        application.StatusHistories.Add(new ApplicationStatusHistory
        {
            ApplicationId = application.Id,
            FromStatus    = oldStatus,
            ToStatus      = "Withdrawn",
            ChangedById   = userId,
            Reason        = string.IsNullOrWhiteSpace(request.Reason) ? "Candidate withdrew application" : request.Reason.Trim(),
            ChangedAt     = DateTime.UtcNow
        });

        await _context.SaveChangesAsync(cancellationToken);
        return ServiceResult.Success(true);
    }

    public async Task<ServiceResult<bool>> ToggleSaveJobAsync(
        Guid userId, Guid jobId, CancellationToken cancellationToken = default)
    {
        var candidate = await _context.Candidates
            .FirstOrDefaultAsync(c => c.UserId == userId, cancellationToken);

        if (candidate is null)
            return ServiceResult.NotFound<bool>("Candidate profile not found.");

        var jobExists = await _context.Jobs.AnyAsync(j => j.Id == jobId && !j.IsDeleted, cancellationToken);
        if (!jobExists)
            return ServiceResult.NotFound<bool>("Job not found.");

        var existingSavedJob = await _context.SavedJobs
            .FirstOrDefaultAsync(sj => sj.CandidateId == candidate.Id && sj.JobId == jobId, cancellationToken);

        if (existingSavedJob != null)
        {
            // Unsave
            _context.SavedJobs.Remove(existingSavedJob);
            await _context.SaveChangesAsync(cancellationToken);
            return ServiceResult.Success(false); // false = not saved anymore
        }
        else
        {
            // Save
            _context.SavedJobs.Add(new SavedJob
            {
                CandidateId = candidate.Id,
                JobId       = jobId,
                SavedAt     = DateTime.UtcNow
            });
            await _context.SaveChangesAsync(cancellationToken);
            return ServiceResult.Success(true); // true = saved
        }
    }

    public async Task<ServiceResult<PagedResult<SavedJobResponse>>> GetSavedJobsAsync(
        Guid userId, SavedJobFilterRequest filter, CancellationToken cancellationToken = default)
    {
        var candidate = await _context.Candidates
            .FirstOrDefaultAsync(c => c.UserId == userId, cancellationToken);

        if (candidate is null)
            return ServiceResult.NotFound<PagedResult<SavedJobResponse>>("Candidate profile not found.");

        var query = _context.SavedJobs
            .AsNoTracking()
            .Where(sj => sj.CandidateId == candidate.Id && !sj.Job.IsDeleted);

        var totalCount = await query.CountAsync(cancellationToken);

        var pageIndex = filter.PageIndex < 1 ? 1 : filter.PageIndex;
        var pageSize  = filter.PageSize is < 1 or > 100 ? 10 : filter.PageSize;

        var items = await query
            .OrderByDescending(sj => sj.SavedAt)
            .Skip((pageIndex - 1) * pageSize)
            .Take(pageSize)
            .Select(sj => new SavedJobResponse(
                sj.JobId,
                sj.Job.Title,
                sj.Job.CompanyId,
                sj.Job.Company.Name,
                sj.Job.Company.LogoUrl,
                sj.Job.Location != null ? sj.Job.Location.Name : null,
                sj.Job.SalaryMin,
                sj.Job.SalaryMax,
                sj.Job.SalaryCurrency,
                sj.Job.Deadline,
                sj.Job.IsActive,
                sj.Job.Deadline.HasValue && sj.Job.Deadline.Value < DateTime.UtcNow,
                sj.SavedAt
            ))
            .ToListAsync(cancellationToken);

        return ServiceResult.Success(new PagedResult<SavedJobResponse>(items, totalCount, pageIndex, pageSize));
    }

    public async Task<ServiceResult<PagedResult<JobSuggestionResponse>>> GetJobSuggestionsAsync(
        Guid userId, JobSuggestionFilterRequest filter, CancellationToken cancellationToken = default)
    {
        var candidate = await _context.Candidates
            .Include(c => c.Skills)
            .FirstOrDefaultAsync(c => c.UserId == userId, cancellationToken);

        if (candidate is null)
            return ServiceResult.NotFound<PagedResult<JobSuggestionResponse>>("Candidate profile not found.");

        var now = DateTime.UtcNow;

        // Fetch active, approved, non-expired jobs
        var activeJobs = await _context.Jobs
            .AsNoTracking()
            .Include(j => j.Company)
            .Include(j => j.Category)
            .Include(j => j.Level)
            .Include(j => j.Location)
            .Include(j => j.JobSkills)
                .ThenInclude(js => js.Skill)
            .Where(j => !j.IsDeleted && j.IsActive && j.ApprovalStatus == "Approved" && (!j.Deadline.HasValue || j.Deadline.Value >= now))
            .ToListAsync(cancellationToken);

        // Score each job using Rule-Based matching engine
        var scoredJobs = activeJobs
            .Select(j =>
            {
                var (score, explanation, matchedSkills, missingSkills) = CalculateMatchScore(candidate, j);
                return new
                {
                    Job = j,
                    Score = score,
                    Explanation = explanation,
                    MatchedSkills = matchedSkills,
                    MissingSkills = missingSkills
                };
            })
            .OrderByDescending(x => x.Score)
            .ThenByDescending(x => x.Job.CreatedAt)
            .ToList();

        var totalCount = scoredJobs.Count;
        var pageIndex  = filter.PageIndex < 1 ? 1 : filter.PageIndex;
        var pageSize   = filter.PageSize is < 1 or > 100 ? 10 : filter.PageSize;

        var pagedItems = scoredJobs
            .Skip((pageIndex - 1) * pageSize)
            .Take(pageSize)
            .Select(x => new JobSuggestionResponse(
                x.Job.Id,
                x.Job.CompanyId,
                x.Job.Company.Name,
                x.Job.Company.LogoUrl,
                x.Job.Title,
                x.Job.Category?.Name,
                x.Job.Level?.Name,
                x.Job.Location?.Name,
                x.Job.SalaryMin,
                x.Job.SalaryMax,
                x.Job.SalaryCurrency,
                x.Job.Deadline,
                x.Score,
                x.Explanation,
                x.MatchedSkills,
                x.MissingSkills
            ))
            .ToList();

        return ServiceResult.Success(new PagedResult<JobSuggestionResponse>(pagedItems, totalCount, pageIndex, pageSize));
    }

    // -------------------------------------------------------------------------
    // Recruiter Operations
    // -------------------------------------------------------------------------

    public async Task<ServiceResult<PagedResult<RecruiterApplicationListResponse>>> GetJobApplicationsAsync(
        Guid userId, Guid jobId, RecruiterApplicationFilterRequest filter, CancellationToken cancellationToken = default)
    {
        // Check recruiter ownership of the job
        var employer = await _context.Employers
            .FirstOrDefaultAsync(e => e.UserId == userId, cancellationToken);

        if (employer is null)
            return ServiceResult.NotFound<PagedResult<RecruiterApplicationListResponse>>("Employer profile not found.");

        var job = await _context.Jobs
            .FirstOrDefaultAsync(j => j.Id == jobId && !j.IsDeleted, cancellationToken);

        if (job is null)
            return ServiceResult.NotFound<PagedResult<RecruiterApplicationListResponse>>("Job not found.");

        if (job.CompanyId != employer.CompanyId)
            return ServiceResult.Forbidden<PagedResult<RecruiterApplicationListResponse>>("Access denied. You do not own this job.");

        var query = _context.Applications
            .AsNoTracking()
            .Include(a => a.Candidate)
            .Include(a => a.Cv)
            .Where(a => a.JobId == jobId && !a.IsDeleted);

        if (!string.IsNullOrWhiteSpace(filter.Status))
        {
            query = query.Where(a => a.Status == filter.Status);
        }

        if (filter.MinRating.HasValue)
        {
            query = query.Where(a => a.Rating.HasValue && a.Rating >= filter.MinRating.Value);
        }

        if (!string.IsNullOrWhiteSpace(filter.Keyword))
        {
            var kw = filter.Keyword.Trim().ToLower();
            query = query.Where(a => a.Candidate.FullName.ToLower().Contains(kw));
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var pageIndex = filter.PageIndex < 1 ? 1 : filter.PageIndex;
        var pageSize  = filter.PageSize is < 1 or > 100 ? 10 : filter.PageSize;

        var items = await query
            .OrderByDescending(a => a.AppliedAt)
            .Skip((pageIndex - 1) * pageSize)
            .Take(pageSize)
            .Select(a => new RecruiterApplicationListResponse(
                a.Id,
                a.CandidateId,
                a.Candidate.FullName,
                a.Candidate.AvatarUrl,
                a.Candidate.Phone,
                null, // email omitted here or populated if joined with AppUser
                a.CvId,
                a.Cv.Title,
                a.Cv.FileUrl,
                a.Status,
                a.Rating,
                a.EvaluationLabel,
                a.MatchScore,
                a.AppliedAt
            ))
            .ToListAsync(cancellationToken);

        return ServiceResult.Success(new PagedResult<RecruiterApplicationListResponse>(items, totalCount, pageIndex, pageSize));
    }

    public async Task<ServiceResult<RecruiterApplicationDetailResponse>> GetApplicationDetailAsync(
        Guid userId, Guid applicationId, CancellationToken cancellationToken = default)
    {
        var (application, error) = await FindApplicationWithRecruiterOwnershipAsync(userId, applicationId, cancellationToken);
        if (error is not null) return error;

        var matchedSkills = DeserializeSkillList(application!.MatchedSkillsJson);
        var missingSkills = DeserializeSkillList(application.MissingSkillsJson);

        var timeline = application.StatusHistories
            .OrderBy(h => h.ChangedAt)
            .Select(h => new ApplicationStatusTimelineItem(h.FromStatus, h.ToStatus, h.Reason, h.ChangedAt))
            .ToList();

        var response = new RecruiterApplicationDetailResponse(
            application.Id,
            application.JobId,
            application.Job.Title,
            application.CandidateId,
            application.Candidate.FullName,
            application.Candidate.AvatarUrl,
            application.Candidate.Phone,
            null,
            application.Candidate.Address,
            application.CvId,
            application.Cv.Title,
            application.Cv.FileUrl,
            application.CoverLetter,
            application.Status,
            application.Rating,
            application.EvaluationLabel,
            application.PrivateNotes,
            application.MatchScore,
            application.MatchExplanation,
            matchedSkills,
            missingSkills,
            application.AppliedAt,
            timeline
        );

        return ServiceResult.Success(response);
    }

    public async Task<ServiceResult<bool>> EvaluateApplicationAsync(
        Guid userId, Guid applicationId, EvaluateApplicationRequest request, CancellationToken cancellationToken = default)
    {
        var (application, error) = await FindApplicationWithRecruiterOwnershipAsync(userId, applicationId, cancellationToken);
        if (error is not null) return ServiceResult.Failure<bool>(error.ErrorMessage ?? "Access denied.", error.ErrorType);

        application!.Rating          = request.Rating;
        application.EvaluationLabel  = request.EvaluationLabel;
        application.PrivateNotes     = request.PrivateNotes;

        await _context.SaveChangesAsync(cancellationToken);
        return ServiceResult.Success(true);
    }

    public async Task<ServiceResult<bool>> UpdateApplicationStatusAsync(
        Guid userId, Guid applicationId, UpdateApplicationStatusRequest request, CancellationToken cancellationToken = default)
    {
        var (application, error) = await FindApplicationWithRecruiterOwnershipAsync(userId, applicationId, cancellationToken);
        if (error is not null) return ServiceResult.Failure<bool>(error.ErrorMessage ?? "Access denied.", error.ErrorType);

        if (application!.Status == "Withdrawn")
            return ServiceResult.Failure<bool>("Cannot update status of a withdrawn application.");

        var oldStatus = application.Status;
        application.Status = request.NewStatus;

        application.StatusHistories.Add(new ApplicationStatusHistory
        {
            ApplicationId = application.Id,
            FromStatus    = oldStatus,
            ToStatus      = request.NewStatus,
            ChangedById   = userId,
            Reason        = request.Reason,
            ChangedAt     = DateTime.UtcNow
        });

        await _context.SaveChangesAsync(cancellationToken);
        return ServiceResult.Success(true);
    }

    public async Task<ServiceResult<RecruitmentPipelineResponse>> GetRecruitmentPipelineAsync(
        Guid userId, Guid jobId, CancellationToken cancellationToken = default)
    {
        var employer = await _context.Employers
            .FirstOrDefaultAsync(e => e.UserId == userId, cancellationToken);

        if (employer is null)
            return ServiceResult.NotFound<RecruitmentPipelineResponse>("Employer profile not found.");

        var job = await _context.Jobs
            .FirstOrDefaultAsync(j => j.Id == jobId && !j.IsDeleted, cancellationToken);

        if (job is null)
            return ServiceResult.NotFound<RecruitmentPipelineResponse>("Job not found.");

        if (job.CompanyId != employer.CompanyId)
            return ServiceResult.Forbidden<RecruitmentPipelineResponse>("Access denied. You do not own this job.");

        // Fetch applications excluding withdrawn ones
        var applications = await _context.Applications
            .AsNoTracking()
            .Include(a => a.Candidate)
            .Include(a => a.Cv)
            .Where(a => a.JobId == jobId && !a.IsDeleted && a.Status != "Withdrawn")
            .ToListAsync(cancellationToken);

        var pipelineStages = new[] { "Applied", "Screening", "Interview", "Offer", "Hired", "Rejected" };

        var stageResponses = pipelineStages.Select(stage =>
        {
            var appsInStage = applications.Where(a => a.Status.Equals(stage, StringComparison.OrdinalIgnoreCase)).ToList();
            var cards = appsInStage.Select(a => new PipelineCandidateCardResponse(
                a.Id,
                a.CandidateId,
                a.Candidate.FullName,
                a.Candidate.AvatarUrl,
                a.Rating,
                a.EvaluationLabel,
                a.MatchScore,
                a.AppliedAt,
                a.Cv.FileUrl
            )).ToList();

            return new PipelineStageResponse(stage, cards.Count, cards);
        }).ToList();

        var response = new RecruitmentPipelineResponse(
            job.Id,
            job.Title,
            applications.Count,
            stageResponses
        );

        return ServiceResult.Success(response);
    }

    // -------------------------------------------------------------------------
    // Private Helpers & Rule-based Matching Engine
    // -------------------------------------------------------------------------

    private async Task<(JobApplication? App, ServiceResult<RecruiterApplicationDetailResponse>? Error)>
        FindApplicationWithRecruiterOwnershipAsync(Guid userId, Guid applicationId, CancellationToken ct)
    {
        var employer = await _context.Employers
            .FirstOrDefaultAsync(e => e.UserId == userId, ct);

        if (employer is null)
            return (null, ServiceResult.NotFound<RecruiterApplicationDetailResponse>("Employer profile not found."));

        var application = await _context.Applications
            .Include(a => a.Job)
            .Include(a => a.Candidate)
            .Include(a => a.Cv)
            .Include(a => a.StatusHistories)
            .FirstOrDefaultAsync(a => a.Id == applicationId && !a.IsDeleted, ct);

        if (application is null)
            return (null, ServiceResult.NotFound<RecruiterApplicationDetailResponse>("Application not found."));

        if (application.Job.CompanyId != employer.CompanyId)
            return (null, ServiceResult.Forbidden<RecruiterApplicationDetailResponse>("Access denied. You do not own this application."));

        return (application, null);
    }

    /// <summary>
    /// Pure Rule-based matching algorithm (SQL / LINQ).
    /// Calculates compatibility score (0 - 100%) based on:
    /// 1. Skills overlap (up to 70% weight)
    /// 2. Location match (15% weight)
    /// 3. Salary expectation overlap (15% weight)
    /// </summary>
    private static (int Score, string Explanation, List<string> MatchedSkills, List<string> MissingSkills)
        CalculateMatchScore(Candidate candidate, Job job)
    {
        var candidateSkillIds = candidate.Skills.Select(s => s.SkillId).ToHashSet();
        var requiredJobSkills = job.JobSkills.Where(js => js.IsRequired).ToList();
        var optionalJobSkills = job.JobSkills.Where(js => !js.IsRequired).ToList();

        var matchedSkillNames = new List<string>();
        var missingSkillNames = new List<string>();

        double skillScore = 0;

        if (requiredJobSkills.Count > 0)
        {
            int matchedReqCount = 0;
            foreach (var js in requiredJobSkills)
            {
                if (candidateSkillIds.Contains(js.SkillId))
                {
                    matchedReqCount++;
                    if (js.Skill != null) matchedSkillNames.Add(js.Skill.Name);
                }
                else
                {
                    if (js.Skill != null) missingSkillNames.Add(js.Skill.Name);
                }
            }

            // Up to 60% for required skills
            skillScore = ((double)matchedReqCount / requiredJobSkills.Count) * 60.0;

            // Up to 10% bonus for optional/nice-to-have skills
            if (optionalJobSkills.Count > 0)
            {
                int matchedOptCount = 0;
                foreach (var js in optionalJobSkills)
                {
                    if (candidateSkillIds.Contains(js.SkillId))
                    {
                        matchedOptCount++;
                        if (js.Skill != null) matchedSkillNames.Add(js.Skill.Name);
                    }
                }
                skillScore += ((double)matchedOptCount / optionalJobSkills.Count) * 10.0;
            }
        }
        else
        {
            // If job does not specify required skills, default baseline skill score
            skillScore = 50.0;
        }

        // 2. Location matching (15%)
        double locationScore = 0;
        if (job.LocationId.HasValue && !string.IsNullOrEmpty(candidate.DesiredLocationId))
        {
            if (job.LocationId.Value.ToString().Equals(candidate.DesiredLocationId, StringComparison.OrdinalIgnoreCase))
            {
                locationScore = 15.0;
            }
        }
        else
        {
            // Neutral
            locationScore = 10.0;
        }

        // 3. Salary overlap matching (15%)
        double salaryScore = 0;
        if (job.SalaryMin.HasValue && candidate.DesiredSalaryMax.HasValue)
        {
            bool overlaps = (!candidate.DesiredSalaryMin.HasValue || candidate.DesiredSalaryMin <= job.SalaryMax) &&
                            (!job.SalaryMin.HasValue || candidate.DesiredSalaryMax >= job.SalaryMin);
            if (overlaps) salaryScore = 15.0;
        }
        else
        {
            salaryScore = 10.0;
        }

        int totalScore = (int)Math.Clamp(Math.Round(skillScore + locationScore + salaryScore), 0, 100);

        string explanation = $"Trùng khớp {matchedSkillNames.Count}/{job.JobSkills.Count} kỹ năng yêu cầu. " +
                             $"Điểm tương thích kỹ năng: {(int)skillScore}%, Địa điểm: {(int)locationScore}%, Mức lương: {(int)salaryScore}%.";

        return (totalScore, explanation, matchedSkillNames, missingSkillNames);
    }

    private static List<string> DeserializeSkillList(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return [];
        try
        {
            return JsonSerializer.Deserialize<List<string>>(json) ?? [];
        }
        catch
        {
            return [];
        }
    }
}
