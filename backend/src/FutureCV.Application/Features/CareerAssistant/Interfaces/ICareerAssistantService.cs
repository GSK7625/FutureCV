using FutureCV.Application.Common.Models;
using FutureCV.Application.Features.CareerAssistant.DTOs;

namespace FutureCV.Application.Features.CareerAssistant.Interfaces;

public interface ICareerAssistantService
{
    Task<ServiceResult<CareerChatResponse>> ChatAsync(Guid userId, CareerChatRequest request, CancellationToken cancellationToken = default);
    Task<ServiceResult<CareerConversationSummaryDto>> CreateConversationAsync(Guid userId, CreateCareerConversationRequest request, CancellationToken cancellationToken = default);
    Task<ServiceResult<PagedResult<CareerConversationSummaryDto>>> GetConversationsAsync(Guid userId, CareerConversationFilterRequest filter, CancellationToken cancellationToken = default);
    Task<ServiceResult<CareerConversationDetailDto>> GetConversationDetailAsync(Guid userId, Guid conversationId, CancellationToken cancellationToken = default);
    Task<ServiceResult<CareerConversationSummaryDto>> RenameConversationAsync(Guid userId, Guid conversationId, RenameCareerConversationRequest request, CancellationToken cancellationToken = default);
    Task<ServiceResult<bool>> DeleteConversationAsync(Guid userId, Guid conversationId, CancellationToken cancellationToken = default);
    Task<ServiceResult<IReadOnlyList<CareerConversationSummaryDto>>> ImportConversationsAsync(Guid userId, ImportCareerConversationsRequest request, CancellationToken cancellationToken = default);
}
