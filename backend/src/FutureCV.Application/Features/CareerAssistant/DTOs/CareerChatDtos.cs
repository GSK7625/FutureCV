using FutureCV.Application.Features.AiMatching.DTOs;

namespace FutureCV.Application.Features.CareerAssistant.DTOs;

public sealed record CareerMessage(string Role, string Content);
public sealed record CareerChatRequest(string Message, IReadOnlyList<CareerMessage> History, Guid? CvId = null, Guid? JobId = null);
public sealed record CareerChatResponse(string Reply, IReadOnlyList<string> SuggestedFollowups);
public sealed record CareerAiContext(AiStructuredCvDto? Cv, AiStructuredJobDto? Job);
public sealed record CareerAiRequest(string Message, IReadOnlyList<CareerMessage> History, CareerAiContext Context);
