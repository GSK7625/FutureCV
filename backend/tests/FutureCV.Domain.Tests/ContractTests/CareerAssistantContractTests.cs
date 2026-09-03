using System.Text.Json;
using FutureCV.Application.Features.CareerAssistant.DTOs;
using Xunit;

namespace FutureCV.Domain.Tests.ContractTests;

public class CareerAssistantContractTests
{
    [Fact]
    public void AiRequestUsesPythonFieldNames()
    {
        var request = new CareerAiRequest("Advice", [new("user", "Hello")], new(null, null));
        var json = JsonSerializer.Serialize(request, new JsonSerializerOptions(JsonSerializerDefaults.Web));
        using var doc = JsonDocument.Parse(json);
        Assert.Equal("Advice", doc.RootElement.GetProperty("message").GetString());
        Assert.Equal("user", doc.RootElement.GetProperty("history")[0].GetProperty("role").GetString());
        Assert.True(doc.RootElement.GetProperty("context").TryGetProperty("cv", out _));
    }
}
