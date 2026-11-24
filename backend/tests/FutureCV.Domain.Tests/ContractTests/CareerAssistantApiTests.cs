using System.Security.Claims;
using FutureCV.Api.Controllers;
using FutureCV.Application.Common.Models;
using FutureCV.Application.Features.CareerAssistant.DTOs;
using FutureCV.Application.Features.CareerAssistant.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Xunit;

namespace FutureCV.Domain.Tests.ContractTests;

public class CareerAssistantApiTests
{
    private sealed class Service : ICareerAssistantService
    {
        public Guid UserId { get; private set; }
        public Guid? LastConversationId { get; private set; }

        public Task<ServiceResult<CareerChatResponse>> ChatAsync(Guid userId, CareerChatRequest request, CancellationToken cancellationToken = default)
        {
            UserId = userId;
            LastConversationId = request.ConversationId;
            return Task.FromResult(ServiceResult.Success(new CareerChatResponse("Advice", [], Guid.NewGuid())));
        }

        public Task<ServiceResult<CareerConversationSummaryDto>> CreateConversationAsync(Guid userId, CreateCareerConversationRequest request, CancellationToken cancellationToken = default)
        {
            UserId = userId;
            return Task.FromResult(ServiceResult.Success(new CareerConversationSummaryDto(Guid.NewGuid(), request.Title ?? "Cuộc trò chuyện mới", request.CvId, null, request.JobId, null, 0, DateTime.UtcNow, DateTime.UtcNow)));
        }

        public Task<ServiceResult<PagedResult<CareerConversationSummaryDto>>> GetConversationsAsync(Guid userId, CareerConversationFilterRequest filter, CancellationToken cancellationToken = default)
        {
            UserId = userId;
            return Task.FromResult(ServiceResult.Success(new PagedResult<CareerConversationSummaryDto>([], 0, filter.PageIndex, filter.PageSize)));
        }

        public Task<ServiceResult<CareerConversationDetailDto>> GetConversationDetailAsync(Guid userId, Guid conversationId, CancellationToken cancellationToken = default)
        {
            UserId = userId;
            LastConversationId = conversationId;
            return Task.FromResult(ServiceResult.Success(new CareerConversationDetailDto(conversationId, "Title", null, null, null, null, DateTime.UtcNow, DateTime.UtcNow, [])));
        }

        public Task<ServiceResult<CareerConversationSummaryDto>> RenameConversationAsync(Guid userId, Guid conversationId, RenameCareerConversationRequest request, CancellationToken cancellationToken = default)
        {
            UserId = userId;
            LastConversationId = conversationId;
            return Task.FromResult(ServiceResult.Success(new CareerConversationSummaryDto(conversationId, request.Title, null, null, null, null, 0, DateTime.UtcNow, DateTime.UtcNow)));
        }

        public Task<ServiceResult<bool>> DeleteConversationAsync(Guid userId, Guid conversationId, CancellationToken cancellationToken = default)
        {
            UserId = userId;
            LastConversationId = conversationId;
            return Task.FromResult(ServiceResult.Success(true));
        }

        public Task<ServiceResult<IReadOnlyList<CareerConversationSummaryDto>>> ImportConversationsAsync(Guid userId, ImportCareerConversationsRequest request, CancellationToken cancellationToken = default)
        {
            UserId = userId;
            return Task.FromResult(ServiceResult.Success<IReadOnlyList<CareerConversationSummaryDto>>([]));
        }
    }

    [Fact]
    public async Task UsesAuthenticatedUserAndRequiresCandidateRole()
    {
        var authorization = Assert.Single(typeof(CareerAssistantController).GetCustomAttributes(typeof(AuthorizeAttribute), true).Cast<AuthorizeAttribute>());
        Assert.Equal("Candidate", authorization.Roles);
        var userId = Guid.NewGuid();
        var service = new Service();
        var controller = new CareerAssistantController(service)
        {
            ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, userId.ToString())], "test")) } }
        };
        Assert.IsType<OkObjectResult>(await controller.Chat(new("Advice", []), default));
        Assert.Equal(userId, service.UserId);

        var created = Assert.IsType<ObjectResult>(await controller.CreateConversation(new("New chat"), default));
        Assert.Equal(201, created.StatusCode);

        var convId = Guid.NewGuid();
        Assert.IsType<OkObjectResult>(await controller.GetConversations(new(), default));
        Assert.IsType<OkObjectResult>(await controller.GetConversationDetail(convId, default));
        Assert.Equal(convId, service.LastConversationId);
        Assert.IsType<OkObjectResult>(await controller.RenameConversation(convId, new("Renamed"), default));
        Assert.IsType<OkObjectResult>(await controller.DeleteConversation(convId, default));
        var imported = Assert.IsType<ObjectResult>(await controller.ImportConversations(new([]), default));
        Assert.Equal(201, imported.StatusCode);
    }
}
