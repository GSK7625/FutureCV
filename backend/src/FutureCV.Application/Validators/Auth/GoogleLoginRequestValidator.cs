using FluentValidation;
using FutureCV.Application.DTOs.Auth;

namespace FutureCV.Application.Validators.Auth;

public class GoogleLoginRequestValidator : AbstractValidator<GoogleLoginRequest>
{
    public GoogleLoginRequestValidator()
    {
        RuleFor(x => x.GoogleIdToken)
            .NotEmpty().WithMessage("Google ID Token is required.");
    }
}
