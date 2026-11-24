using FutureCV.Application.Features.CareerAssistant.DTOs;
using FutureCV.Application.Features.CareerAssistant.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FutureCV.Api.Controllers;

[Authorize(Roles = "Candidate")]
[Route("api/candidate/career-assistant")]
public sealed class CareerAssistantController(ICareerAssistantService service) : ApiControllerBase
{
    [HttpPost("chat")]
    [RequestSizeLimit(400_000)]
    public async Task<IActionResult> Chat([FromBody] CareerChatRequest request, CancellationToken cancellationToken)
        => ToHttpResult(await service.ChatAsync(GetCurrentUserId(), request, cancellationToken));

    [HttpGet("conversations")]
    public async Task<IActionResult> GetConversations(
        [FromQuery] CareerConversationFilterRequest filter,
        CancellationToken cancellationToken)
        => ToHttpResult(await service.GetConversationsAsync(GetCurrentUserId(), filter, cancellationToken));

    [HttpPost("conversations")]
    public async Task<IActionResult> CreateConversation(
        [FromBody] CreateCareerConversationRequest request,
        CancellationToken cancellationToken)
        => ToHttpResult(await service.CreateConversationAsync(GetCurrentUserId(), request, cancellationToken), created: true);

    [HttpGet("conversations/{conversationId:guid}")]
    public async Task<IActionResult> GetConversationDetail(Guid conversationId, CancellationToken cancellationToken)
        => ToHttpResult(await service.GetConversationDetailAsync(GetCurrentUserId(), conversationId, cancellationToken));

    [HttpPatch("conversations/{conversationId:guid}")]
    public async Task<IActionResult> RenameConversation(
        Guid conversationId,
        [FromBody] RenameCareerConversationRequest request,
        CancellationToken cancellationToken)
        => ToHttpResult(await service.RenameConversationAsync(GetCurrentUserId(), conversationId, request, cancellationToken));

    [HttpDelete("conversations/{conversationId:guid}")]
    public async Task<IActionResult> DeleteConversation(Guid conversationId, CancellationToken cancellationToken)
        => ToHttpResult(await service.DeleteConversationAsync(GetCurrentUserId(), conversationId, cancellationToken));

    [HttpPost("conversations/import")]
    [RequestSizeLimit(1_200_000)]
    public async Task<IActionResult> ImportConversations(
        [FromBody] ImportCareerConversationsRequest request,
        CancellationToken cancellationToken)
        => ToHttpResult(await service.ImportConversationsAsync(GetCurrentUserId(), request, cancellationToken), created: true);
}
