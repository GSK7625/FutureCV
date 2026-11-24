using System.Text.Json;
using FluentValidation;
using FutureCV.Application.Common.Interfaces;
using FutureCV.Application.Common.Models;
using FutureCV.Application.Features.AiMatching.DTOs;
using FutureCV.Application.Features.AiMatching.Mappers;
using FutureCV.Application.Features.Candidate.DTOs;
using FutureCV.Application.Features.CareerAssistant.DTOs;
using FutureCV.Application.Features.CareerAssistant.Interfaces;
using FutureCV.Application.Features.CareerAssistant.Validators;
using FutureCV.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using CareerConversationEntity = FutureCV.Domain.Entities.CareerConversation;
using CareerMessageEntity = FutureCV.Domain.Entities.CareerMessage;

namespace FutureCV.Application.Features.CareerAssistant.Services;

public sealed class CareerAssistantService(
    IApplicationDbContext db,
    ICareerAssistantClient client,
    IAiMatchingClient matchingClient,
    IValidator<CareerChatRequest> validator,
    IValidator<CreateCareerConversationRequest>? createValidator = null,
    IValidator<RenameCareerConversationRequest>? renameValidator = null,
    IValidator<ImportCareerConversationsRequest>? importValidator = null,
    ILogger<CareerAssistantService>? logger = null) : ICareerAssistantService
{
    private const int MaxAiHistoryMessages = 20;
    private const string NoOfficialMatchNotice =
        "Lưu ý: Hệ thống hiện không có điểm Matching chính thức cho cặp CV và việc làm này. Nội dung tư vấn dưới đây chỉ dựa trên thông tin CV và mô tả công việc.";

    private readonly IValidator<CreateCareerConversationRequest> _createValidator =
        createValidator ?? new CreateCareerConversationRequestValidator();
    private readonly IValidator<RenameCareerConversationRequest> _renameValidator =
        renameValidator ?? new RenameCareerConversationRequestValidator();
    private readonly IValidator<ImportCareerConversationsRequest> _importValidator =
        importValidator ?? new ImportCareerConversationsRequestValidator();
    private readonly ILogger<CareerAssistantService> _logger = logger ?? NullLogger<CareerAssistantService>.Instance;

    public async Task<ServiceResult<CareerChatResponse>> ChatAsync(Guid userId, CareerChatRequest request, CancellationToken cancellationToken = default)
    {
        var validation = await validator.ValidateAsync(request, cancellationToken);
        if (!validation.IsValid)
            return ServiceResult.Failure<CareerChatResponse>("Cau hoi hoac lich su chat khong hop le.");

        var candidate = await db.Candidates.AsNoTracking().FirstOrDefaultAsync(x => x.UserId == userId && !x.IsDeleted, cancellationToken);
        if (candidate is null)
            return ServiceResult.NotFound<CareerChatResponse>("Khong tim thay ho so ung vien.");

        CareerConversationEntity? conversation = null;
        IReadOnlyList<CareerMessage> historyForAi;
        Guid? effectiveCvId = request.CvId;
        Guid? effectiveJobId = request.JobId;

        if (request.ConversationId is Guid conversationId)
        {
            conversation = await db.CareerConversations
                .FirstOrDefaultAsync(x => x.Id == conversationId && !x.IsDeleted, cancellationToken);
            if (conversation is null)
                return ServiceResult.NotFound<CareerChatResponse>("Khong tim thay cuoc tro chuyen.");
            if (conversation.CandidateId != candidate.Id)
                return ServiceResult.Forbidden<CareerChatResponse>("Ban khong co quyen truy cap cuoc tro chuyen nay.");

            if ((request.CvId.HasValue && request.CvId != conversation.CvId) ||
                (request.JobId.HasValue && request.JobId != conversation.JobId))
            {
                return ServiceResult.Failure<CareerChatResponse>(
                    "Khong the doi CV hoac viec lam trong cuoc tro chuyen da co. Vui long tao cuoc tro chuyen moi.");
            }

            effectiveCvId = conversation.CvId;
            effectiveJobId = conversation.JobId;

            // Never trust client-supplied history when continuing a persisted conversation.
            var recentMessages = await db.CareerMessages
                .AsNoTracking()
                .Where(m => m.ConversationId == conversation.Id)
                .OrderByDescending(m => m.CreatedAt)
                .ThenByDescending(m => m.Id)
                .Take(MaxAiHistoryMessages)
                .Select(m => new { m.Role, m.Content })
                .ToListAsync(cancellationToken);

            recentMessages.Reverse();
            historyForAi = recentMessages
                .Select(m => new CareerMessage(m.Role, Truncate(m.Content, CareerMessageEntity.MaxUserContentLength)))
                .ToList();
        }
        else
        {
            historyForAi = request.History.Count > MaxAiHistoryMessages
                ? request.History.Skip(request.History.Count - MaxAiHistoryMessages).ToList()
                : request.History;
        }

        AiStructuredCvDto? cvContext = null;
        AiStructuredCvDto? matchingCv = null;
        CareerCvEvaluationDto? cvEvaluationContext = null;
        if (effectiveCvId is Guid cvId)
        {
            var cv = await db.CandidateCvs.AsNoTracking().FirstOrDefaultAsync(x => x.Id == cvId && x.CandidateId == candidate.Id && !x.IsDeleted, cancellationToken);
            if (cv is null)
                return ServiceResult.NotFound<CareerChatResponse>("Khong tim thay CV.");
            if (cv.ParseStatus != "Parsed")
                return ServiceResult.Conflict<CareerChatResponse>("CV chua phan tich xong. Vui long thu lai sau.");
            var parser = await db.CvParsers.AsNoTracking().FirstOrDefaultAsync(x => x.CvId == cvId, cancellationToken);
            try
            {
                var data = JsonSerializer.Deserialize<StructuredCvDataDto>(parser?.ParsedDataJson ?? "null");
                if (data is null)
                    return ServiceResult.Conflict<CareerChatResponse>("CV chua co du lieu phan tich.");
                var mapped = AiMatchingMapper.ToAiStructuredCv(data);
                if (mapped.CareerSummary?.Length > 4000 || !ValidSkills(mapped.Skills) || mapped.WorkExperience.Count > 30 ||
                    mapped.WorkExperience.Any(x => x.StartDate is not null && x.EndDate is not null && string.CompareOrdinal(x.StartDate, x.EndDate) > 0))
                    return ServiceResult.Failure<CareerChatResponse>("CV vuot gioi han tu van hoac co ngay kinh nghiem khong hop le. Hay chinh sua hoac chon CV khac.");

                var cvCertificates = await LoadCvCertificatesAsync(candidate.Id, cvId, mapped.Certificates, cancellationToken);
                cvContext = BuildBoundedCvContext(mapped, cvCertificates);
                cvEvaluationContext = await LoadCvEvaluationContextAsync(cvId, cancellationToken);
                // Strip dedicated identity fields before calling AI Matching while preserving all matching evidence.
                matchingCv = mapped with { FullName = null, Email = null, Phone = null };
            }
            catch (JsonException)
            {
                return ServiceResult.Conflict<CareerChatResponse>("Du lieu CV khong hop le. Vui long phan tich lai.");
            }
        }

        AiStructuredJobDto? jobContext = null;
        AiStructuredJobDto? matchingJob = null;
        if (effectiveJobId is Guid jobId)
        {
            var now = DateTime.UtcNow;
            var job = await db.Jobs.AsNoTracking().Include(x => x.JobSkills).ThenInclude(x => x.Skill)
                .Include(x => x.Level).Include(x => x.EmploymentType).Include(x => x.Location)
                .FirstOrDefaultAsync(x => x.Id == jobId && !x.IsDeleted && !x.IsBanned && x.IsActive && !x.IsExpired &&
                    x.ApprovalStatus == JobApprovalStatus.Approved && (x.Deadline == null || x.Deadline > now), cancellationToken);
            if (job is null)
                return ServiceResult.NotFound<CareerChatResponse>("Khong tim thay viec lam dang tuyen.");
            var mappedJob = AiMatchingMapper.ToAiStructuredJob(job);
            jobContext = new AiStructuredJobDto(mappedJob.Title, mappedJob.Description, mappedJob.RequiredSkills, mappedJob.PreferredSkills);
            if (string.IsNullOrWhiteSpace(jobContext.Title) || jobContext.Title.Length > 300 || jobContext.Description.Length > 20000 ||
                !ValidSkills(jobContext.RequiredSkills) || !ValidSkills(jobContext.PreferredSkills))
                return ServiceResult.Failure<CareerChatResponse>("Viec lam vuot gioi han tu van. Hay bo chon hoac chon viec lam khac.");
            matchingJob = mappedJob;
        }

        AiMatchResultDto? matchResult = null;
        var matchingUnavailable = false;
        if (matchingCv is not null && matchingJob is not null)
        {
            (matchResult, matchingUnavailable) = await TryComputeMatchResultAsync(
                matchingCv, matchingJob, effectiveCvId!.Value, effectiveJobId!.Value, cancellationToken);
        }

        var chatResult = await client.ChatAsync(
            new(request.Message, historyForAi, new(cvContext, jobContext, matchResult, cvEvaluationContext)),
            cancellationToken);

        if (!chatResult.IsSuccess || chatResult.Data is null || string.IsNullOrWhiteSpace(chatResult.Data.Reply))
            return chatResult;

        var finalReply = matchingUnavailable && !ContainsNoOfficialMatchNotice(chatResult.Data.Reply)
            ? $"{NoOfficialMatchNotice}\n\n{chatResult.Data.Reply}"
            : chatResult.Data.Reply;

        var userMessageTime = DateTime.UtcNow;
        var assistantMessageTime = userMessageTime.AddMilliseconds(1);

        if (conversation is null)
        {
            conversation = CareerConversationEntity.Create(
                candidate.Id,
                CareerConversationEntity.DeriveTitle(request.Message),
                effectiveCvId,
                effectiveJobId,
                userMessageTime);
            db.CareerConversations.Add(conversation);
        }

        var userEntity = CareerMessageEntity.Create(conversation.Id, "user", request.Message, userMessageTime);
        var assistantEntity = CareerMessageEntity.Create(conversation.Id, "assistant", finalReply, assistantMessageTime);
        db.CareerMessages.Add(userEntity);
        db.CareerMessages.Add(assistantEntity);
        conversation.Touch(assistantMessageTime);

        await db.SaveChangesAsync(cancellationToken);

        return ServiceResult.Success(chatResult.Data with
        {
            Reply = finalReply,
            ConversationId = conversation.Id
        });
    }

    public async Task<ServiceResult<CareerConversationSummaryDto>> CreateConversationAsync(
        Guid userId,
        CreateCareerConversationRequest request,
        CancellationToken cancellationToken = default)
    {
        var validation = await _createValidator.ValidateAsync(request, cancellationToken);
        if (!validation.IsValid)
            return ServiceResult.Failure<CareerConversationSummaryDto>("Thong tin cuoc tro chuyen khong hop le.");

        var candidate = await db.Candidates.AsNoTracking().FirstOrDefaultAsync(x => x.UserId == userId && !x.IsDeleted, cancellationToken);
        if (candidate is null)
            return ServiceResult.NotFound<CareerConversationSummaryDto>("Khong tim thay ho so ung vien.");

        string? cvTitle = null;
        if (request.CvId is Guid cvId)
        {
            var cv = await db.CandidateCvs.AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == cvId && x.CandidateId == candidate.Id && !x.IsDeleted, cancellationToken);
            if (cv is null)
                return ServiceResult.NotFound<CareerConversationSummaryDto>("Khong tim thay CV.");
            if (cv.ParseStatus != "Parsed")
                return ServiceResult.Conflict<CareerConversationSummaryDto>("CV chua phan tich xong. Vui long thu lai sau.");
            cvTitle = cv.Title;
        }

        string? jobTitle = null;
        if (request.JobId is Guid jobId)
        {
            var now = DateTime.UtcNow;
            var job = await db.Jobs.AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == jobId && !x.IsDeleted && !x.IsBanned && x.IsActive && !x.IsExpired &&
                    x.ApprovalStatus == JobApprovalStatus.Approved && (x.Deadline == null || x.Deadline > now), cancellationToken);
            if (job is null)
                return ServiceResult.NotFound<CareerConversationSummaryDto>("Khong tim thay viec lam dang tuyen.");
            jobTitle = job.Title;
        }

        var title = string.IsNullOrWhiteSpace(request.Title) ? "Cuộc trò chuyện mới" : request.Title.Trim();
        var conversation = CareerConversationEntity.Create(candidate.Id, title, request.CvId, request.JobId);
        db.CareerConversations.Add(conversation);
        await db.SaveChangesAsync(cancellationToken);

        return ServiceResult.Success(new CareerConversationSummaryDto(
            conversation.Id,
            conversation.Title,
            conversation.CvId,
            cvTitle,
            conversation.JobId,
            jobTitle,
            0,
            conversation.CreatedAt,
            conversation.UpdatedAt ?? conversation.CreatedAt));
    }

    public async Task<ServiceResult<PagedResult<CareerConversationSummaryDto>>> GetConversationsAsync(
        Guid userId,
        CareerConversationFilterRequest filter,
        CancellationToken cancellationToken = default)
    {
        var candidate = await db.Candidates.AsNoTracking().FirstOrDefaultAsync(x => x.UserId == userId && !x.IsDeleted, cancellationToken);
        if (candidate is null)
            return ServiceResult.NotFound<PagedResult<CareerConversationSummaryDto>>("Khong tim thay ho so ung vien.");

        var pageIndex = filter.PageIndex < 1 ? 1 : filter.PageIndex;
        var pageSize = filter.PageSize is < 1 or > 50 ? 10 : filter.PageSize;

        var query = db.CareerConversations
            .AsNoTracking()
            .Where(c => c.CandidateId == candidate.Id && !c.IsDeleted);

        var totalCount = await query.CountAsync(cancellationToken);

        var items = await query
            .OrderByDescending(c => c.UpdatedAt ?? c.CreatedAt)
            .ThenByDescending(c => c.CreatedAt)
            .Skip((pageIndex - 1) * pageSize)
            .Take(pageSize)
            .Select(c => new CareerConversationSummaryDto(
                c.Id,
                c.Title,
                c.CvId,
                c.Cv != null && !c.Cv.IsDeleted ? c.Cv.Title : null,
                c.JobId,
                c.Job != null && !c.Job.IsDeleted ? c.Job.Title : null,
                c.Messages.Count,
                c.CreatedAt,
                c.UpdatedAt ?? c.CreatedAt))
            .ToListAsync(cancellationToken);

        return ServiceResult.Success(new PagedResult<CareerConversationSummaryDto>(items, totalCount, pageIndex, pageSize));
    }

    public async Task<ServiceResult<CareerConversationDetailDto>> GetConversationDetailAsync(
        Guid userId,
        Guid conversationId,
        CancellationToken cancellationToken = default)
    {
        var candidate = await db.Candidates.AsNoTracking().FirstOrDefaultAsync(x => x.UserId == userId && !x.IsDeleted, cancellationToken);
        if (candidate is null)
            return ServiceResult.NotFound<CareerConversationDetailDto>("Khong tim thay ho so ung vien.");

        var conversation = await db.CareerConversations
            .AsNoTracking()
            .Include(c => c.Cv)
            .Include(c => c.Job)
            .FirstOrDefaultAsync(c => c.Id == conversationId && !c.IsDeleted, cancellationToken);

        if (conversation is null)
            return ServiceResult.NotFound<CareerConversationDetailDto>("Khong tim thay cuoc tro chuyen.");
        if (conversation.CandidateId != candidate.Id)
            return ServiceResult.Forbidden<CareerConversationDetailDto>("Ban khong co quyen truy cap cuoc tro chuyen nay.");

        var messages = await db.CareerMessages
            .AsNoTracking()
            .Where(m => m.ConversationId == conversation.Id)
            .OrderBy(m => m.CreatedAt)
            .ThenBy(m => m.Id)
            .Select(m => new CareerConversationMessageDto(m.Id, m.Role, m.Content, m.CreatedAt))
            .ToListAsync(cancellationToken);

        return ServiceResult.Success(new CareerConversationDetailDto(
            conversation.Id,
            conversation.Title,
            conversation.CvId,
            conversation.Cv is not null && !conversation.Cv.IsDeleted ? conversation.Cv.Title : null,
            conversation.JobId,
            conversation.Job is not null && !conversation.Job.IsDeleted ? conversation.Job.Title : null,
            conversation.CreatedAt,
            conversation.UpdatedAt ?? conversation.CreatedAt,
            messages));
    }

    public async Task<ServiceResult<CareerConversationSummaryDto>> RenameConversationAsync(
        Guid userId,
        Guid conversationId,
        RenameCareerConversationRequest request,
        CancellationToken cancellationToken = default)
    {
        var validation = await _renameValidator.ValidateAsync(request, cancellationToken);
        if (!validation.IsValid)
            return ServiceResult.Failure<CareerConversationSummaryDto>("Tieu de cuoc tro chuyen khong hop le.");

        var candidate = await db.Candidates.AsNoTracking().FirstOrDefaultAsync(x => x.UserId == userId && !x.IsDeleted, cancellationToken);
        if (candidate is null)
            return ServiceResult.NotFound<CareerConversationSummaryDto>("Khong tim thay ho so ung vien.");

        var conversation = await db.CareerConversations
            .Include(c => c.Cv)
            .Include(c => c.Job)
            .FirstOrDefaultAsync(c => c.Id == conversationId && !c.IsDeleted, cancellationToken);

        if (conversation is null)
            return ServiceResult.NotFound<CareerConversationSummaryDto>("Khong tim thay cuoc tro chuyen.");
        if (conversation.CandidateId != candidate.Id)
            return ServiceResult.Forbidden<CareerConversationSummaryDto>("Ban khong co quyen doi ten cuoc tro chuyen nay.");

        conversation.Rename(request.Title);
        await db.SaveChangesAsync(cancellationToken);

        var messageCount = await db.CareerMessages.CountAsync(m => m.ConversationId == conversation.Id, cancellationToken);

        return ServiceResult.Success(new CareerConversationSummaryDto(
            conversation.Id,
            conversation.Title,
            conversation.CvId,
            conversation.Cv is not null && !conversation.Cv.IsDeleted ? conversation.Cv.Title : null,
            conversation.JobId,
            conversation.Job is not null && !conversation.Job.IsDeleted ? conversation.Job.Title : null,
            messageCount,
            conversation.CreatedAt,
            conversation.UpdatedAt ?? conversation.CreatedAt));
    }

    public async Task<ServiceResult<bool>> DeleteConversationAsync(
        Guid userId,
        Guid conversationId,
        CancellationToken cancellationToken = default)
    {
        var candidate = await db.Candidates.AsNoTracking().FirstOrDefaultAsync(x => x.UserId == userId && !x.IsDeleted, cancellationToken);
        if (candidate is null)
            return ServiceResult.NotFound<bool>("Khong tim thay ho so ung vien.");

        var conversation = await db.CareerConversations
            .FirstOrDefaultAsync(c => c.Id == conversationId && !c.IsDeleted, cancellationToken);

        if (conversation is null)
            return ServiceResult.NotFound<bool>("Khong tim thay cuoc tro chuyen.");
        if (conversation.CandidateId != candidate.Id)
            return ServiceResult.Forbidden<bool>("Ban khong co quyen xoa cuoc tro chuyen nay.");

        conversation.MarkDeleted();
        await db.SaveChangesAsync(cancellationToken);

        return ServiceResult.Success(true);
    }

    public async Task<ServiceResult<IReadOnlyList<CareerConversationSummaryDto>>> ImportConversationsAsync(
        Guid userId,
        ImportCareerConversationsRequest request,
        CancellationToken cancellationToken = default)
    {
        var validation = await _importValidator.ValidateAsync(request, cancellationToken);
        if (!validation.IsValid)
            return ServiceResult.Failure<IReadOnlyList<CareerConversationSummaryDto>>("Du lieu lich su nhap len khong hop le.");

        var candidate = await db.Candidates.AsNoTracking().FirstOrDefaultAsync(x => x.UserId == userId && !x.IsDeleted, cancellationToken);
        if (candidate is null)
            return ServiceResult.NotFound<IReadOnlyList<CareerConversationSummaryDto>>("Khong tim thay ho so ung vien.");

        var requestedCvIds = request.Conversations.Where(c => c.CvId.HasValue).Select(c => c.CvId!.Value).Distinct().ToList();
        var ownedCvs = requestedCvIds.Count == 0
            ? new Dictionary<Guid, string?>()
            : await db.CandidateCvs.AsNoTracking()
                .Where(cv => requestedCvIds.Contains(cv.Id) && cv.CandidateId == candidate.Id && !cv.IsDeleted)
                .ToDictionaryAsync(cv => cv.Id, cv => cv.Title, cancellationToken);

        var now = DateTime.UtcNow;
        var requestedJobIds = request.Conversations.Where(c => c.JobId.HasValue).Select(c => c.JobId!.Value).Distinct().ToList();
        var publicJobs = requestedJobIds.Count == 0
            ? new Dictionary<Guid, string>()
            : await db.Jobs.AsNoTracking()
                .Where(j => requestedJobIds.Contains(j.Id) && !j.IsDeleted && !j.IsBanned && j.IsActive && !j.IsExpired &&
                    j.ApprovalStatus == JobApprovalStatus.Approved && (j.Deadline == null || j.Deadline > now))
                .ToDictionaryAsync(j => j.Id, j => j.Title, cancellationToken);

        var imported = new List<CareerConversationSummaryDto>();
        foreach (var item in request.Conversations)
        {
            Guid? verifiedCvId = item.CvId.HasValue && ownedCvs.ContainsKey(item.CvId.Value) ? item.CvId : null;
            Guid? verifiedJobId = item.JobId.HasValue && publicJobs.ContainsKey(item.JobId.Value) ? item.JobId : null;
            var baseTime = item.UpdatedAt?.ToUniversalTime() ?? now;

            var conversation = CareerConversationEntity.Create(
                candidate.Id,
                item.Title,
                verifiedCvId,
                verifiedJobId,
                baseTime);
            db.CareerConversations.Add(conversation);

            for (var i = 0; i < item.Messages.Count; i++)
            {
                var msg = item.Messages[i];
                var msgTime = baseTime.AddMilliseconds(i);
                db.CareerMessages.Add(CareerMessageEntity.Create(conversation.Id, msg.Role, msg.Content, msgTime));
            }

            conversation.Touch(baseTime.AddMilliseconds(Math.Max(0, item.Messages.Count - 1)));
            imported.Add(new CareerConversationSummaryDto(
                conversation.Id,
                conversation.Title,
                verifiedCvId,
                verifiedCvId.HasValue ? ownedCvs[verifiedCvId.Value] : null,
                verifiedJobId,
                verifiedJobId.HasValue ? publicJobs[verifiedJobId.Value] : null,
                item.Messages.Count,
                conversation.CreatedAt,
                conversation.UpdatedAt ?? conversation.CreatedAt));
        }

        await db.SaveChangesAsync(cancellationToken);
        return ServiceResult.Success<IReadOnlyList<CareerConversationSummaryDto>>(imported);
    }

    private async Task<(AiMatchResultDto? Result, bool Unavailable)> TryComputeMatchResultAsync(
        AiStructuredCvDto cv,
        AiStructuredJobDto job,
        Guid cvId,
        Guid jobId,
        CancellationToken cancellationToken)
    {
        try
        {
            var response = await matchingClient.MatchAsync(new AiMatchRequest(cv, job), cancellationToken: cancellationToken);
            if (!response.IsSuccess || response.Data is null)
            {
                _logger.LogWarning(
                    "Career Assistant matching unavailable for CvId={CvId}, JobId={JobId}: {Reason}",
                    cvId, jobId, response.ErrorMessage ?? "Matching failed");
                return (null, true);
            }

            var normalized = NormalizeValidMatchResult(response.Data);
            if (normalized is null)
            {
                _logger.LogWarning(
                    "Career Assistant rejected invalid match result for CvId={CvId}, JobId={JobId}",
                    cvId, jobId);
                return (null, true);
            }

            return (normalized, false);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(
                ex,
                "Career Assistant matching threw unexpected error for CvId={CvId}, JobId={JobId}",
                cvId, jobId);
            return (null, true);
        }
    }

    private static AiMatchResultDto? NormalizeValidMatchResult(AiMatchResultDto result)
    {
        if (result.MatchScore is < 0 or > 100)
            return null;

        var matchedSkills = result.MatchedSkills ?? [];
        var missingSkills = result.MissingSkills ?? [];
        if (matchedSkills.Count > 200 || matchedSkills.Any(s => s is null || s.Length > 200) ||
            missingSkills.Count > 200 || missingSkills.Any(s => s is null || s.Length > 200))
            return null;

        var expComparison = result.ExperienceComparison ?? string.Empty;
        var eduComparison = result.EducationComparison ?? string.Empty;
        var projectRelevance = result.ProjectDomainRelevance ?? string.Empty;
        if (expComparison.Length > 4000 || eduComparison.Length > 4000 || projectRelevance.Length > 4000 ||
            result.MatchExplanation?.Length > 10000 || result.Warning?.Length > 1000)
            return null;

        var meta = result.Meta ?? new AiResponseMetaDto();
        var normalizedMeta = meta with
        {
            AlgorithmVersion = string.IsNullOrWhiteSpace(meta.AlgorithmVersion) ? "1.0.0" : meta.AlgorithmVersion,
            PromptVersion = string.IsNullOrWhiteSpace(meta.PromptVersion) ? "v1" : meta.PromptVersion,
            Provider = string.IsNullOrWhiteSpace(meta.Provider) ? "unknown" : meta.Provider,
            Model = string.IsNullOrWhiteSpace(meta.Model) ? "unknown" : meta.Model,
            CorrelationId = string.IsNullOrWhiteSpace(meta.CorrelationId) ? "-" : meta.CorrelationId
        };

        return result with
        {
            MatchedSkills = matchedSkills,
            MissingSkills = missingSkills,
            ExperienceComparison = expComparison,
            EducationComparison = eduComparison,
            ProjectDomainRelevance = projectRelevance,
            Meta = normalizedMeta
        };
    }

    private async Task<List<string>> LoadCvCertificatesAsync(
        Guid candidateId,
        Guid cvId,
        List<string> parsedCertificates,
        CancellationToken cancellationToken)
    {
        var dbCerts = await db.Certificates
            .AsNoTracking()
            .Where(c => c.CandidateId == candidateId && !c.IsDeleted && (c.CvId == cvId || c.CvId == null))
            .OrderBy(c => c.CvId == null ? 1 : 0)
            .ThenBy(c => c.CreatedAt)
            .ThenBy(c => c.Name)
            .Select(c => new { c.Name, c.Organization })
            .ToListAsync(cancellationToken);

        var merged = new List<string>();
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var cert in parsedCertificates)
        {
            var trimmed = cert?.Trim();
            if (!string.IsNullOrWhiteSpace(trimmed) && seen.Add(trimmed))
                merged.Add(Truncate(trimmed, 300));
        }

        foreach (var cert in dbCerts)
        {
            if (string.IsNullOrWhiteSpace(cert.Name))
                continue;
            var label = string.IsNullOrWhiteSpace(cert.Organization)
                ? cert.Name.Trim()
                : $"{cert.Name.Trim()} ({cert.Organization.Trim()})";
            if (seen.Add(label))
                merged.Add(Truncate(label, 300));
        }

        return merged.Take(20).ToList();
    }

    private async Task<CareerCvEvaluationDto?> LoadCvEvaluationContextAsync(Guid cvId, CancellationToken cancellationToken)
    {
        var evaluation = await db.CvEvaluations
            .AsNoTracking()
            .FirstOrDefaultAsync(e => e.CvId == cvId, cancellationToken);
        if (evaluation is null)
            return null;

        var score = evaluation.CvScore is >= 0 and <= 100 ? evaluation.CvScore : null;
        var strengths = DeserializeBoundedList(evaluation.StrengthsJson, 10, 500);
        var weaknesses = DeserializeBoundedList(evaluation.WeaknessesJson, 10, 500);
        var improvements = DeserializeBoundedList(evaluation.ImprovementsJson, 10, 500);

        if (score is null && strengths.Count == 0 && weaknesses.Count == 0 && improvements.Count == 0)
            return null;

        return new CareerCvEvaluationDto(score, strengths, weaknesses, improvements);
    }

    private static AiStructuredCvDto BuildBoundedCvContext(AiStructuredCvDto mapped, List<string> certificates)
    {
        var summary = string.IsNullOrWhiteSpace(mapped.CareerSummary) ? null : mapped.CareerSummary.Trim();

        var workExperiences = mapped.WorkExperience
            .Select(x => new AiWorkExperienceDto(
                JobTitle: string.IsNullOrWhiteSpace(x.JobTitle) ? null : Truncate(x.JobTitle.Trim(), 300),
                Company: string.IsNullOrWhiteSpace(x.Company) ? string.Empty : Truncate(x.Company.Trim(), 200),
                Duration: string.IsNullOrWhiteSpace(x.Duration) ? string.Empty : Truncate(x.Duration.Trim(), 100),
                StartDate: x.StartDate,
                EndDate: x.EndDate,
                YearsOfExperience: Math.Clamp(x.YearsOfExperience, 0.0, 60.0),
                Description: string.IsNullOrWhiteSpace(x.Description) ? string.Empty : Truncate(x.Description.Trim(), 500)))
            .ToList();

        var educations = mapped.Education
            .Select(e => new AiEducationDto(
                Degree: string.IsNullOrWhiteSpace(e.Degree) ? null : Truncate(e.Degree.Trim(), 200),
                Institution: string.IsNullOrWhiteSpace(e.Institution) ? string.Empty : Truncate(e.Institution.Trim(), 200),
                FieldOfStudy: string.IsNullOrWhiteSpace(e.FieldOfStudy) ? string.Empty : Truncate(e.FieldOfStudy.Trim(), 200),
                GraduationYear: string.IsNullOrWhiteSpace(e.GraduationYear) ? null : Truncate(e.GraduationYear.Trim(), 50)))
            .Where(e => e.Degree is not null || !string.IsNullOrEmpty(e.Institution) ||
                        !string.IsNullOrEmpty(e.FieldOfStudy) || e.GraduationYear is not null)
            .Take(20)
            .ToList();

        var projects = mapped.Projects
            .Where(p => !string.IsNullOrWhiteSpace(p.Name))
            .Select(p => new AiProjectDto(
                Name: Truncate(p.Name.Trim(), 300),
                Description: string.IsNullOrWhiteSpace(p.Description) ? string.Empty : Truncate(p.Description.Trim(), 500),
                Technologies: (p.Technologies ?? [])
                    .Where(t => !string.IsNullOrWhiteSpace(t))
                    .Select(t => Truncate(t.Trim(), 200))
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .Take(50)
                    .ToList()))
            .Take(15)
            .ToList();

        var technologies = mapped.Technologies
            .Where(t => !string.IsNullOrWhiteSpace(t))
            .Select(t => Truncate(t.Trim(), 200))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Take(100)
            .ToList();

        return new AiStructuredCvDto(
            FullName: null,
            Email: null,
            Phone: null,
            CareerSummary: summary,
            Skills: mapped.Skills,
            WorkExperience: workExperiences,
            Education: educations,
            Certificates: certificates,
            Projects: projects,
            Technologies: technologies);
    }

    private static List<string> DeserializeBoundedList(string? json, int maxItems, int maxItemLength)
    {
        if (string.IsNullOrWhiteSpace(json))
            return [];

        try
        {
            var items = JsonSerializer.Deserialize<List<string>>(json);
            if (items is null)
                return [];

            return items
                .Where(x => !string.IsNullOrWhiteSpace(x))
                .Select(x => Truncate(x.Trim(), maxItemLength))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .Take(maxItems)
                .ToList();
        }
        catch (JsonException)
        {
            return [];
        }
    }

    private static string Truncate(string value, int maxLength)
        => value.Length <= maxLength ? value : value[..maxLength];

    private static bool ContainsNoOfficialMatchNotice(string reply)
    {
        var lower = reply.ToLowerInvariant();
        return lower.Contains("không có điểm matching chính thức") ||
               lower.Contains("chưa có điểm matching chính thức");
    }

    private static bool ValidSkills(List<string> skills)
        => skills.Count <= 100 && skills.All(x => !string.IsNullOrWhiteSpace(x) && x.Length <= 200);
}
