using FutureCV.Domain.Common;

namespace FutureCV.Domain.Entities;

/// <summary>
/// Hồ sơ ứng tuyển - Candidate apply vào Job với CV cụ thể
/// </summary>
public class Application : BaseEntity
{
    public Guid CandidateId { get; set; }
    public Guid JobId { get; set; }
    public Guid CvId { get; set; }
    public string? CoverLetter { get; set; }
    
    // AI Match Snapshot (lúc apply) — MVP Nhóm 3
    public int? MatchScore { get; set; } // 0-100
    public string? MatchExplanation { get; set; }
    public string? MatchedSkillsJson { get; set; } // JSON: ["React","TypeScript"]
    public string? MissingSkillsJson { get; set; } // JSON: ["Next.js","Docker"]
    
    public string Status { get; set; } = ApplicationStatus.Applied; // Applied, Screening, Interview, Offer, Rejected, Withdrawn
    public string? StatusHistory { get; set; } // JSON array: [{status, changedAt, changedBy}]
    public DateTimeOffset? LastStatusChangedAt { get; set; }
    public Guid? LastStatusChangedBy { get; set; } // userId của employer/admin
    
    public DateTimeOffset AppliedAt { get; set; } = DateTimeOffset.UtcNow;
    public bool IsDeleted { get; set; } = false;
    
    // Navigation properties
    public Candidate Candidate { get; set; } = null!;
    public Job Job { get; set; } = null!;
    public CandidateCv CV { get; set; } = null!;
    public CandidateRanking? Ranking { get; set; }
    public ICollection<ApplicationStatusHistory> StatusHistoryRecords { get; set; } = [];
}

/// <summary>
/// Enum cho trạng thái Application
/// </summary>
public static class ApplicationStatus
{
    public const string Applied = "Applied";       // UV vừa nộp đơn
    public const string Screening = "Screening";   // Đang sàng lọc CV
    public const string Interview = "Interview";   // Đang phỏng vấn
    public const string Offer = "Offer";           // Đã gửi offer
    public const string Rejected = "Rejected";     // Bị từ chối
    public const string Withdrawn = "Withdrawn";   // UV tự rút đơn
}
