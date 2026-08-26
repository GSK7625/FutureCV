using System.IdentityModel.Tokens.Jwt;
using FluentValidation;
using FutureCV.Application.Common.Interfaces;
using FutureCV.Application.Common.Models;
using FutureCV.Application.DTOs.Auth;
using FutureCV.Domain.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace FutureCV.Infrastructure.Identity;

/// <summary>
/// Implementation of IAuthService for user authentication, registration, password reset,
/// and refresh token lifecycle management. Uses FluentValidation for request validation.
/// </summary>
public class AuthService : IAuthService
{
    private readonly UserManager<AppUser> _userManager;
    private readonly RoleManager<IdentityRole<Guid>> _roleManager;
    private readonly IApplicationDbContext _context;
    private readonly IJwtTokenService _jwtTokenService;
    private readonly IConfiguration _configuration;
    private readonly IEmailService _emailService;
    private readonly IGoogleTokenValidator _googleTokenValidator;
    private readonly IValidator<RegisterCandidateRequest> _registerCandidateValidator;
    private readonly IValidator<RegisterEmployerRequest> _registerEmployerValidator;
    private readonly IValidator<LoginRequest> _loginValidator;
    private readonly IValidator<RefreshTokenRequest> _refreshTokenValidator;
    private readonly IValidator<ForgotPasswordRequest> _forgotPasswordValidator;
    private readonly IValidator<ResetPasswordRequest> _resetPasswordValidator;
    private readonly IValidator<GoogleLoginRequest> _googleLoginValidator;
    private readonly IValidator<GoogleRegisterEmployerRequest> _googleRegisterEmployerValidator;

    public AuthService(
        UserManager<AppUser> userManager,
        RoleManager<IdentityRole<Guid>> roleManager,
        IApplicationDbContext context,
        IJwtTokenService jwtTokenService,
        IConfiguration configuration,
        IEmailService emailService,
        IGoogleTokenValidator googleTokenValidator,
        IValidator<RegisterCandidateRequest> registerCandidateValidator,
        IValidator<RegisterEmployerRequest> registerEmployerValidator,
        IValidator<LoginRequest> loginValidator,
        IValidator<RefreshTokenRequest> refreshTokenValidator,
        IValidator<ForgotPasswordRequest> forgotPasswordValidator,
        IValidator<ResetPasswordRequest> resetPasswordValidator,
        IValidator<GoogleLoginRequest> googleLoginValidator,
        IValidator<GoogleRegisterEmployerRequest> googleRegisterEmployerValidator)
    {
        _userManager = userManager;
        _roleManager = roleManager;
        _context = context;
        _jwtTokenService = jwtTokenService;
        _configuration = configuration;
        _emailService = emailService;
        _googleTokenValidator = googleTokenValidator;
        _registerCandidateValidator = registerCandidateValidator;
        _registerEmployerValidator = registerEmployerValidator;
        _loginValidator = loginValidator;
        _refreshTokenValidator = refreshTokenValidator;
        _forgotPasswordValidator = forgotPasswordValidator;
        _resetPasswordValidator = resetPasswordValidator;
        _googleLoginValidator = googleLoginValidator;
        _googleRegisterEmployerValidator = googleRegisterEmployerValidator;
    }

    public async Task<AuthResult<AuthResponse>> RegisterCandidateAsync(
        RegisterCandidateRequest request,
        CancellationToken cancellationToken = default)
    {
        var validationResult = await _registerCandidateValidator.ValidateAsync(request, cancellationToken);
        if (!validationResult.IsValid)
        {
            var errors = string.Join(" ", validationResult.Errors.Select(e => e.ErrorMessage));
            return AuthResult.Failure<AuthResponse>(errors, 400);
        }

        var targetRole = "Candidate";

        // Ensure role exists in DB
        if (!await _roleManager.RoleExistsAsync(targetRole))
        {
            return AuthResult.Failure<AuthResponse>($"Role '{targetRole}' is not initialized in the system.", 500);
        }

        // Check duplicate email
        var existingUser = await _userManager.FindByEmailAsync(request.Email);
        if (existingUser is not null)
        {
            return AuthResult.Failure<AuthResponse>("Email already registered. Please log in or reset your password.", 400);
        }

        using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            var user = new AppUser
            {
                Id = Guid.NewGuid(),
                UserName = request.Email,
                Email = request.Email,
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow,
                IsDeleted = false
            };

            var createResult = await _userManager.CreateAsync(user, request.Password);
            if (!createResult.Succeeded)
            {
                var errors = string.Join(" ", createResult.Errors.Select(e => e.Description));
                return AuthResult.Failure<AuthResponse>(errors, 400);
            }

            var roleResult = await _userManager.AddToRoleAsync(user, targetRole);
            if (!roleResult.Succeeded)
            {
                var errors = string.Join(" ", roleResult.Errors.Select(e => e.Description));
                return AuthResult.Failure<AuthResponse>(errors, 400);
            }

            var candidate = new Candidate
            {
                UserId = user.Id,
                FullName = request.FullName
            };
            _context.Candidates.Add(candidate);

            var authResponse = await GenerateAuthTokensAsync(user, targetRole, cancellationToken);
            await _context.SaveChangesAsync(cancellationToken);

            await transaction.CommitAsync(cancellationToken);

            return AuthResult.Success(authResponse, 201);
        }
        catch (Exception)
        {
            await transaction.RollbackAsync(cancellationToken);
            return AuthResult.Failure<AuthResponse>("Registration failed due to a system error. Please try again.", 500);
        }
    }

    public async Task<AuthResult<AuthResponse>> RegisterEmployerAsync(
        RegisterEmployerRequest request,
        CancellationToken cancellationToken = default)
    {
        var validationResult = await _registerEmployerValidator.ValidateAsync(request, cancellationToken);
        if (!validationResult.IsValid)
        {
            var errors = string.Join(" ", validationResult.Errors.Select(e => e.ErrorMessage));
            return AuthResult.Failure<AuthResponse>(errors, 400);
        }

        var targetRole = "Employer";

        if (!await _roleManager.RoleExistsAsync(targetRole))
        {
            return AuthResult.Failure<AuthResponse>($"Role '{targetRole}' is not initialized in the system.", 500);
        }

        var existingUser = await _userManager.FindByEmailAsync(request.Email);
        if (existingUser is not null)
        {
            return AuthResult.Failure<AuthResponse>("Email already registered. Please log in or reset your password.", 400);
        }

        using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            var user = new AppUser
            {
                Id = Guid.NewGuid(),
                UserName = request.Email,
                Email = request.Email,
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow,
                IsDeleted = false
            };

            var createResult = await _userManager.CreateAsync(user, request.Password);
            if (!createResult.Succeeded)
            {
                var errors = string.Join(" ", createResult.Errors.Select(e => e.Description));
                return AuthResult.Failure<AuthResponse>(errors, 400);
            }

            var roleResult = await _userManager.AddToRoleAsync(user, targetRole);
            if (!roleResult.Succeeded)
            {
                var errors = string.Join(" ", roleResult.Errors.Select(e => e.Description));
                return AuthResult.Failure<AuthResponse>(errors, 400);
            }

            // Create Company
            var company = new Company
            {
                Name = request.CompanyName,
                TaxCode = "TEMP_" + Guid.NewGuid().ToString("N")[..8], // Or you could request TaxCode from UI
                VerifiedStatus = "Unverified"
            };
            _context.Companies.Add(company);
            await _context.SaveChangesAsync(cancellationToken);

            // Create Employer
            var employer = new Employer
            {
                UserId = user.Id,
                FullName = request.FullName,
                Phone = request.Phone,
                CompanyId = company.Id
            };
            _context.Employers.Add(employer);

            var authResponse = await GenerateAuthTokensAsync(user, targetRole, cancellationToken);
            await _context.SaveChangesAsync(cancellationToken);

            await transaction.CommitAsync(cancellationToken);

            return AuthResult.Success(authResponse, 201);
        }
        catch (Exception)
        {
            await transaction.RollbackAsync(cancellationToken);
            return AuthResult.Failure<AuthResponse>("Registration failed due to a system error. Please try again.", 500);
        }
    }

    public async Task<AuthResult<AuthResponse>> LoginAsync(
        LoginRequest request,
        CancellationToken cancellationToken = default)
    {
        var validationResult = await _loginValidator.ValidateAsync(request, cancellationToken);
        if (!validationResult.IsValid)
        {
            var errors = string.Join(" ", validationResult.Errors.Select(e => e.ErrorMessage));
            return AuthResult.Failure<AuthResponse>(errors, 400);
        }

        // Always return 401 on missing user (avoid email enumeration)
        var user = await _userManager.FindByEmailAsync(request.Email);
        if (user is null)
            return AuthResult.Failure<AuthResponse>("Invalid email or password.", 401);

        // Check soft-delete (admin disabled) before password check
        if (user.IsDeleted)
            return AuthResult.Failure<AuthResponse>("Account has been disabled. Please contact support.", 403);

        // Check lockout (may have been locked by previous failed attempts)
        if (await _userManager.IsLockedOutAsync(user))
        {
            var until = user.LockoutEnd?.ToString("o") ?? "a while";
            return AuthResult.Failure<AuthResponse>(
                $"Account is locked until {until}. Please try again later.", 403);
        }

        // Verify password
        var passwordValid = await _userManager.CheckPasswordAsync(user, request.Password);
        if (!passwordValid)
        {
            // Increment AccessFailedCount — Identity enforces lockout automatically
            await _userManager.AccessFailedAsync(user);

            // Re-check lockout after failure
            if (await _userManager.IsLockedOutAsync(user))
            {
                var until = user.LockoutEnd?.ToString("o") ?? "a while";
                return AuthResult.Failure<AuthResponse>(
                    $"Too many failed attempts. Account is locked until {until}.", 403);
            }

            return AuthResult.Failure<AuthResponse>("Invalid email or password.", 401);
        }

        // Success — reset failed count
        await _userManager.ResetAccessFailedCountAsync(user);

        // Build JWT claims source
        var roles = await _userManager.GetRolesAsync(user);
        var jwtInfo = new JwtUserInfo(
            UserId:        user.Id,
            Email:         user.Email!,
            Roles:         roles.AsReadOnly(),
            SecurityStamp: user.SecurityStamp);

        var accessToken = _jwtTokenService.GenerateAccessToken(jwtInfo);

        // Parse expiry to return accurate ExpiresAt to client
        var expiryMinutes = int.TryParse(
            _configuration["Jwt:AccessTokenExpiryMinutes"], out var m) ? m : 15;
        var accessTokenExpiresAt = DateTimeOffset.UtcNow.AddMinutes(expiryMinutes);

        // Generate & persist refresh token
        var rawRefreshToken = _jwtTokenService.GenerateRefreshToken();
        var tokenHash = _jwtTokenService.HashRefreshToken(rawRefreshToken);
        var expiryDays = int.TryParse(
            _configuration["Jwt:RefreshTokenExpiryDays"], out var d) ? d : 7;

        var refreshToken = new RefreshToken
        {
            Id        = Guid.NewGuid(),
            UserId    = user.Id,
            TokenHash = tokenHash,
            ExpiresAt = DateTimeOffset.UtcNow.AddDays(expiryDays),
            CreatedAt = DateTimeOffset.UtcNow
        };
        _context.RefreshTokens.Add(refreshToken);

        // Update audit fields
        user.LastLoginAt = DateTimeOffset.UtcNow;
        user.UpdatedAt   = DateTimeOffset.UtcNow;
        await _userManager.UpdateAsync(user);
        await _context.SaveChangesAsync(cancellationToken);

        return AuthResult.Success(new AuthResponse(
            AccessToken:         accessToken,
            AccessTokenExpiresAt: accessTokenExpiresAt,
            RefreshToken:        rawRefreshToken,
            Role:                roles.FirstOrDefault() ?? string.Empty));
    }

    public async Task<AuthResult<AuthResponse>> RefreshTokenAsync(
        RefreshTokenRequest request,
        CancellationToken cancellationToken = default)
    {
        var validationResult = await _refreshTokenValidator.ValidateAsync(request, cancellationToken);
        if (!validationResult.IsValid)
        {
            var errors = string.Join(" ", validationResult.Errors.Select(e => e.ErrorMessage));
            return AuthResult.Failure<AuthResponse>(errors, 400);
        }

        // 1. Look up stored refresh token by hash
        var tokenHash = _jwtTokenService.HashRefreshToken(request.RefreshToken);
        var storedToken = await _context.RefreshTokens
            .FirstOrDefaultAsync(t => t.TokenHash == tokenHash, cancellationToken);

        if (storedToken is null)
            return AuthResult.Failure<AuthResponse>("Invalid or expired refresh token.", 401);

        var userId = storedToken.UserId;

        // 2. Load user and check account status
        var user = await _userManager.FindByIdAsync(userId.ToString());
        if (user is null || user.IsDeleted)
            return AuthResult.Failure<AuthResponse>("Account has been disabled.", 403);

        // REUSE DETECTION: token was already revoked → possible token theft
        if (storedToken.IsRevoked)
        {
            var allActive = await _context.RefreshTokens
                .Where(t => t.UserId == userId && t.RevokedAt == null)
                .ToListAsync(cancellationToken);
            foreach (var t in allActive)
                t.RevokedAt = DateTimeOffset.UtcNow;
            await _context.SaveChangesAsync(cancellationToken);

            return AuthResult.Failure<AuthResponse>("Refresh token has already been used. All sessions revoked for security.", 401);
        }

        if (storedToken.IsExpired)
            return AuthResult.Failure<AuthResponse>("Refresh token has expired. Please log in again.", 401);

        // Build new token pair
        var roles = await _userManager.GetRolesAsync(user);
        var jwtInfo = new JwtUserInfo(
            UserId:        user.Id,
            Email:         user.Email!,
            Roles:         roles.AsReadOnly(),
            SecurityStamp: user.SecurityStamp);

        var newAccessToken = _jwtTokenService.GenerateAccessToken(jwtInfo);
        var expiryMinutes = int.TryParse(_configuration["Jwt:AccessTokenExpiryMinutes"], out var m) ? m : 15;
        var accessTokenExpiresAt = DateTimeOffset.UtcNow.AddMinutes(expiryMinutes);

        var newRawRefreshToken = _jwtTokenService.GenerateRefreshToken();
        var newTokenHash = _jwtTokenService.HashRefreshToken(newRawRefreshToken);
        var expiryDays = int.TryParse(_configuration["Jwt:RefreshTokenExpiryDays"], out var d) ? d : 7;

        var newRefreshToken = new RefreshToken
        {
            Id        = Guid.NewGuid(),
            UserId    = user.Id,
            TokenHash = newTokenHash,
            ExpiresAt = DateTimeOffset.UtcNow.AddDays(expiryDays),
            CreatedAt = DateTimeOffset.UtcNow
        };

        // Rotate: revoke old, link to new
        storedToken.RevokedAt         = DateTimeOffset.UtcNow;
        storedToken.ReplacedByTokenId = newRefreshToken.Id;

        _context.RefreshTokens.Add(newRefreshToken);
        await _context.SaveChangesAsync(cancellationToken);

        return AuthResult.Success(new AuthResponse(
            AccessToken:          newAccessToken,
            AccessTokenExpiresAt: accessTokenExpiresAt,
            RefreshToken:         newRawRefreshToken,
            Role:                 roles.FirstOrDefault() ?? string.Empty));
    }

    public async Task<AuthResult<MessageResponse>> LogoutAsync(
        Guid userId,
        string refreshToken,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(refreshToken))
            return AuthResult.Failure<MessageResponse>("Refresh token is required.", 400);

        var tokenHash = _jwtTokenService.HashRefreshToken(refreshToken);
        var storedToken = await _context.RefreshTokens
            .FirstOrDefaultAsync(t => t.TokenHash == tokenHash && t.UserId == userId, cancellationToken);

        // Idempotent: already revoked or not found — still return success
        if (storedToken is not null && !storedToken.IsRevoked)
        {
            storedToken.RevokedAt = DateTimeOffset.UtcNow;
            await _context.SaveChangesAsync(cancellationToken);
        }

        return AuthResult.Success(new MessageResponse("Logged out."));
    }

    public async Task<AuthResult<MessageResponse>> LogoutAllAsync(
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        var activeTokens = await _context.RefreshTokens
            .Where(t => t.UserId == userId && t.RevokedAt == null)
            .ToListAsync(cancellationToken);

        foreach (var token in activeTokens)
            token.RevokedAt = DateTimeOffset.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        return AuthResult.Success(new MessageResponse("Logged out from all devices."));
    }

    public async Task<AuthResult<MessageResponse>> ForgotPasswordAsync(
        ForgotPasswordRequest request,
        CancellationToken cancellationToken = default)
    {
        var validationResult = await _forgotPasswordValidator.ValidateAsync(request, cancellationToken);
        if (!validationResult.IsValid)
        {
            var errors = string.Join(" ", validationResult.Errors.Select(e => e.ErrorMessage));
            return AuthResult.Failure<MessageResponse>(errors, 400);
        }

        // Always return 200 — never reveal whether the email exists (anti-enumeration)
        var user = await _userManager.FindByEmailAsync(request.Email);
        if (user is null || user.IsDeleted)
        {
            return AuthResult.Success(
                new MessageResponse("If the email exists, a reset link has been sent."));
        }

        var token = await _userManager.GeneratePasswordResetTokenAsync(user);

        // Build reset link for Frontend
        var frontendUrl = _configuration["FrontendUrl"] ?? "http://localhost:3000";
        var resetLink = $"{frontendUrl}/reset-password?email={Uri.EscapeDataString(user.Email!)}&token={Uri.EscapeDataString(token)}";

        var htmlBody = $@"
            <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;'>
                <h2 style='color: #333;'>FutureCV - Đặt lại mật khẩu</h2>
                <p>Xin chào,</p>
                <p>Bạn đã gửi yêu cầu đặt lại mật khẩu cho tài khoản <strong>{user.Email}</strong>.</p>
                <p>Vui lòng nhấp vào nút bên dưới để tiến hành đặt lại mật khẩu (Link có hiệu lực trong 15 phút):</p>
                <p style='margin: 30px 0;'>
                    <a href='{resetLink}' style='background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;'>Đặt lại mật khẩu</a>
                </p>
                <p style='color: #666; font-size: 12px;'>Nếu nút bấm không hoạt động, hãy copy đường dẫn sau vào trình duyệt:</p>
                <p style='color: #666; font-size: 12px;'>{resetLink}</p>
                <hr style='border: none; border-top: 1px solid #eee; margin: 20px 0;' />
                <p style='color: #999; font-size: 12px;'>Nếu bạn không yêu cầu hành động này, vui lòng bỏ qua email này.</p>
            </div>";

        try
        {
            await _emailService.SendEmailAsync(user.Email!, "FutureCV - Yêu cầu đặt lại mật khẩu", htmlBody, cancellationToken);
        }
        catch
        {
            // Log exception in production if email fails, but return anti-enumeration response
        }

        return AuthResult.Success(
            new MessageResponse("If the email exists, a reset link has been sent."));
    }

    public async Task<AuthResult<MessageResponse>> ResetPasswordAsync(
        ResetPasswordRequest request,
        CancellationToken cancellationToken = default)
    {
        var validationResult = await _resetPasswordValidator.ValidateAsync(request, cancellationToken);
        if (!validationResult.IsValid)
        {
            var errors = string.Join(" ", validationResult.Errors.Select(e => e.ErrorMessage));
            return AuthResult.Failure<MessageResponse>(errors, 400);
        }

        // Return generic error for both "user not found" and "invalid token"
        // to prevent user enumeration via the reset endpoint
        var user = await _userManager.FindByEmailAsync(request.Email);
        if (user is null || user.IsDeleted)
        {
            return AuthResult.Failure<MessageResponse>("Invalid or expired reset token.", 400);
        }

        // 1. Decode URL-encoded characters (like %2F -> /, %2B -> +) if user copied raw from URL
        var decodedToken = Uri.UnescapeDataString(request.Token);

        // 2. Normalize token in case '+' characters were converted to spaces in URL / JSON decoding
        var normalizedToken = decodedToken.Replace(" ", "+");

        var result = await _userManager.ResetPasswordAsync(user, normalizedToken, request.NewPassword);
        if (!result.Succeeded)
        {
            var isTokenError = result.Errors.Any(e => e.Code == "InvalidToken");
            if (isTokenError)
            {
                // Mask only token errors for security
                return AuthResult.Failure<MessageResponse>("Invalid or expired reset token.", 400);
            }
            
            // It's likely a password policy error (e.g., missing uppercase, special char, etc.)
            var errors = string.Join(" ", result.Errors.Select(e => e.Description));
            return AuthResult.Failure<MessageResponse>(errors, 400);
        }

        // Rotate SecurityStamp — invalidates ALL existing JWT + refresh tokens for this user
        await _userManager.UpdateSecurityStampAsync(user);

        return AuthResult.Success(
            new MessageResponse("Password reset successful. You can now log in with your new password."));
    }

    public async Task<AuthResult<MessageResponse>> DisableUserAsync(
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());
        if (user is null)
            return AuthResult.Failure<MessageResponse>("User not found.", 404);

        user.IsDeleted = true;
        user.UpdatedAt = DateTimeOffset.UtcNow;
        await _userManager.UpdateAsync(user);

        // Revoke all active refresh tokens immediately (BR-07 / Session Invalidation)
        var activeTokens = await _context.RefreshTokens
            .Where(t => t.UserId == userId && t.RevokedAt == null)
            .ToListAsync(cancellationToken);

        foreach (var token in activeTokens)
        {
            token.RevokedAt = DateTimeOffset.UtcNow;
        }

        await _context.SaveChangesAsync(cancellationToken);

        return AuthResult.Success(
            new MessageResponse("User account has been disabled and all active sessions were revoked."));
    }

    private async Task<AuthResponse> GenerateAuthTokensAsync(AppUser user, string role, CancellationToken cancellationToken)
    {
        var roles = new[] { role };
        var jwtInfo = new JwtUserInfo(
            UserId:        user.Id,
            Email:         user.Email!,
            Roles:         roles.AsReadOnly(),
            SecurityStamp: user.SecurityStamp);

        var accessToken = _jwtTokenService.GenerateAccessToken(jwtInfo);

        var expiryMinutes = int.TryParse(
            _configuration["Jwt:AccessTokenExpiryMinutes"], out var m) ? m : 15;
        var accessTokenExpiresAt = DateTimeOffset.UtcNow.AddMinutes(expiryMinutes);

        var rawRefreshToken = _jwtTokenService.GenerateRefreshToken();
        var tokenHash = _jwtTokenService.HashRefreshToken(rawRefreshToken);
        var expiryDays = int.TryParse(
            _configuration["Jwt:RefreshTokenExpiryDays"], out var d) ? d : 7;

        var refreshToken = new RefreshToken
        {
            Id        = Guid.NewGuid(),
            UserId    = user.Id,
            TokenHash = tokenHash,
            ExpiresAt = DateTimeOffset.UtcNow.AddDays(expiryDays),
            CreatedAt = DateTimeOffset.UtcNow
        };
        _context.RefreshTokens.Add(refreshToken);

        user.LastLoginAt = DateTimeOffset.UtcNow;
        user.UpdatedAt   = DateTimeOffset.UtcNow;
        await _userManager.UpdateAsync(user);

        return new AuthResponse(
            AccessToken:          accessToken,
            AccessTokenExpiresAt: accessTokenExpiresAt,
            RefreshToken:         rawRefreshToken,
            Role:                 role);
    }



    public async Task<AuthResult<AuthResponse>> GoogleLoginAsync(
        GoogleLoginRequest request,
        CancellationToken cancellationToken = default)
    {
        var validationResult = await _googleLoginValidator.ValidateAsync(request, cancellationToken);
        if (!validationResult.IsValid)
            return AuthResult.Failure<AuthResponse>(string.Join(" ", validationResult.Errors.Select(e => e.ErrorMessage)), 400);

        var payload = await _googleTokenValidator.ValidateAsync(request.GoogleIdToken);
        if (payload == null)
            return AuthResult.Failure<AuthResponse>("Invalid Google ID token.", 401);

        var existingUser = await _userManager.FindByEmailAsync(payload.Email);
        if (existingUser == null)
            return AuthResult.Failure<AuthResponse>("User not found. Please register.", 404);

        if (existingUser.IsDeleted)
            return AuthResult.Failure<AuthResponse>("Tài khoản đã bị vô hiệu hóa.", 403);

        var logins = await _userManager.GetLoginsAsync(existingUser);
        if (!logins.Any(l => l.LoginProvider == "Google"))
            return AuthResult.Failure<AuthResponse>("REQUIRE_PASSWORD_LOGIN_TO_LINK", 409); // Account exists with password, needs linking

        var userRoles = await _userManager.GetRolesAsync(existingUser);
        var mainRole = userRoles.FirstOrDefault() ?? "Candidate";

        var authResponse = await GenerateAuthTokensAsync(existingUser, mainRole, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);
        return AuthResult.Success(authResponse);
    }

    public async Task<AuthResult<AuthResponse>> GoogleRegisterCandidateAsync(
        GoogleLoginRequest request,
        CancellationToken cancellationToken = default)
    {
        var validationResult = await _googleLoginValidator.ValidateAsync(request, cancellationToken);
        if (!validationResult.IsValid)
            return AuthResult.Failure<AuthResponse>(string.Join(" ", validationResult.Errors.Select(e => e.ErrorMessage)), 400);

        var payload = await _googleTokenValidator.ValidateAsync(request.GoogleIdToken);
        if (payload == null)
            return AuthResult.Failure<AuthResponse>("Invalid Google ID token.", 401);

        var targetRole = "Candidate";

        using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            var existingUser = await _userManager.FindByEmailAsync(payload.Email);
            if (existingUser != null)
            {
                if (existingUser.IsDeleted)
                    return AuthResult.Failure<AuthResponse>("Tài khoản đã bị vô hiệu hóa.", 403);

                var logins = await _userManager.GetLoginsAsync(existingUser);
                if (!logins.Any(l => l.LoginProvider == "Google"))
                    return AuthResult.Failure<AuthResponse>("REQUIRE_PASSWORD_LOGIN_TO_LINK", 409);

                if (await _userManager.IsInRoleAsync(existingUser, targetRole))
                    return AuthResult.Failure<AuthResponse>("ACCOUNT_ALREADY_EXISTS", 400);
                
                // Add Candidate role & profile to existing user
                await _userManager.AddToRoleAsync(existingUser, targetRole);
                var newCandidate = new Candidate
                {
                    UserId = existingUser.Id,
                    FullName = payload.Name ?? payload.Email
                };
                _context.Candidates.Add(newCandidate);
                var existingAuthResponse = await GenerateAuthTokensAsync(existingUser, targetRole, cancellationToken);
                await _context.SaveChangesAsync(cancellationToken);
                await transaction.CommitAsync(cancellationToken);
                return AuthResult.Success(existingAuthResponse, 201);
            }

            var user = new AppUser
            {
                Id = Guid.NewGuid(),
                UserName = payload.Email,
                Email = payload.Email,
                EmailConfirmed = payload.EmailVerified,
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow,
                IsDeleted = false
            };

            var createResult = await _userManager.CreateAsync(user); // No password
            if (!createResult.Succeeded)
                return AuthResult.Failure<AuthResponse>(string.Join(" ", createResult.Errors.Select(e => e.Description)), 400);

            var loginInfo = new UserLoginInfo("Google", payload.Subject, "Google");
            await _userManager.AddLoginAsync(user, loginInfo);
            await _userManager.AddToRoleAsync(user, targetRole);

            var candidate = new Candidate
            {
                UserId = user.Id,
                FullName = payload.Name ?? payload.Email
            };
            _context.Candidates.Add(candidate);

            var authResponse = await GenerateAuthTokensAsync(user, targetRole, cancellationToken);
            await _context.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);

            return AuthResult.Success(authResponse, 201);
        }
        catch (DbUpdateException) // Catch unique constraint violations
        {
            await transaction.RollbackAsync(cancellationToken);
            return AuthResult.Failure<AuthResponse>("ACCOUNT_ALREADY_EXISTS", 400);
        }
        catch (Exception)
        {
            await transaction.RollbackAsync(cancellationToken);
            return AuthResult.Failure<AuthResponse>("Registration failed due to a system error. Please try again.", 500);
        }
    }

    public async Task<AuthResult<AuthResponse>> GoogleRegisterEmployerAsync(
        GoogleRegisterEmployerRequest request,
        CancellationToken cancellationToken = default)
    {
        var validationResult = await _googleRegisterEmployerValidator.ValidateAsync(request, cancellationToken);
        if (!validationResult.IsValid)
            return AuthResult.Failure<AuthResponse>(string.Join(" ", validationResult.Errors.Select(e => e.ErrorMessage)), 400);

        var payload = await _googleTokenValidator.ValidateAsync(request.GoogleIdToken);
        if (payload == null)
            return AuthResult.Failure<AuthResponse>("Invalid Google ID token.", 401);

        var targetRole = "Employer";

        using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            var existingUser = await _userManager.FindByEmailAsync(payload.Email);
            if (existingUser != null)
            {
                if (existingUser.IsDeleted)
                    return AuthResult.Failure<AuthResponse>("Tài khoản đã bị vô hiệu hóa.", 403);

                var logins = await _userManager.GetLoginsAsync(existingUser);
                if (!logins.Any(l => l.LoginProvider == "Google"))
                    return AuthResult.Failure<AuthResponse>("REQUIRE_PASSWORD_LOGIN_TO_LINK", 409);

                if (await _userManager.IsInRoleAsync(existingUser, targetRole))
                    return AuthResult.Failure<AuthResponse>("ACCOUNT_ALREADY_EXISTS", 400);
                
                // Multi-role logic: add Employer role to existing user
                await _userManager.AddToRoleAsync(existingUser, targetRole);
                var company = new Company
                {
                    Name = request.CompanyName,
                    TaxCode = "TEMP_" + Guid.NewGuid().ToString("N")[..8],
                    VerifiedStatus = "Unverified"
                };
                _context.Companies.Add(company);
                await _context.SaveChangesAsync(cancellationToken);

                var employer = new Employer
                {
                    UserId = existingUser.Id,
                    FullName = payload.Name ?? payload.Email,
                    Phone = request.Phone,
                    CompanyId = company.Id
                };
                _context.Employers.Add(employer);

                var existingAuthResponse = await GenerateAuthTokensAsync(existingUser, targetRole, cancellationToken);
                await _context.SaveChangesAsync(cancellationToken);
                await transaction.CommitAsync(cancellationToken);
                return AuthResult.Success(existingAuthResponse, 201);
            }

            var user = new AppUser
            {
                Id = Guid.NewGuid(),
                UserName = payload.Email,
                Email = payload.Email,
                EmailConfirmed = payload.EmailVerified,
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow,
                IsDeleted = false
            };

            var createResult = await _userManager.CreateAsync(user);
            if (!createResult.Succeeded)
                return AuthResult.Failure<AuthResponse>(string.Join(" ", createResult.Errors.Select(e => e.Description)), 400);

            var loginInfo = new UserLoginInfo("Google", payload.Subject, "Google");
            await _userManager.AddLoginAsync(user, loginInfo);
            await _userManager.AddToRoleAsync(user, targetRole);

            var newCompany = new Company
            {
                Name = request.CompanyName,
                TaxCode = "TEMP_" + Guid.NewGuid().ToString("N")[..8],
                VerifiedStatus = "Unverified"
            };
            _context.Companies.Add(newCompany);
            await _context.SaveChangesAsync(cancellationToken);

            var newEmployer = new Employer
            {
                UserId = user.Id,
                FullName = payload.Name ?? payload.Email,
                Phone = request.Phone,
                CompanyId = newCompany.Id
            };
            _context.Employers.Add(newEmployer);

            var authResponse = await GenerateAuthTokensAsync(user, targetRole, cancellationToken);
            await _context.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);

            return AuthResult.Success(authResponse, 201);
        }
        catch (DbUpdateException)
        {
            await transaction.RollbackAsync(cancellationToken);
            return AuthResult.Failure<AuthResponse>("ACCOUNT_ALREADY_EXISTS", 400);
        }
        catch (Exception)
        {
            await transaction.RollbackAsync(cancellationToken);
            return AuthResult.Failure<AuthResponse>("Registration failed due to a system error. Please try again.", 500);
        }
    }
}
