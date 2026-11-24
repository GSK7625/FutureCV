using FutureCV.Domain.Common;
using FutureCV.Domain.Exceptions;

namespace FutureCV.Domain.Entities;

public class CareerConversation : BaseEntity
{
    public const int MaxTitleLength = 120;

    public Guid CandidateId { get; private set; }
    public string Title { get; private set; } = string.Empty;
    public Guid? CvId { get; private set; }
    public Guid? JobId { get; private set; }
    public bool IsDeleted { get; private set; }

    public Candidate Candidate { get; private set; } = null!;
    public CandidateCv? Cv { get; private set; }
    public Job? Job { get; private set; }
    public ICollection<CareerMessage> Messages { get; private set; } = [];

    private CareerConversation()
    {
    }

    public static CareerConversation Create(
        Guid candidateId,
        string title,
        Guid? cvId = null,
        Guid? jobId = null,
        DateTime? createdAt = null)
    {
        if (candidateId == Guid.Empty)
            throw new DomainException("CandidateId is required for CareerConversation.");
        if (cvId == Guid.Empty)
            throw new DomainException("CvId cannot be empty.");
        if (jobId == Guid.Empty)
            throw new DomainException("JobId cannot be empty.");

        var normalizedTitle = NormalizeTitle(title);
        var timestamp = createdAt ?? DateTime.UtcNow;

        return new CareerConversation
        {
            CandidateId = candidateId,
            Title = normalizedTitle,
            CvId = cvId,
            JobId = jobId,
            IsDeleted = false,
            CreatedAt = timestamp,
            UpdatedAt = timestamp
        };
    }

    public void Rename(string title)
    {
        EnsureNotDeleted();
        Title = NormalizeTitle(title);
        UpdatedAt = DateTime.UtcNow;
    }

    public CareerMessage AddMessage(string role, string content, DateTime? createdAt = null)
    {
        EnsureNotDeleted();
        var message = CareerMessage.Create(Id, role, content, createdAt);
        Messages.Add(message);
        UpdatedAt = message.CreatedAt;
        return message;
    }

    public void Touch(DateTime? updatedAt = null)
    {
        EnsureNotDeleted();
        UpdatedAt = updatedAt ?? DateTime.UtcNow;
    }

    public void MarkDeleted()
    {
        if (IsDeleted)
            return;

        IsDeleted = true;
        UpdatedAt = DateTime.UtcNow;
    }

    public static string DeriveTitle(string? message)
    {
        if (string.IsNullOrWhiteSpace(message))
            return "Cuộc trò chuyện mới";

        var singleLine = message.Replace('\r', ' ').Replace('\n', ' ').Trim();
        return singleLine.Length <= 80 ? singleLine : singleLine[..80].TrimEnd();
    }

    private void EnsureNotDeleted()
    {
        if (IsDeleted)
            throw new DomainException("Cannot modify a deleted CareerConversation.");
    }

    private static string NormalizeTitle(string title)
    {
        if (string.IsNullOrWhiteSpace(title))
            throw new DomainException("Conversation title cannot be empty.");

        var trimmed = title.Trim();
        if (trimmed.Length > MaxTitleLength)
            throw new DomainException($"Conversation title cannot exceed {MaxTitleLength} characters.");

        return trimmed;
    }
}
