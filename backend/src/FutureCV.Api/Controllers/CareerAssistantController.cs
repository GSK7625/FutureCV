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
}
