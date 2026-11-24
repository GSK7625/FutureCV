using FluentValidation;
using FutureCV.Application.Features.CareerAssistant.DTOs;
using FutureCV.Domain.Entities;

namespace FutureCV.Application.Features.CareerAssistant.Validators;

public sealed class CareerChatRequestValidator : AbstractValidator<CareerChatRequest>
{
    public CareerChatRequestValidator()
    {
        RuleFor(x => x.Message).NotEmpty().MaximumLength(4000);
        RuleFor(x => x.History).NotNull().Must(x => x is null || x.Count <= 20);
        RuleForEach(x => x.History).NotNull().SetValidator(new CareerMessageValidator());
        RuleFor(x => x.CvId).Must(x => x is null || x != Guid.Empty);
        RuleFor(x => x.JobId).Must(x => x is null || x != Guid.Empty);
        RuleFor(x => x.ConversationId).Must(x => x is null || x != Guid.Empty);
    }
}

public sealed class CreateCareerConversationRequestValidator : AbstractValidator<CreateCareerConversationRequest>
{
    public CreateCareerConversationRequestValidator()
    {
        RuleFor(x => x.Title).Must(x => x is null || (!string.IsNullOrWhiteSpace(x) && x.Trim().Length <= CareerConversation.MaxTitleLength));
        RuleFor(x => x.CvId).Must(x => x is null || x != Guid.Empty);
        RuleFor(x => x.JobId).Must(x => x is null || x != Guid.Empty);
    }
}

public sealed class RenameCareerConversationRequestValidator : AbstractValidator<RenameCareerConversationRequest>
{
    public RenameCareerConversationRequestValidator()
    {
        RuleFor(x => x.Title).NotEmpty().Must(x => !string.IsNullOrWhiteSpace(x) && x.Trim().Length <= CareerConversation.MaxTitleLength);
    }
}

public sealed class ImportCareerConversationsRequestValidator : AbstractValidator<ImportCareerConversationsRequest>
{
    public ImportCareerConversationsRequestValidator()
    {
        RuleFor(x => x.Conversations).NotNull().Must(x => x is not null && x.Count is > 0 and <= 5);
        RuleForEach(x => x.Conversations).NotNull().SetValidator(new ImportCareerConversationItemValidator());
    }
}

internal sealed class ImportCareerConversationItemValidator : AbstractValidator<ImportCareerConversationItemRequest>
{
    public ImportCareerConversationItemValidator()
    {
        RuleFor(x => x.Title).NotEmpty().Must(x => !string.IsNullOrWhiteSpace(x) && x.Trim().Length <= CareerConversation.MaxTitleLength);
        RuleFor(x => x.CvId).Must(x => x is null || x != Guid.Empty);
        RuleFor(x => x.JobId).Must(x => x is null || x != Guid.Empty);
        RuleFor(x => x.Messages).NotNull().Must(x => x is not null && x.Count is > 0 and <= 40);
        RuleForEach(x => x.Messages).NotNull().SetValidator(new ImportCareerMessageValidator());
    }
}

internal sealed class ImportCareerMessageValidator : AbstractValidator<DTOs.CareerMessage>
{
    public ImportCareerMessageValidator()
    {
        RuleFor(x => x.Role).Must(x => x is "user" or "assistant");
        RuleFor(x => x.Content)
            .NotEmpty()
            .Must((msg, content) => !string.IsNullOrWhiteSpace(content) &&
                content.Length <= (msg.Role == "user"
                    ? Domain.Entities.CareerMessage.MaxUserContentLength
                    : Domain.Entities.CareerMessage.MaxAssistantContentLength));
    }
}

internal sealed class CareerMessageValidator : AbstractValidator<DTOs.CareerMessage>
{
    public CareerMessageValidator()
    {
        RuleFor(x => x.Role).Must(x => x is "user" or "assistant");
        RuleFor(x => x.Content).NotEmpty().MaximumLength(4000);
    }
}
