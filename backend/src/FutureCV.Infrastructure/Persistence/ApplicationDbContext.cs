using FutureCV.Application.Common.Interfaces;
using FutureCV.Domain.Entities;
using FutureCV.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

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

    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<Company> Companies => Set<Company>();
    public DbSet<Employer> Employers => Set<Employer>();
    public DbSet<Candidate> Candidates => Set<Candidate>();
    public DbSet<Education> Educations => Set<Education>();
    public DbSet<Experience> Experiences => Set<Experience>();
    public DbSet<Skill> Skills => Set<Skill>();
    public DbSet<CandidateSkill> CandidateSkills => Set<CandidateSkill>();
    public DbSet<CandidateCv> CandidateCvs => Set<CandidateCv>();
    public DbSet<CvParser> CvParsers => Set<CvParser>();
    public DbSet<CvEvaluation> CvEvaluations => Set<CvEvaluation>();
    public DbSet<Certificate> Certificates => Set<Certificate>();
    public DbSet<Project> Projects => Set<Project>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();

    public DbSet<Location> Locations => Set<Location>();
    public DbSet<JobCategory> JobCategories => Set<JobCategory>();
    public DbSet<JobLevel> JobLevels => Set<JobLevel>();
    public DbSet<EmploymentType> EmploymentTypes => Set<EmploymentType>();
    public DbSet<Job> Jobs => Set<Job>();
    public DbSet<JobSkill> JobSkills => Set<JobSkill>();
    public DbSet<SavedJob> SavedJobs => Set<SavedJob>();
    public DbSet<JobApplication> Applications => Set<JobApplication>();
    public DbSet<ApplicationStatusHistory> ApplicationStatusHistories => Set<ApplicationStatusHistory>();
    public DbSet<JobReport> JobReports => Set<JobReport>();


    public override int SaveChanges()
    {
        NormalizeAuditAndDateTimeProperties();
        return base.SaveChanges();
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        NormalizeAuditAndDateTimeProperties();
        return base.SaveChangesAsync(cancellationToken);
    }

    private void NormalizeAuditAndDateTimeProperties()
    {
        var now = DateTime.UtcNow;
        var nowOffset = DateTimeOffset.UtcNow;

        foreach (var entry in ChangeTracker.Entries())
        {
            if (entry.State == EntityState.Added || entry.State == EntityState.Modified)
            {
                foreach (var prop in entry.Properties)
                {
                    if (prop.CurrentValue is DateTime dt)
                    {
                        if (dt.Kind == DateTimeKind.Unspecified)
                        {
                            var utc = DateTime.SpecifyKind(dt, DateTimeKind.Utc);
                            prop.CurrentValue = utc;
                            prop.Metadata.PropertyInfo?.SetValue(entry.Entity, utc);
                        }
                        else if (dt.Kind == DateTimeKind.Local)
                        {
                            var utc = dt.ToUniversalTime();
                            prop.CurrentValue = utc;
                            prop.Metadata.PropertyInfo?.SetValue(entry.Entity, utc);
                        }
                    }
                }
            }

            if (entry.Entity is FutureCV.Domain.Common.BaseEntity baseEntity)
            {
                if (entry.State == EntityState.Added)
                {
                    if (baseEntity.CreatedAt == default)
                    {
                        baseEntity.CreatedAt = now;
                    }
                }
                else if (entry.State == EntityState.Modified)
                {
                    baseEntity.UpdatedAt = now;
                }
            }
            else if (entry.Entity is AppUser user)
            {
                if (entry.State == EntityState.Modified)
                {
                    user.UpdatedAt = nowOffset;
                }
            }
        }
    }


    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);
        builder.ApplyConfigurationsFromAssembly(typeof(ApplicationDbContext).Assembly);

        // Global ValueConverter to ensure all DateTime and DateTime? properties are treated as UTC for PostgreSQL timestamptz
        var dateTimeConverter = new ValueConverter<DateTime, DateTime>(
            v => v.Kind == DateTimeKind.Utc ? v : DateTime.SpecifyKind(v, DateTimeKind.Utc),
            v => DateTime.SpecifyKind(v, DateTimeKind.Utc));

        var nullableDateTimeConverter = new ValueConverter<DateTime?, DateTime?>(
            v => !v.HasValue ? null : (v.Value.Kind == DateTimeKind.Utc ? v.Value : DateTime.SpecifyKind(v.Value, DateTimeKind.Utc)),
            v => !v.HasValue ? null : DateTime.SpecifyKind(v.Value, DateTimeKind.Utc));

        foreach (var entityType in builder.Model.GetEntityTypes())
        {
            foreach (var property in entityType.GetProperties())
            {
                if (property.ClrType == typeof(DateTime))
                {
                    property.SetValueConverter(dateTimeConverter);
                }
                else if (property.ClrType == typeof(DateTime?))
                {
                    property.SetValueConverter(nullableDateTimeConverter);
                }
            }
        }
    }
}
