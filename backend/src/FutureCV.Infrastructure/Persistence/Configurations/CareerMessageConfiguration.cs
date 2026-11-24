using FutureCV.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FutureCV.Infrastructure.Persistence.Configurations;

public class CareerMessageConfiguration : IEntityTypeConfiguration<CareerMessage>
{
    public void Configure(EntityTypeBuilder<CareerMessage> builder)
    {
        builder.ToTable("CareerMessages");

        builder.HasKey(m => m.Id);

        builder.Property(m => m.Role)
            .IsRequired()
            .HasMaxLength(20);

        builder.Property(m => m.Content)
            .IsRequired()
            .HasMaxLength(CareerMessage.MaxAssistantContentLength);

        builder.HasOne(m => m.Conversation)
            .WithMany(c => c.Messages)
            .HasForeignKey(m => m.ConversationId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(m => new { m.ConversationId, m.CreatedAt });
    }
}
