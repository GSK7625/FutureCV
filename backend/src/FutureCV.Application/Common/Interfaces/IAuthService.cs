using FutureCV.Application.Common.Models;
using FutureCV.Application.DTOs.Auth;

namespace FutureCV.Application.Common.Interfaces;

/// <summary>
/// Service interface defining authentication and authorization operations.
/// </summary>
public interface IAuthService
{
    Task<AuthResult<AuthResponse>> RegisterCandidateAsync(RegisterCandidateRequest request, CancellationToken cancellationToken = default);
    Task<AuthResult<AuthResponse>> RegisterEmployerAsync(RegisterEmployerRequest request, CancellationToken cancellationToken = default);
    Task<AuthResult<AuthResponse>> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default);
    Task<AuthResult<AuthResponse>> RefreshTokenAsync(RefreshTokenRequest request, CancellationToken cancellationToken = default);
    Task<AuthResult<MessageResponse>> LogoutAsync(Guid userId, string refreshToken, CancellationToken cancellationToken = default);
    Task<AuthResult<MessageResponse>> LogoutAllAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<AuthResult<MessageResponse>> ForgotPasswordAsync(ForgotPasswordRequest request, CancellationToken cancellationToken = default);
    Task<AuthResult<MessageResponse>> ResetPasswordAsync(ResetPasswordRequest request, CancellationToken cancellationToken = default);
    Task<AuthResult<MessageResponse>> DisableUserAsync(Guid userId, CancellationToken cancellationToken = default);
}
