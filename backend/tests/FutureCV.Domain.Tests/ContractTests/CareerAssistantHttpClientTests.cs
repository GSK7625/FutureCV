using System.Net;
using System.Text.Json;
using FutureCV.Application.Features.CareerAssistant.DTOs;
using FutureCV.Infrastructure.Configurations;
using FutureCV.Infrastructure.Services;
using Microsoft.Extensions.Options;
using Xunit;

namespace FutureCV.Domain.Tests.ContractTests;

public class CareerAssistantHttpClientTests
{
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
}
