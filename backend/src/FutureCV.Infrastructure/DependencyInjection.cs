using FutureCV.Application.Common.Interfaces;
using FutureCV.Infrastructure.Identity;
using FutureCV.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace FutureCV.Infrastructure;

/// <summary>
/// Extension method to register all Infrastructure services.
/// Called from the Api composition root (Program.cs).
/// </summary>
public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("Connection string 'DefaultConnection' not found.");

        services.AddDbContext<ApplicationDbContext>(options =>
            options.UseNpgsql(connectionString));

        // Register DbContext as IApplicationDbContext for Application layer
        services.AddScoped<IApplicationDbContext>(
            provider => provider.GetRequiredService<ApplicationDbContext>());

        // ASP.NET Core Identity — password rules, lockout, roles, EF stores, token providers
        services.AddIdentityCore<AppUser>(options =>
            {
                options.Password.RequireDigit           = true;
                options.Password.RequiredLength         = 6;
                options.Password.RequireUppercase       = true;
                options.Password.RequireLowercase       = true;
                options.Password.RequireNonAlphanumeric = false;

                options.Lockout.MaxFailedAccessAttempts = 5;
                options.Lockout.DefaultLockoutTimeSpan  = TimeSpan.FromMinutes(30);
                options.Lockout.AllowedForNewUsers      = true;
            })
            .AddRoles<IdentityRole<Guid>>()
            .AddEntityFrameworkStores<ApplicationDbContext>()
            .AddDefaultTokenProviders();


        // Register JWT Token Service
        services.AddScoped<IJwtTokenService, JwtTokenService>();

        // Register SmtpSettings & Email Service
        services.Configure<SmtpSettings>(configuration.GetSection("SmtpSettings"));
        services.AddTransient<IEmailService, FutureCV.Infrastructure.Services.EmailService>();

        // Register Auth Service
        services.AddScoped<IAuthService, AuthService>();

        return services;
    }
}

