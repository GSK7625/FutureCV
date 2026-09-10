using FluentValidation;
using FutureCV.Application.Features.CareerAssistant.DTOs;

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
    }
}

internal sealed class CareerMessageValidator : AbstractValidator<CareerMessage>
{
    public CareerMessageValidator()
    {
        RuleFor(x => x.Role).Must(x => x is "user" or "assistant");
        RuleFor(x => x.Content).NotEmpty().MaximumLength(4000);
    }
}
