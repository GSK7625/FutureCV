using FutureCV.Application.Common.Models;
using FutureCV.Application.Features.CareerAssistant.DTOs;

namespace FutureCV.Application.Features.CareerAssistant.Interfaces;

public interface ICareerAssistantClient
{
    Task<ServiceResult<CareerChatResponse>> ChatAsync(CareerAiRequest request, CancellationToken cancellationToken = default);
}
