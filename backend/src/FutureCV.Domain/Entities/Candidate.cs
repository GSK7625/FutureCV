using FutureCV.Domain.Common;

namespace FutureCV.Domain.Entities;

public class Candidate : BaseEntity
{
    public Guid UserId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Address { get; set; }
    public string? AvatarUrl { get; set; }
    public DateTime? DateOfBirth { get; set; }
    public string? Gender { get; set; }
    public string? Summary { get; set; }
    public string? DesiredPosition { get; set; }
    public int? DesiredSalaryMin { get; set; }
    public int? DesiredSalaryMax { get; set; }
    public string? DesiredLocationId { get; set; }
    public DateTimeOffset? ProfileUpdatedAt { get; set; }
}
