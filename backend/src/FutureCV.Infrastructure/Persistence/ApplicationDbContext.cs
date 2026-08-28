using FutureCV.Application.Common.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace FutureCV.Infrastructure.Persistence;

/// <summary>
/// EF Core DbContext. Implements IApplicationDbContext so the Application layer
/// depends on the interface, not this concrete class.
/// </summary>
public class ApplicationDbContext : DbContext, IApplicationDbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    // Add DbSet<T> here as you create Domain entities.
    // Example: public DbSet<Resume> Resumes => Set<Resume>();

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        => base.SaveChangesAsync(cancellationToken);

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(ApplicationDbContext).Assembly);
    }
}
