using FutureCV.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FutureCV.Infrastructure.Persistence.Configurations;

public class CareerConversationConfiguration : IEntityTypeConfiguration<CareerConversation>
{
    public void Configure(EntityTypeBuilder<CareerConversation> builder)
    {
        builder.ToTable("CareerConversations");

        builder.HasKey(c => c.Id);

        builder.Property(c => c.Title)
            .IsRequired()
            .HasMaxLength(CareerConversation.MaxTitleLength);

        builder.Property(c => c.IsDeleted)
            .HasDefaultValue(false);

        builder.HasOne(c => c.Candidate)
            .WithMany()
            .HasForeignKey(c => c.CandidateId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(c => c.Cv)
            .WithMany()
            .HasForeignKey(c => c.CvId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(c => c.Job)
            .WithMany()
            .HasForeignKey(c => c.JobId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(c => new { c.CandidateId, c.IsDeleted, c.UpdatedAt });
    }
}
