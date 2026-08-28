using FluentValidation;
using Microsoft.Extensions.DependencyInjection;

namespace FutureCV.Application;

/// <summary>
/// Extension method to register all Application-layer services.
/// Automatically registers all FluentValidation validators in this assembly.
/// </summary>
public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddValidatorsFromAssembly(typeof(DependencyInjection).Assembly);

        return services;
    }
}
