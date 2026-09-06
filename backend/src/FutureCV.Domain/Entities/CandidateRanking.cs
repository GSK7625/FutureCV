using FutureCV.Domain.Common;

namespace FutureCV.Domain.Entities;

/// <summary>
/// Xếp hạng Candidate cho một Job cụ thể - P4-UC05
/// </summary>
public class CandidateRanking : BaseEntity
{
    public Guid JobId { get; set; }
    public Guid ApplicationId { get; set; }
    public Guid CandidateId { get; set; }
    
    public int RankPosition { get; set; } // Thứ hạng trong danh sách (1, 2, 3...)
    public int Score { get; set; } // 0-100 điểm tổng hợp
    public int? ManualRating { get; set; } // 1-5 sao do Recruiter đánh giá thủ công
    public string? ReviewComment { get; set; } // Nhận xét của Recruiter
    public string? Tags { get; set; } // JSON: ["Top Talent", "Strong Consider"]
    public string? PrivateNotes { get; set; } // Ghi chú riêng tư của team
    
    public string? ExplanationJson { get; set; } // AI explanation (nếu có)
    public DateTimeOffset ComputedAt { get; set; } = DateTimeOffset.UtcNow;
    public string? ModelVersion { get; set; } // Version AI model sử dụng
    
    public Guid? RankedBy { get; set; } // UserId của Recruiter đánh giá
    
    // Navigation properties
    public Job Job { get; set; } = null!;
    public Application Application { get; set; } = null!;
    public Candidate Candidate { get; set; } = null!;
}
