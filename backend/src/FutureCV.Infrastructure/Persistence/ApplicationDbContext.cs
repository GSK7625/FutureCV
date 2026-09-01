using FutureCV.Application.Common.Interfaces;
using FutureCV.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace FutureCV.Infrastructure.Persistence;

/// <summary>
/// EF Core DbContext. Inherits IdentityDbContext so EF generates all ASP.NET Core
/// Identity tables (AspNetUsers, AspNetRoles, AspNetUserRoles, …) automatically.
/// Implements IApplicationDbContext so the Application layer depends on the interface,
/// not this concrete class.
/// </summary>
public class ApplicationDbContext
    : IdentityDbContext<AppUser, IdentityRole<Guid>, Guid>, IApplicationDbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    // Add DbSet<T> here as you create Domain entities.
    // Example: public DbSet<Resume> Resumes => Set<Resume>();

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        => base.SaveChangesAsync(cancellationToken);

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);
        builder.ApplyConfigurationsFromAssembly(typeof(ApplicationDbContext).Assembly);
    }
}
