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
        public Task<ServiceResult<CareerChatResponse>> ChatAsync(Guid userId, CareerChatRequest request, CancellationToken cancellationToken = default)
        {
            UserId = userId;
            return Task.FromResult(ServiceResult.Success(new CareerChatResponse("Advice", [])));
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
    }
}
