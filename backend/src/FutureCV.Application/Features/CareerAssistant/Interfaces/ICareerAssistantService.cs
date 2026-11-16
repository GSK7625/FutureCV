using FutureCV.Application.Common.Models;
using FutureCV.Application.Features.CareerAssistant.DTOs;

namespace FutureCV.Application.Features.CareerAssistant.Interfaces;

public interface ICareerAssistantService
{
    Task<ServiceResult<CareerChatResponse>> ChatAsync(Guid userId, CareerChatRequest request, CancellationToken cancellationToken = default);
}
