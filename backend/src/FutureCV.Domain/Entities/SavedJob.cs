using FutureCV.Domain.Common;

namespace FutureCV.Domain.Entities;

/// <summary>
/// Job đã lưu - Candidate bookmark công việc để xem lại sau
/// </summary>
public class SavedJob : BaseEntity
{
    public Guid CandidateId { get; set; }
    public Guid JobId { get; set; }
    public DateTimeOffset SavedAt { get; set; } = DateTimeOffset.UtcNow;
    
    // Navigation properties
    public Candidate Candidate { get; set; } = null!;
    public Job Job { get; set; } = null!;
}
