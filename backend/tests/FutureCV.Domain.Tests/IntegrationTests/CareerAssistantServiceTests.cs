using System.Text.Json;
using FutureCV.Application.Common.Models;
using FutureCV.Application.Features.Candidate.DTOs;
using FutureCV.Application.Features.CareerAssistant.DTOs;
using FutureCV.Application.Features.CareerAssistant.Interfaces;
using FutureCV.Application.Features.CareerAssistant.Services;
using FutureCV.Application.Features.CareerAssistant.Validators;
using FutureCV.Domain.Entities;
using FutureCV.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace FutureCV.Domain.Tests.IntegrationTests;

public class CareerAssistantServiceTests
{
    private sealed class Client : ICareerAssistantClient
    {
        public CareerAiRequest? Request { get; private set; }
        public Task<ServiceResult<CareerChatResponse>> ChatAsync(CareerAiRequest request, CancellationToken cancellationToken = default)
        {
            Request = request;
            return Task.FromResult(ServiceResult.Success(new CareerChatResponse("Advice", [])));
        }
    }

    private static ApplicationDbContext Db() => new(new DbContextOptionsBuilder<ApplicationDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
    private static CareerAssistantService Service(ApplicationDbContext db, Client client) => new(db, client, new CareerChatRequestValidator());

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
}
