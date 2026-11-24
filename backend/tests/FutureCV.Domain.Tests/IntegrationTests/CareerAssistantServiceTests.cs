using System.Text.Json;
using FutureCV.Application.Common.Interfaces;
using FutureCV.Application.Common.Models;
using FutureCV.Application.Features.AiMatching.DTOs;
using FutureCV.Application.Features.Candidate.DTOs;
using FutureCV.Application.Features.CareerAssistant.DTOs;
using FutureCV.Application.Features.CareerAssistant.Interfaces;
using FutureCV.Application.Features.CareerAssistant.Services;
using FutureCV.Application.Features.CareerAssistant.Validators;
using FutureCV.Domain.Entities;
using FutureCV.Domain.Enums;
using FutureCV.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace FutureCV.Domain.Tests.IntegrationTests;

public class CareerAssistantServiceTests
{
    [Fact]
    public async Task RejectsOversizedJobBeforeCallingPython()
    {
        using var db = Db();
        var candidate = new Candidate { UserId = Guid.NewGuid(), FullName = "Candidate" };
        var job = new Job { Title = "Backend", Description = new string('x', 20001), ApprovalStatus = FutureCV.Domain.Enums.JobApprovalStatus.Approved };
        db.Candidates.Add(candidate);
        db.Jobs.Add(job);
        await db.SaveChangesAsync();
        var client = new Client();
        var result = await Service(db, client).ChatAsync(candidate.UserId, new("Advice", [], JobId: job.Id));
        Assert.False(result.IsSuccess);
        Assert.Equal(ServiceErrorType.Validation, result.ErrorType);
        Assert.Null(client.Request);
    }

    [Fact]
    public async Task RejectsDeletedCandidate()
    {
        using var db = Db();
        var candidate = new Candidate { UserId = Guid.NewGuid(), FullName = "Candidate", IsDeleted = true };
        db.Candidates.Add(candidate);
        await db.SaveChangesAsync();
        var client = new Client();
        Assert.False((await Service(db, client).ChatAsync(candidate.UserId, new("Advice", []))).IsSuccess);
        Assert.Null(client.Request);
    }

    [Theory]
    [InlineData("not-json")]
    [InlineData("null")]
    public async Task RejectsMalformedCvWithoutCallingAi(string data)
    {
        using var db = Db();
        var candidate = new Candidate { UserId = Guid.NewGuid(), FullName = "Candidate" };
        var cv = new CandidateCv { CandidateId = candidate.Id, ParseStatus = "Parsed" };
        db.Candidates.Add(candidate);
        db.CandidateCvs.Add(cv);
        db.CvParsers.Add(new CvParser { CvId = cv.Id, ParsedDataJson = data });
        await db.SaveChangesAsync();
        var client = new Client();
        Assert.False((await Service(db, client).ChatAsync(candidate.UserId, new("Advice", [], cv.Id))).IsSuccess);
        Assert.Null(client.Request);
    }

    [Theory]
    [InlineData("public")]
    [InlineData("draft")]
    [InlineData("banned")]
    [InlineData("closed")]
    [InlineData("deleted")]
    [InlineData("expired")]
    public async Task OnlyUsesPublicJobs(string state)
    {
        using var db = Db();
        var candidate = new Candidate { UserId = Guid.NewGuid(), FullName = "Candidate" };
        db.Candidates.Add(candidate);
        var job = new Job
        {
            Title = "Backend Developer",
            ApprovalStatus = state == "draft" ? FutureCV.Domain.Enums.JobApprovalStatus.Draft : FutureCV.Domain.Enums.JobApprovalStatus.Approved,
            IsBanned = state == "banned", IsActive = state != "closed", IsDeleted = state == "deleted",
            Deadline = state == "expired" ? DateTime.UtcNow.AddDays(-1) : DateTime.UtcNow.AddDays(1)
        };
        db.Jobs.Add(job);
        await db.SaveChangesAsync();
        var client = new Client();
        var result = await Service(db, client).ChatAsync(candidate.UserId, new("Advice", [], JobId: job.Id));
        Assert.Equal(state == "public", result.IsSuccess);
        if (state == "public") Assert.Equal("Backend Developer", client.Request!.Context.Job!.Title);
        else Assert.Null(client.Request);
    }

    private sealed class Client : ICareerAssistantClient
    {
        public CareerAiRequest? Request { get; private set; }
        public string Reply { get; set; } = "Advice";
        public Func<CareerAiRequest, CancellationToken, Task<ServiceResult<CareerChatResponse>>>? Handler { get; set; }
        public Task<ServiceResult<CareerChatResponse>> ChatAsync(CareerAiRequest request, CancellationToken cancellationToken = default)
        {
            Request = request;
            if (Handler is not null)
                return Handler(request, cancellationToken);
            return Task.FromResult(ServiceResult.Success(new CareerChatResponse(Reply, [])));
        }
    }

    private sealed class MatchingClient : IAiMatchingClient
    {
        public int CallCount { get; private set; }
        public AiMatchRequest? LastRequest { get; private set; }
        public Func<AiMatchRequest, CancellationToken, Task<ServiceResult<AiMatchResultDto>>>? Handler { get; set; }

        public Task<ServiceResult<AiMatchResultDto>> MatchAsync(
            AiMatchRequest request,
            string? correlationId = null,
            CancellationToken cancellationToken = default)
        {
            CallCount++;
            LastRequest = request;
            if (Handler is not null)
                return Handler(request, cancellationToken);

            return Task.FromResult(ServiceResult.Success(new AiMatchResultDto(
                MatchScore: 86,
                MatchedSkills: ["C#", ".NET"],
                MissingSkills: ["Docker"],
                ExperienceComparison: "3.0 years meets 2.0 years required.",
                EducationComparison: "Bachelor meets requirement.",
                ProjectDomainRelevance: "1/1 relevant backend project.",
                MatchExplanation: "Strong .NET profile; learn Docker.",
                Meta: new AiResponseMetaDto(
                    AlgorithmVersion: "matching-v0",
                    PromptVersion: "v1",
                    Provider: "mock",
                    Model: "mock-deterministic",
                    CorrelationId: "cid-match"))));
        }

        public Task<ServiceResult<AiCandidateRankResponse>> RankCandidatesAsync(
            AiCandidateRankRequest request,
            string? correlationId = null,
            CancellationToken cancellationToken = default)
            => throw new NotSupportedException();
    }

    private static ApplicationDbContext Db() => new(new DbContextOptionsBuilder<ApplicationDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
    private static CareerAssistantService Service(ApplicationDbContext db, Client client, MatchingClient? matchingClient = null)
        => new(db, client, matchingClient ?? new MatchingClient(), new CareerChatRequestValidator());

    [Fact]
    public async Task AllowsGeneralAdviceWithoutCv()
    {
        using var db = Db();
        var userId = Guid.NewGuid();
        db.Candidates.Add(new Candidate { UserId = userId, FullName = "Candidate" });
        await db.SaveChangesAsync();
        var client = new Client();
        Assert.True((await Service(db, client).ChatAsync(userId, new("Advice", []))).IsSuccess);
        Assert.Null(client.Request!.Context.Cv);
    }

    [Fact]
    public async Task RejectsForeignDeletedAndUnparsedCvBeforeCallingAi()
    {
        using var db = Db();
        var userId = Guid.NewGuid();
        var candidate = new Candidate { UserId = userId, FullName = "Candidate" };
        db.Candidates.Add(candidate);
        var cv = new CandidateCv { CandidateId = Guid.NewGuid(), ParseStatus = "Parsed" };
        db.CandidateCvs.Add(cv);
        await db.SaveChangesAsync();
        var client = new Client();
        Assert.False((await Service(db, client).ChatAsync(userId, new("Advice", [], cv.Id))).IsSuccess);
        cv.CandidateId = candidate.Id;
        cv.IsDeleted = true;
        await db.SaveChangesAsync();
        Assert.False((await Service(db, client).ChatAsync(userId, new("Advice", [], cv.Id))).IsSuccess);
        cv.IsDeleted = false;
        cv.ParseStatus = "Pending";
        await db.SaveChangesAsync();
        Assert.False((await Service(db, client).ChatAsync(userId, new("Advice", [], cv.Id))).IsSuccess);
        Assert.Null(client.Request);
    }

    [Fact]
    public async Task UsesSelectedCvAndOmitsContactIdentity()
    {
        using var db = Db();
        var candidate = new Candidate { UserId = Guid.NewGuid(), FullName = "Candidate" };
        var cv = new CandidateCv { CandidateId = candidate.Id, ParseStatus = "Parsed" };
        db.Candidates.Add(candidate);
        db.CandidateCvs.Add(cv);
        db.CvParsers.Add(new CvParser { CvId = cv.Id, ParsedDataJson = JsonSerializer.Serialize(new StructuredCvDataDto("Private Name", "private@test.com", "123", "Backend", ["C#"], [], [], [])) });
        await db.SaveChangesAsync();
        var client = new Client();
        Assert.True((await Service(db, client).ChatAsync(candidate.UserId, new("Advice", [], cv.Id))).IsSuccess);
        Assert.Equal("C#", Assert.Single(client.Request!.Context.Cv!.Skills));
        Assert.Null(client.Request.Context.Cv.FullName);
        Assert.Null(client.Request.Context.Cv.Email);
        Assert.Null(client.Request.Context.Cv.Phone);
    }

    [Fact]
    public async Task RejectsMissingCandidateAndInvalidInput()
    {
        using var db = Db();
        var client = new Client();
        Assert.False((await Service(db, client).ChatAsync(Guid.NewGuid(), new("Advice", []))).IsSuccess);
        Assert.False((await Service(db, client).ChatAsync(Guid.NewGuid(), new(" ", []))).IsSuccess);
        Assert.Null(client.Request);
    }

    [Fact]
    public async Task ComputesAndForwardsMatchResultWhenCvAndJobSelected()
    {
        using var db = Db();
        var (candidate, cv, job) = SeedValidCvAndJob(db);
        var client = new Client();
        var matching = new MatchingClient();

        var result = await Service(db, client, matching).ChatAsync(
            candidate.UserId,
            new("Toi phu hop bao nhieu?", [], cv.Id, job.Id));

        Assert.True(result.IsSuccess);
        Assert.Equal(1, matching.CallCount);
        Assert.NotNull(matching.LastRequest);
        Assert.Null(matching.LastRequest!.Cv.FullName);
        Assert.Null(matching.LastRequest.Cv.Email);
        Assert.Null(matching.LastRequest.Cv.Phone);
        Assert.Single(matching.LastRequest.Cv.Education);
        Assert.Single(matching.LastRequest.Cv.Projects);
        Assert.Equal(2.0, matching.LastRequest.Job.MinimumExperienceYears);

        var sentMatch = client.Request!.Context.MatchResult;
        Assert.NotNull(sentMatch);
        Assert.Equal(86, sentMatch!.MatchScore);
        Assert.Equal(["C#", ".NET"], sentMatch.MatchedSkills);
        Assert.Equal(["Docker"], sentMatch.MissingSkills);
        Assert.Equal("3.0 years meets 2.0 years required.", sentMatch.ExperienceComparison);
        Assert.Equal("Bachelor meets requirement.", sentMatch.EducationComparison);
        Assert.Equal("1/1 relevant backend project.", sentMatch.ProjectDomainRelevance);
        Assert.Equal("Strong .NET profile; learn Docker.", sentMatch.MatchExplanation);
    }

    [Fact]
    public async Task DoesNotCallMatchingWhenOnlyCvOrOnlyJobSelected()
    {
        using var db = Db();
        var (candidate, cv, job) = SeedValidCvAndJob(db);
        var client = new Client();
        var matching = new MatchingClient();
        var service = Service(db, client, matching);

        Assert.True((await service.ChatAsync(candidate.UserId, new("Review CV", [], cv.Id, null))).IsSuccess);
        Assert.Null(client.Request!.Context.MatchResult);

        Assert.True((await service.ChatAsync(candidate.UserId, new("Review Job", [], null, job.Id))).IsSuccess);
        Assert.Null(client.Request!.Context.MatchResult);

        Assert.Equal(0, matching.CallCount);
    }

    [Fact]
    public async Task StillAdvisesAndNotifiesWhenMatchingFails()
    {
        using var db = Db();
        var (candidate, cv, job) = SeedValidCvAndJob(db);
        var client = new Client { Reply = "Ban nen bo sung Docker vao CV va du an thuc te." };
        var matching = new MatchingClient
        {
            Handler = (_, _) => Task.FromResult(ServiceResult.InfrastructureError<AiMatchResultDto>("Matching down"))
        };

        var result = await Service(db, client, matching).ChatAsync(
            candidate.UserId,
            new("Danh gia ho so giup toi", [], cv.Id, job.Id));

        Assert.True(result.IsSuccess);
        Assert.Equal(1, matching.CallCount);
        Assert.NotNull(client.Request!.Context.Cv);
        Assert.NotNull(client.Request.Context.Job);
        Assert.Null(client.Request.Context.MatchResult);
        Assert.Contains("không có điểm Matching chính thức", result.Data!.Reply, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("Ban nen bo sung Docker", result.Data.Reply);
    }

    [Fact]
    public async Task RejectsInvalidOutOfBoundsMatchResultAndNotifiesUser()
    {
        using var db = Db();
        var (candidate, cv, job) = SeedValidCvAndJob(db);
        var client = new Client { Reply = "Tu van tu CV va JD." };
        var matching = new MatchingClient
        {
            Handler = (_, _) => Task.FromResult(ServiceResult.Success(new AiMatchResultDto(MatchScore: 150)))
        };

        var result = await Service(db, client, matching).ChatAsync(
            candidate.UserId,
            new("Diem phu hop la bao nhieu?", [], cv.Id, job.Id));

        Assert.True(result.IsSuccess);
        Assert.Null(client.Request!.Context.MatchResult);
        Assert.Contains("không có điểm Matching chính thức", result.Data!.Reply, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task ComputesFreshMatchResultInsteadOfReusingStaleApplicationScore()
    {
        using var db = Db();
        var (candidate, cv, job) = SeedValidCvAndJob(db);
        db.Applications.Add(new JobApplication
        {
            CandidateId = candidate.Id,
            JobId = job.Id,
            CvId = cv.Id,
            MatchScore = 15,
            MatchExplanation = "Stale rule-based score"
        });
        await db.SaveChangesAsync();

        var client = new Client();
        var matching = new MatchingClient();

        var result = await Service(db, client, matching).ChatAsync(
            candidate.UserId,
            new("Diem hien tai?", [], cv.Id, job.Id));

        Assert.True(result.IsSuccess);
        Assert.Equal(1, matching.CallCount);
        Assert.Equal(86, client.Request!.Context.MatchResult!.MatchScore);
        Assert.NotEqual(15, client.Request.Context.MatchResult.MatchScore);
    }

    [Fact]
    public async Task EnforcesOwnershipAndJobAccessBeforeCallingMatching()
    {
        using var db = Db();
        var (candidate, cv, job) = SeedValidCvAndJob(db);
        cv.CandidateId = Guid.NewGuid();
        await db.SaveChangesAsync();

        var client = new Client();
        var matching = new MatchingClient();
        var service = Service(db, client, matching);

        var foreignCvResult = await service.ChatAsync(candidate.UserId, new("Check", [], cv.Id, job.Id));
        Assert.False(foreignCvResult.IsSuccess);
        Assert.Equal(0, matching.CallCount);
        Assert.Null(client.Request);

        cv.CandidateId = candidate.Id;
        job.IsBanned = true;
        await db.SaveChangesAsync();

        var bannedJobResult = await service.ChatAsync(candidate.UserId, new("Check", [], cv.Id, job.Id));
        Assert.False(bannedJobResult.IsSuccess);
        Assert.Equal(0, matching.CallCount);
        Assert.Null(client.Request);
    }

    private static (Candidate Candidate, CandidateCv Cv, Job Job) SeedValidCvAndJob(ApplicationDbContext db)
    {
        var skillCSharp = new Skill { Id = Guid.NewGuid(), Name = "C#" };
        var skillDotNet = new Skill { Id = Guid.NewGuid(), Name = ".NET" };
        var skillDocker = new Skill { Id = Guid.NewGuid(), Name = "Docker" };
        db.Skills.AddRange(skillCSharp, skillDotNet, skillDocker);

        var candidate = new Candidate { UserId = Guid.NewGuid(), FullName = "Candidate" };
        var cv = new CandidateCv { CandidateId = candidate.Id, ParseStatus = "Parsed" };
        db.Candidates.Add(candidate);
        db.CandidateCvs.Add(cv);
        db.CvParsers.Add(new CvParser
        {
            CvId = cv.Id,
            ParsedDataJson = JsonSerializer.Serialize(new StructuredCvDataDto(
                FullName: "Private Name",
                Email: "private@test.com",
                Phone: "0901234567",
                Summary: "Backend Developer",
                Skills: ["C#", ".NET"],
                Experiences: [new CvExperienceDto("Tech Co", "Backend", new DateOnly(2022, 1, 1), new DateOnly(2025, 1, 1), false, "API")],
                Educations: [new CvEducationDto("University", "Bachelor", "CS", 2018, 2022, null)],
                Projects: [new CvProjectDto("Order API", "Lead", null, null, false, "Microservices", "C#, .NET")]))
        });

        var job = new Job
        {
            Title = "Backend .NET Developer",
            Description = "Build scalable .NET APIs",
            ExperienceYearsMin = 2,
            ApprovalStatus = JobApprovalStatus.Approved,
            IsActive = true,
            Deadline = DateTime.UtcNow.AddDays(7),
            JobSkills =
            [
                new JobSkill { SkillId = skillCSharp.Id, Skill = skillCSharp, IsRequired = true },
                new JobSkill { SkillId = skillDotNet.Id, Skill = skillDotNet, IsRequired = true },
                new JobSkill { SkillId = skillDocker.Id, Skill = skillDocker, IsRequired = true }
            ]
        };
        db.Jobs.Add(job);
        db.SaveChanges();
        return (candidate, cv, job);
    }

    [Fact]
    public async Task SendsEnrichedCvContextAndCvEvaluationWithoutPii()
    {
        using var db = Db();
        var (candidate, cv, _) = SeedValidCvAndJob(db);
        var otherCvId = Guid.NewGuid();

        db.CvParsers.First(p => p.CvId == cv.Id).ParsedDataJson = JsonSerializer.Serialize(new StructuredCvDataDto(
            FullName: "Secret Full Name",
            Email: "secret@example.com",
            Phone: "0999111222",
            Summary: "Backend specialist",
            Skills: ["C#", ".NET"],
            Experiences: [new CvExperienceDto("Tech Co", "Senior Backend Engineer", new DateOnly(2022, 1, 1), new DateOnly(2025, 1, 1), false, "Designed microservices")],
            Educations: [new CvEducationDto("HUST", "Bachelor", "Computer Science", 2018, 2022, null)],
            Projects: [new CvProjectDto("Order API", "Lead", null, null, false, "High throughput API", "C#, Redis")],
            Certificates: ["Azure Developer Associate"]));

        db.Certificates.AddRange(
            new Certificate { CandidateId = candidate.Id, CvId = cv.Id, Name = "AWS SAA", Organization = "Amazon" },
            new Certificate { CandidateId = candidate.Id, CvId = null, Name = "CKAD" },
            new Certificate { CandidateId = candidate.Id, CvId = otherCvId, Name = "Other CV Cert" },
            new Certificate { CandidateId = candidate.Id, CvId = cv.Id, Name = "Deleted Cert", IsDeleted = true });

        db.CvEvaluations.Add(new CvEvaluation
        {
            CvId = cv.Id,
            CvScore = 89,
            StrengthsJson = JsonSerializer.Serialize(new[] { "Clear backend architecture" }),
            WeaknessesJson = JsonSerializer.Serialize(new[] { "Missing quantified metrics" }),
            ImprovementsJson = JsonSerializer.Serialize(new[] { "Add latency KPIs" })
        });
        await db.SaveChangesAsync();

        var client = new Client();
        var result = await Service(db, client).ChatAsync(candidate.UserId, new("Tu van cai thien CV", [], cv.Id));

        Assert.True(result.IsSuccess);
        var sentCv = client.Request!.Context.Cv!;
        Assert.Null(sentCv.FullName);
        Assert.Null(sentCv.Email);
        Assert.Null(sentCv.Phone);
        Assert.Equal("Backend specialist", sentCv.CareerSummary);
        Assert.Equal(["C#", ".NET"], sentCv.Skills);
        Assert.Equal("Senior Backend Engineer", Assert.Single(sentCv.WorkExperience).JobTitle);
        Assert.Equal("Tech Co", sentCv.WorkExperience[0].Company);
        Assert.Equal("Designed microservices", sentCv.WorkExperience[0].Description);
        Assert.Equal("HUST", Assert.Single(sentCv.Education).Institution);
        Assert.Equal("Order API", Assert.Single(sentCv.Projects).Name);
        Assert.Contains("Redis", sentCv.Technologies);
        Assert.Equal(["Azure Developer Associate", "AWS SAA (Amazon)", "CKAD"], sentCv.Certificates);

        var sentEval = client.Request.Context.CvEvaluation!;
        Assert.NotNull(sentEval);
        Assert.Equal(89, sentEval.CvScore);
        Assert.Equal(["Clear backend architecture"], sentEval.Strengths);
        Assert.Equal(["Missing quantified metrics"], sentEval.Weaknesses);
        Assert.Equal(["Add latency KPIs"], sentEval.ImprovementSuggestions);
    }

    [Fact]
    public async Task HandlesMissingEvaluationAndBoundsOversizedContextFields()
    {
        using var db = Db();
        var (candidate, cv, _) = SeedValidCvAndJob(db);
        db.CvParsers.First(p => p.CvId == cv.Id).ParsedDataJson = JsonSerializer.Serialize(new StructuredCvDataDto(
            FullName: "Name",
            Email: null,
            Phone: null,
            Summary: null,
            Skills: ["C#"],
            Experiences: [new CvExperienceDto("Co", "Developer", new DateOnly(2023, 1, 1), null, true, new string('d', 1500))],
            Educations: [],
            Projects: [new CvProjectDto("Proj", null, null, null, false, new string('p', 1200), "C#")]));
        await db.SaveChangesAsync();

        var client = new Client();
        var result = await Service(db, client).ChatAsync(candidate.UserId, new("Review CV", [], cv.Id));

        Assert.True(result.IsSuccess);
        var sentCv = client.Request!.Context.Cv!;
        Assert.Null(sentCv.CareerSummary);
        Assert.Empty(sentCv.Education);
        Assert.Empty(sentCv.Certificates);
        Assert.Equal(500, sentCv.WorkExperience[0].Description.Length);
        Assert.Equal(500, sentCv.Projects[0].Description.Length);
        Assert.Null(client.Request.Context.CvEvaluation);
    }

    [Fact]
    public async Task ConversationsCrudPaginationContinueAndOwnershipAreEnforced()
    {
        using var db = Db();
        var (candidate, cv, job) = SeedValidCvAndJob(db);
        var otherCandidate = new Candidate { UserId = Guid.NewGuid(), FullName = "Other Candidate" };
        db.Candidates.Add(otherCandidate);
        await db.SaveChangesAsync();

        var client = new Client();
        var service = Service(db, client);

        // 1. Create conversation
        var created = await service.CreateConversationAsync(candidate.UserId, new("Phỏng vấn .NET", cv.Id, job.Id));
        Assert.True(created.IsSuccess);
        var convId = created.Data!.Id;
        Assert.Equal("Phỏng vấn .NET", created.Data.Title);

        // 2. Continue conversation via ChatAsync -> persists user & assistant messages
        client.Reply = "Hãy ôn tập async/await và PostgreSQL.";
        var chat1 = await service.ChatAsync(candidate.UserId, new("Tôi cần ôn gì?", [], ConversationId: convId));
        Assert.True(chat1.IsSuccess);
        Assert.Equal(convId, chat1.Data!.ConversationId);

        // 3. View detail and message history
        var detail = await service.GetConversationDetailAsync(candidate.UserId, convId);
        Assert.True(detail.IsSuccess);
        Assert.Equal(2, detail.Data!.Messages.Count);
        Assert.Equal("user", detail.Data.Messages[0].Role);
        Assert.Equal("Tôi cần ôn gì?", detail.Data.Messages[0].Content);
        Assert.Equal("assistant", detail.Data.Messages[1].Role);
        Assert.Equal("Hãy ôn tập async/await và PostgreSQL.", detail.Data.Messages[1].Content);

        // 4. Rename conversation
        var renamed = await service.RenameConversationAsync(candidate.UserId, convId, new("Ôn phỏng vấn Backend"));
        Assert.True(renamed.IsSuccess);
        Assert.Equal("Ôn phỏng vấn Backend", renamed.Data!.Title);

        // 5. Ownership checks: other candidate gets Forbidden on get/rename/delete/chat
        Assert.Equal(ServiceErrorType.Forbidden, (await service.GetConversationDetailAsync(otherCandidate.UserId, convId)).ErrorType);
        Assert.Equal(ServiceErrorType.Forbidden, (await service.RenameConversationAsync(otherCandidate.UserId, convId, new("Hijack"))).ErrorType);
        Assert.Equal(ServiceErrorType.Forbidden, (await service.DeleteConversationAsync(otherCandidate.UserId, convId)).ErrorType);
        Assert.Equal(ServiceErrorType.Forbidden, (await service.ChatAsync(otherCandidate.UserId, new("Inject", [], ConversationId: convId))).ErrorType);

        // 6. Paginated list
        await service.CreateConversationAsync(candidate.UserId, new("Cuộc 2"));
        await service.CreateConversationAsync(candidate.UserId, new("Cuộc 3"));
        var page1 = await service.GetConversationsAsync(candidate.UserId, new(PageIndex: 1, PageSize: 2));
        Assert.True(page1.IsSuccess);
        Assert.Equal(3, page1.Data!.TotalCount);
        Assert.Equal(2, page1.Data.Items.Count);
        Assert.True(page1.Data.HasNextPage);

        // 7. Delete conversation -> soft-deleted and inaccessible afterwards
        Assert.True((await service.DeleteConversationAsync(candidate.UserId, convId)).IsSuccess);
        Assert.Equal(ServiceErrorType.NotFound, (await service.GetConversationDetailAsync(candidate.UserId, convId)).ErrorType);
        Assert.Equal(ServiceErrorType.NotFound, (await service.ChatAsync(candidate.UserId, new("Continue?", [], ConversationId: convId))).ErrorType);
        Assert.Equal(2, (await service.GetConversationsAsync(candidate.UserId, new(1, 10))).Data!.TotalCount);
    }

    [Fact]
    public async Task UsesServerHistoryWithBoundedWindowAndIgnoresUntrustedClientHistory()
    {
        using var db = Db();
        var (candidate, _, _) = SeedValidCvAndJob(db);
        var client = new Client();
        var service = Service(db, client);

        var conv = (await service.CreateConversationAsync(candidate.UserId, new("Bounded History"))).Data!;
        var baseTime = DateTime.UtcNow.AddMinutes(-30);
        for (var i = 0; i < 24; i++)
        {
            var role = i % 2 == 0 ? "user" : "assistant";
            var content = role == "assistant" && i == 23 ? new string('x', 5000) : $"msg-{i}";
            db.CareerMessages.Add(FutureCV.Domain.Entities.CareerMessage.Create(conv.Id, role, content, baseTime.AddSeconds(i)));
        }
        await db.SaveChangesAsync();

        var result = await service.ChatAsync(
            candidate.UserId,
            new(
                "Câu hỏi mới",
                [new("user", "FAKE_TAMPERED_HISTORY")],
                ConversationId: conv.Id));

        Assert.True(result.IsSuccess);
        Assert.Equal(20, client.Request!.History.Count);
        Assert.Equal("msg-4", client.Request.History[0].Content);
        Assert.DoesNotContain(client.Request.History, m => m.Content == "FAKE_TAMPERED_HISTORY");
        Assert.Equal(4000, client.Request.History[^1].Content.Length);
    }

    [Fact]
    public async Task DoesNotPersistMessagesWhenAiCallFails()
    {
        using var db = Db();
        var (candidate, cv, job) = SeedValidCvAndJob(db);
        var client = new Client
        {
            Handler = (_, _) => Task.FromResult(ServiceResult.InfrastructureError<CareerChatResponse>("AI service down"))
        };
        var service = Service(db, client);

        var failedNew = await service.ChatAsync(candidate.UserId, new("Câu hỏi lỗi", [], cv.Id, job.Id));
        Assert.False(failedNew.IsSuccess);
        Assert.Empty(db.CareerConversations.ToList());
        Assert.Empty(db.CareerMessages.ToList());

        var existing = (await service.CreateConversationAsync(candidate.UserId, new("Existing", cv.Id, job.Id))).Data!;
        var failedExisting = await service.ChatAsync(candidate.UserId, new("Câu hỏi tiếp theo lỗi", [], ConversationId: existing.Id));
        Assert.False(failedExisting.IsSuccess);
        Assert.Empty(db.CareerMessages.Where(m => m.ConversationId == existing.Id).ToList());
    }

    [Fact]
    public async Task ImportConversationsValidatesCvAndJobOwnership()
    {
        using var db = Db();
        var (candidate, cv, job) = SeedValidCvAndJob(db);
        var foreignCv = new CandidateCv { CandidateId = Guid.NewGuid(), ParseStatus = "Parsed" };
        db.CandidateCvs.Add(foreignCv);
        await db.SaveChangesAsync();

        var service = Service(db, new Client());
        var result = await service.ImportConversationsAsync(
            candidate.UserId,
            new ImportCareerConversationsRequest([
                new ImportCareerConversationItemRequest("Imported Valid", cv.Id, job.Id, DateTime.UtcNow, [new("user", "Hi"), new("assistant", "Hello")]),
                new ImportCareerConversationItemRequest("Imported Foreign CV", foreignCv.Id, job.Id, DateTime.UtcNow, [new("user", "Hi")])
            ]));

        Assert.True(result.IsSuccess);
        Assert.Equal(2, result.Data!.Count);
        Assert.Equal(cv.Id, result.Data[0].CvId);
        Assert.Null(result.Data[1].CvId);
    }
}
