using FutureCV.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace FutureCV.Application.Common.Interfaces;

/// <summary>
/// Contract for the EF Core DbContext exposed to the Application layer.
/// The Application layer never depends on Infrastructure directly.
/// </summary>
public interface IApplicationDbContext
{
    DbSet<RefreshToken> RefreshTokens { get; }
    DbSet<Company> Companies { get; }
    DbSet<Employer> Employers { get; }
    DbSet<Candidate> Candidates { get; }

    Microsoft.EntityFrameworkCore.Infrastructure.DatabaseFacade Database { get; }
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
