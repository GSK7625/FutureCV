using FutureCV.Domain.Entities;
using FutureCV.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace FutureCV.Domain.Tests.ContractTests;

public class DateTimeUtcConversionTests
{
    [Fact]
    public void ModelBuilder_Configures_DateTime_Properties_With_Utc_Kind()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        using var context = new ApplicationDbContext(options);

        var job = new Job
        {
            Id = Guid.NewGuid(),
            Title = "Test Job",
            Description = "Test Description",
            Deadline = new DateTime(2026, 12, 31, 23, 59, 59, DateTimeKind.Unspecified), // Unspecified kind
            CompanyId = Guid.NewGuid(),
            PostedById = Guid.NewGuid()
        };

        // Act
        context.Jobs.Add(job);
        context.SaveChanges();

        // Assert: Saved job in context should have Utc Kind
        var savedJob = context.Jobs.Find(job.Id);
        Assert.NotNull(savedJob);
        Assert.NotNull(savedJob.Deadline);
        Assert.Equal(DateTimeKind.Utc, savedJob.Deadline.Value.Kind);
    }
}
