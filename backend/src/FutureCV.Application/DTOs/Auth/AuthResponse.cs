namespace FutureCV.Application.DTOs.Auth;

public record AuthResponse(
    string AccessToken,
    DateTimeOffset AccessTokenExpiresAt,
    string RefreshToken,
    string Role
);
