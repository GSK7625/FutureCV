using FutureCV.Domain.Common;
using FutureCV.Domain.Exceptions;

namespace FutureCV.Domain.Entities;

public class CareerMessage : BaseEntity
{
    public const int MaxUserContentLength = 4000;
    public const int MaxAssistantContentLength = 16000;

    public Guid ConversationId { get; private set; }
    public string Role { get; private set; } = string.Empty;
    public string Content { get; private set; } = string.Empty;

    public CareerConversation Conversation { get; private set; } = null!;

    private CareerMessage()
    {
    }

    public static CareerMessage Create(
        Guid conversationId,
        string role,
        string content,
        DateTime? createdAt = null)
    {
        if (conversationId == Guid.Empty)
            throw new DomainException("ConversationId is required for CareerMessage.");

        if (role is not ("user" or "assistant"))
            throw new DomainException("CareerMessage role must be 'user' or 'assistant'.");

        if (string.IsNullOrWhiteSpace(content))
            throw new DomainException("CareerMessage content cannot be empty.");

        var trimmed = content.Trim();
        var maxLength = role == "user" ? MaxUserContentLength : MaxAssistantContentLength;
        if (trimmed.Length > maxLength)
            throw new DomainException($"CareerMessage content for '{role}' cannot exceed {maxLength} characters.");

        return new CareerMessage
        {
            ConversationId = conversationId,
            Role = role,
            Content = trimmed,
            CreatedAt = createdAt ?? DateTime.UtcNow
        };
    }
}
