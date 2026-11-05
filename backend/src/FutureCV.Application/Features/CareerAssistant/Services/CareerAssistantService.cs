using System.Text.Json;
using FluentValidation;
using FutureCV.Application.Common.Interfaces;
using FutureCV.Application.Common.Models;
using FutureCV.Application.Features.AiMatching.DTOs;
using FutureCV.Application.Features.AiMatching.Mappers;
using FutureCV.Application.Features.Candidate.DTOs;
using FutureCV.Application.Features.CareerAssistant.DTOs;
using FutureCV.Application.Features.CareerAssistant.Interfaces;
using Microsoft.EntityFrameworkCore;
using FutureCV.Domain.Enums;

namespace FutureCV.Application.Features.CareerAssistant.Services;

public sealed class CareerAssistantService(
    IApplicationDbContext db,
    ICareerAssistantClient client,
    IValidator<CareerChatRequest> validator) : ICareerAssistantService
{
    public async Task<ServiceResult<CareerChatResponse>> ChatAsync(Guid userId, CareerChatRequest request, CancellationToken cancellationToken = default)
    {
        var validation = await validator.ValidateAsync(request, cancellationToken);
        if (!validation.IsValid)
            return ServiceResult.Failure<CareerChatResponse>("Cau hoi hoac lich su chat khong hop le.");

        var candidate = await db.Candidates.AsNoTracking().FirstOrDefaultAsync(x => x.UserId == userId && !x.IsDeleted, cancellationToken);
        if (candidate is null)
            return ServiceResult.NotFound<CareerChatResponse>("Khong tim thay ho so ung vien.");

        AiStructuredCvDto? cvContext = null;
        if (request.CvId is Guid cvId)
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
                cvContext = AiMatchingMapper.ToAiStructuredCv(data) with { FullName = null, Email = null, Phone = null };
            }
            catch (JsonException)
            {
                return ServiceResult.Conflict<CareerChatResponse>("Du lieu CV khong hop le. Vui long phan tich lai.");
            }
        }

        AiStructuredJobDto? jobContext = null;
        if (request.JobId is Guid jobId)
        {
            var now = DateTime.UtcNow;
            var job = await db.Jobs.AsNoTracking().Include(x => x.JobSkills).ThenInclude(x => x.Skill)
                .Include(x => x.Level).Include(x => x.EmploymentType).Include(x => x.Location)
                .FirstOrDefaultAsync(x => x.Id == jobId && !x.IsDeleted && !x.IsBanned && x.IsActive && !x.IsExpired &&
                    x.ApprovalStatus == JobApprovalStatus.Approved && (x.Deadline == null || x.Deadline > now), cancellationToken);
            if (job is null)
                return ServiceResult.NotFound<CareerChatResponse>("Khong tim thay viec lam dang tuyen.");
            jobContext = AiMatchingMapper.ToAiStructuredJob(job);
        }

        return await client.ChatAsync(new(request.Message, request.History, new(cvContext, jobContext)), cancellationToken);
    }
}
