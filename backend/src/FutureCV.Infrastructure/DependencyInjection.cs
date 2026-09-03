using FutureCV.Application.Common.Interfaces;
using FutureCV.Application.Features.Admin.Interfaces;
using FutureCV.Application.Features.Candidate.Interfaces;
using FutureCV.Application.Features.Employer.Interfaces;
using FutureCV.Infrastructure.Configurations;
using FutureCV.Infrastructure.Identity;
using FutureCV.Infrastructure.Persistence;
using FutureCV.Infrastructure.Services;
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
        services.AddTransient<IEmailService, EmailService>();

        // Register Auth Service
        services.AddScoped<IAuthService, AuthService>();

        // Register Google Token Validator
        services.AddScoped<IGoogleTokenValidator, GoogleTokenValidator>();

        // Register Cloudinary settings & file storage
        services.Configure<CloudinarySettings>(configuration.GetSection("Cloudinary"));
        services.AddScoped<CloudinaryFileStorage>(); // concrete type — needed by CandidateService for PDF-specific methods
        services.AddScoped<IFileStorage>(sp => sp.GetRequiredService<CloudinaryFileStorage>());

        // Register Profile & Admin services
        services.AddScoped<ICandidateService, CandidateService>();
        services.AddScoped<IEmployerService, EmployerService>();
        services.AddScoped<IAdminService, AdminService>();

        return services;
    }
}


