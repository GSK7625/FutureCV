using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace FutureCV.Infrastructure.Persistence;

/// <summary>
/// Design-time factory for EF Core migrations
/// </summary>
public class ApplicationDbContextFactory : IDesignTimeDbContextFactory<ApplicationDbContext>
{
    public ApplicationDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<ApplicationDbContext>();
        
        // Use hardcoded connection string for design-time only
        optionsBuilder.UseNpgsql("Host=localhost;Port=5432;Database=futurecv_db;Username=postgres;Password=36882044");

        return new ApplicationDbContext(optionsBuilder.Options);
    }
}
