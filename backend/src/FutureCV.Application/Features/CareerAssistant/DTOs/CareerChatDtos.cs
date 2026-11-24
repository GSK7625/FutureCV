using System.Text.Json.Serialization;
using FutureCV.Application.Features.AiMatching.DTOs;

namespace FutureCV.Application.Features.CareerAssistant.DTOs;

public sealed record CareerMessage(string Role, string Content);
public sealed record CareerChatRequest(
    string Message,
    IReadOnlyList<CareerMessage> History,
    Guid? CvId = null,
    Guid? JobId = null,
    Guid? ConversationId = null);
public sealed record CareerChatResponse(
    string Reply,
    IReadOnlyList<string> SuggestedFollowups,
    Guid? ConversationId = null);
public sealed record CareerCvEvaluationDto(
    [property: JsonPropertyName("cv_score")] int? CvScore = null,
    [property: JsonPropertyName("strengths")] List<string>? Strengths = null,
    [property: JsonPropertyName("weaknesses")] List<string>? Weaknesses = null,
    [property: JsonPropertyName("improvement_suggestions")] List<string>? ImprovementSuggestions = null);
public sealed record CareerAiContext(
    AiStructuredCvDto? Cv,
    AiStructuredJobDto? Job,
    [property: JsonPropertyName("match_result")] AiMatchResultDto? MatchResult = null,
    [property: JsonPropertyName("cv_evaluation")] CareerCvEvaluationDto? CvEvaluation = null);
public sealed record CareerAiRequest(string Message, IReadOnlyList<CareerMessage> History, CareerAiContext Context);

public sealed record CreateCareerConversationRequest(string? Title = null, Guid? CvId = null, Guid? JobId = null);
public sealed record RenameCareerConversationRequest(string Title);
public sealed record CareerConversationFilterRequest(int PageIndex = 1, int PageSize = 10);

public sealed record CareerConversationMessageDto(Guid Id, string Role, string Content, DateTime CreatedAt);
public sealed record CareerConversationSummaryDto(
    Guid Id,
    string Title,
    Guid? CvId,
    string? CvTitle,
    Guid? JobId,
    string? JobTitle,
    int MessageCount,
    DateTime CreatedAt,
    DateTime UpdatedAt);
public sealed record CareerConversationDetailDto(
    Guid Id,
    string Title,
    Guid? CvId,
    string? CvTitle,
    Guid? JobId,
    string? JobTitle,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    IReadOnlyList<CareerConversationMessageDto> Messages);

public sealed record ImportCareerConversationItemRequest(
    string Title,
    Guid? CvId,
    Guid? JobId,
    DateTime? UpdatedAt,
    IReadOnlyList<CareerMessage> Messages);
public sealed record ImportCareerConversationsRequest(IReadOnlyList<ImportCareerConversationItemRequest> Conversations);
