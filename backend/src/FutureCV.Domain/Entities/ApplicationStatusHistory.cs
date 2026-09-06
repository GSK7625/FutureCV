using FutureCV.Domain.Common;

namespace FutureCV.Domain.Entities;

/// <summary>
/// Lịch sử thay đổi trạng thái Application - P4-UC06
/// Lưu timeline để audit và hiển thị cho Candidate/Recruiter
/// </summary>
public class ApplicationStatusHistory : BaseEntity
{
    public Guid ApplicationId { get; set; }
    
    public string FromStatus { get; set; } = string.Empty;
    public string ToStatus { get; set; } = string.Empty;
    
    public string? Reason { get; set; } // Lý do thay đổi trạng thái
    public string? Comment { get; set; } // Ghi chú thêm
    
    public Guid? ChangedBy { get; set; } // UserId của người thực hiện (Recruiter/Admin)
    public DateTimeOffset ChangedAt { get; set; } = DateTimeOffset.UtcNow;
    
    public bool NotificationSent { get; set; } = false; // Đã gửi thông báo cho Candidate chưa
    
    // Navigation properties
    public Application Application { get; set; } = null!;
}
