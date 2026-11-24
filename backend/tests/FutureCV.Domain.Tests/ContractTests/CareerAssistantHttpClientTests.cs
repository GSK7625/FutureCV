using System.Net;
using System.Text.Json;
using FutureCV.Application.Features.AiMatching.DTOs;
using FutureCV.Application.Features.CareerAssistant.DTOs;
using FutureCV.Infrastructure.Configurations;
using FutureCV.Infrastructure.Services;
using Microsoft.Extensions.Options;
using Xunit;

namespace FutureCV.Domain.Tests.ContractTests;

public class CareerAssistantHttpClientTests
{
    [Theory]
    [InlineData("not-json")]
    [InlineData("null")]
    [InlineData("{}")]
    [InlineData("{\"reply\":\" \"}")]
    public async Task RejectsMalformedResponses(string body)
    {
        var result = await Client((_, _) => Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(body) }))
            .ChatAsync(new("Hi", [], new(null, null)));
        Assert.False(result.IsSuccess);
    }

    [Fact]
    public async Task HandlesNetworkFailureAndTimeout()
    {
        foreach (var exception in new Exception[] { new HttpRequestException("secret upstream"), new TaskCanceledException() })
        {
            var result = await Client((_, _) => throw exception).ChatAsync(new("Hi", [], new(null, null)));
            Assert.False(result.IsSuccess);
            Assert.DoesNotContain("secret", result.ErrorMessage);
        }
    }

    [Fact]
    public async Task PropagatesCallerCancellation()
    {
        using var cts = new CancellationTokenSource();
        cts.Cancel();
        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => Client((_, _) => throw new OperationCanceledException(cts.Token))
            .ChatAsync(new("Hi", [], new(null, null)), cts.Token));
    }

    [Theory]
    [InlineData(HttpStatusCode.Unauthorized)]
    [InlineData(HttpStatusCode.TooManyRequests)]
    [InlineData(HttpStatusCode.InternalServerError)]
    public async Task DoesNotExposeUpstreamErrors(HttpStatusCode status)
    {
        var result = await Client((_, _) => Task.FromResult(new HttpResponseMessage(status) { Content = new StringContent("private details") }))
            .ChatAsync(new("Hi", [], new(null, null)));
        Assert.False(result.IsSuccess);
        Assert.DoesNotContain("private", result.ErrorMessage);
    }

    private sealed class Handler(Func<HttpRequestMessage, CancellationToken, Task<HttpResponseMessage>> send) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken) => send(request, cancellationToken);
    }

    private static CareerAssistantHttpClient Client(Func<HttpRequestMessage, CancellationToken, Task<HttpResponseMessage>> send)
        => new(new HttpClient(new Handler(send)) { BaseAddress = new Uri("http://ai/") }, Options.Create(new AiServiceOptions { ApiKey = "test-key" }));

    [Fact]
    public async Task SendsAuthenticatedRequestAndReadsPythonResponse()
    {
        var client = Client(async (request, ct) =>
        {
            Assert.Equal("http://ai/api/v1/career/chat", request.RequestUri!.ToString());
            Assert.Equal("test-key", request.Headers.GetValues("X-Internal-API-Key").Single());
            Assert.True(request.Headers.Contains("X-Correlation-ID"));
            using var body = JsonDocument.Parse(await request.Content!.ReadAsStringAsync(ct));
            Assert.Equal("Advice", body.RootElement.GetProperty("message").GetString());
            return new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent("""{"reply":"Learn testing","suggested_followups":["How?"]}""") };
        });
        var result = await client.ChatAsync(new("Advice", [], new(null, null)));
        Assert.True(result.IsSuccess);
        Assert.Equal("Learn testing", result.Data!.Reply);
        Assert.Equal("How?", Assert.Single(result.Data.SuggestedFollowups));
    }

    [Fact]
    public async Task SendsMatchResultFieldsInSnakeCasePayload()
    {
        var matchResult = new AiMatchResultDto(
            MatchScore: 78,
            MatchedSkills: ["C#"],
            MissingSkills: ["Kubernetes"],
            ExperienceComparison: "Meets 2 years",
            EducationComparison: "Bachelor",
            ProjectDomainRelevance: "Relevant API projects",
            MatchExplanation: "Good match");

        var client = Client(async (request, ct) =>
        {
            using var body = JsonDocument.Parse(await request.Content!.ReadAsStringAsync(ct));
            var mr = body.RootElement.GetProperty("context").GetProperty("match_result");
            Assert.Equal(78, mr.GetProperty("match_score").GetInt32());
            Assert.Equal("C#", Assert.Single(mr.GetProperty("matched_skills").EnumerateArray()).GetString());
            Assert.Equal("Kubernetes", Assert.Single(mr.GetProperty("missing_skills").EnumerateArray()).GetString());
            Assert.Equal("Meets 2 years", mr.GetProperty("experience_comparison").GetString());
            Assert.Equal("Bachelor", mr.GetProperty("education_comparison").GetString());
            Assert.Equal("Relevant API projects", mr.GetProperty("project_domain_relevance").GetString());
            Assert.Equal("Good match", mr.GetProperty("match_explanation").GetString());
            return new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent("""{"reply":"Focus on Kubernetes","suggested_followups":[]}""") };
        });

        var result = await client.ChatAsync(new("Advice", [], new(null, null, matchResult)));
        Assert.True(result.IsSuccess);
        Assert.Equal("Focus on Kubernetes", result.Data!.Reply);
    }
}
