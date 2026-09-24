using System.Net.Http.Json;
using System.Text.Json;
using FutureCV.Application.Common.Models;
using FutureCV.Application.Features.CareerAssistant.DTOs;
using FutureCV.Application.Features.CareerAssistant.Interfaces;
using FutureCV.Infrastructure.Configurations;
using Microsoft.Extensions.Options;

namespace FutureCV.Infrastructure.Services;

public sealed class CareerAssistantHttpClient(HttpClient httpClient, IOptions<AiServiceOptions> options) : ICareerAssistantClient
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower
    };

    public async Task<ServiceResult<CareerChatResponse>> ChatAsync(CareerAiRequest request, CancellationToken cancellationToken = default)
    {
        try
        {
        using var message = new HttpRequestMessage(HttpMethod.Post, "api/v1/career/chat");
        message.Headers.Add("X-Internal-API-Key", options.Value.ApiKey);
        message.Headers.Add("X-Correlation-ID", Guid.NewGuid().ToString("N"));
        message.Content = JsonContent.Create(request, options: JsonOptions);
        using var response = await httpClient.SendAsync(message, cancellationToken);
        if (!response.IsSuccessStatusCode)
            return ServiceResult.InfrastructureError<CareerChatResponse>("Career Assistant tam thoi khong kha dung. Vui long thu lai.");
        var result = await response.Content.ReadFromJsonAsync<CareerChatResponse>(JsonOptions, cancellationToken);
        return result is null || string.IsNullOrWhiteSpace(result.Reply) || result.Reply.Length > 16000 ||
            result.SuggestedFollowups is null || result.SuggestedFollowups.Count > 6 ||
            result.SuggestedFollowups.Any(x => string.IsNullOrWhiteSpace(x) || x.Length > 4000)
            ? ServiceResult.InfrastructureError<CareerChatResponse>("Career Assistant khong tra ve noi dung.")
            : ServiceResult.Success(result);
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            return ServiceResult.InfrastructureError<CareerChatResponse>("Career Assistant het thoi gian cho. Vui long thu lai.");
        }
        catch (HttpRequestException)
        {
            return ServiceResult.InfrastructureError<CareerChatResponse>("Khong ket noi duoc Career Assistant. Vui long thu lai.");
        }
        catch (JsonException)
        {
            return ServiceResult.InfrastructureError<CareerChatResponse>("Phan hoi Career Assistant khong hop le.");
        }
    }
}
