namespace FutureCV.Application.Common.Interfaces;

/// <summary>
/// Contract for the EF Core DbContext exposed to the Application layer.
/// The Application layer never depends on Infrastructure directly.
/// </summary>
public interface IApplicationDbContext
{
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
