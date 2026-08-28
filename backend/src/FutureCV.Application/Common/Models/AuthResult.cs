namespace FutureCV.Application.Common.Models;

/// <summary>
/// Static factory methods for creating AuthResult instances (resolves CA1000 warning).
/// </summary>
public static class AuthResult
{
    public static AuthResult<T> Success<T>(T data, int statusCode = 200) =>
        new() { IsSuccess = true, Data = data, StatusCode = statusCode };

    public static AuthResult<T> Failure<T>(string errorMessage, int statusCode = 400) =>
        new() { IsSuccess = false, ErrorMessage = errorMessage, StatusCode = statusCode };
}

/// <summary>
/// Result wrapper for Authentication operations.
/// </summary>
public class AuthResult<T>
{
    public bool IsSuccess { get; init; }
    public string? ErrorMessage { get; init; }
    public int StatusCode { get; init; }
    public T? Data { get; init; }
}

