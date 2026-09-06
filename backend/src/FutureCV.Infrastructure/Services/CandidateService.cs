using FutureCV.Application.Common.Interfaces;
using FutureCV.Application.Common.Models;
using FutureCV.Application.Features.Candidate.DTOs;
using FutureCV.Application.Features.Candidate.Interfaces;
using FutureCV.Domain.Entities;
using FutureCV.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace FutureCV.Infrastructure.Services;

public class CandidateService : ICandidateService
{
    private const string AvatarFolder    = "avatars/candidates";
    private const string CvFolder        = "cvs/candidates";
    private const long   CvMaxSizeBytes  = 5 * 1024 * 1024; // 5 MB

    private readonly IApplicationDbContext _context;
    private readonly IFileStorage _fileStorage;
    private readonly CloudinaryFileStorage _cloudinaryStorage;
    private readonly UserManager<AppUser> _userManager;

    public CandidateService(
        IApplicationDbContext context,
        IFileStorage fileStorage,
        CloudinaryFileStorage cloudinaryStorage,
        UserManager<AppUser> userManager)
    {
        _context          = context;
        _fileStorage      = fileStorage;
        _cloudinaryStorage = cloudinaryStorage;
        _userManager      = userManager;
    }

    // -------------------------------------------------------------------------
    // Profile
    // -------------------------------------------------------------------------

    public async Task<ServiceResult<CandidateProfileResponse>> GetProfileAsync(
        Guid userId, CancellationToken cancellationToken = default)
    {
        var candidate = await FindByUserIdAsync(userId, cancellationToken);
        if (candidate is null)
            return ServiceResult.NotFound<CandidateProfileResponse>("Candidate profile not found.");

        var email = await GetUserEmailAsync(userId);
        return ServiceResult.Success(MapToProfileResponse(candidate, email));
    }

    public async Task<ServiceResult<CandidateFullProfileResponse>> GetFullProfileAsync(
        Guid userId, CancellationToken cancellationToken = default)
    {
        var candidate = await _context.Candidates
            .Include(c => c.Educations.Where(e => !e.IsDeleted))
            .Include(c => c.Experiences.Where(e => !e.IsDeleted))
            .Include(c => c.Skills)
                .ThenInclude(cs => cs.Skill)
            .Include(c => c.Certificates.Where(cert => !cert.IsDeleted))
            .Include(c => c.Projects.Where(p => !p.IsDeleted))
            .Include(c => c.CVs.Where(cv => !cv.IsDeleted))
            .FirstOrDefaultAsync(c => c.UserId == userId && !c.IsDeleted, cancellationToken);

        if (candidate is null)
            return ServiceResult.NotFound<CandidateFullProfileResponse>("Candidate profile not found.");

        var email = await GetUserEmailAsync(userId);
        return ServiceResult.Success(MapToFullProfileResponse(candidate, email));
    }

    public async Task<ServiceResult<CandidateProfileResponse>> UpdatePersonalInfoAsync(
        Guid userId, UpdateCandidateInfoRequest request, CancellationToken cancellationToken = default)
    {
        var candidate = await FindByUserIdAsync(userId, cancellationToken);
        if (candidate is null)
            return ServiceResult.NotFound<CandidateProfileResponse>("Candidate profile not found.");

        candidate.FullName        = request.FullName;
        candidate.Phone           = request.Phone;
        candidate.Address         = request.Address;
        candidate.DateOfBirth     = request.DateOfBirth;
        candidate.Gender          = request.Gender;
        candidate.Summary         = request.Summary;
        candidate.DesiredPosition = request.DesiredPosition;
        candidate.DesiredSalaryMin = request.DesiredSalaryMin;
        candidate.DesiredSalaryMax = request.DesiredSalaryMax;
        candidate.ProfileUpdatedAt = DateTimeOffset.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);
        var email = await GetUserEmailAsync(userId);
        return ServiceResult.Success(MapToProfileResponse(candidate, email));
    }

    public async Task<ServiceResult<string>> UpdateAvatarAsync(
        Guid userId, FileUploadRequest file, CancellationToken cancellationToken = default)
    {
        // 1. Find Candidate profile by UserId
        var candidate = await FindByUserIdAsync(userId, cancellationToken);
        if (candidate is null)
            return ServiceResult.NotFound<string>("Candidate profile not found.");

        // 2. Store old AvatarPublicId for cleanup AFTER DB save succeeds
        var oldPublicId = candidate.AvatarPublicId;

        // 3. Upload new avatar to Cloudinary
        string newPublicUrl;
        string newPublicId;
        try
        {
            (newPublicUrl, newPublicId) = await _fileStorage.UploadAsync(
                file.Stream, file.FileName, AvatarFolder, cancellationToken);
        }
        catch (Exception ex)
        {
            return ServiceResult.Failure<string>($"Failed to upload avatar: {ex.Message}", ServiceErrorType.Infrastructure);
        }

        // 4. Update entity with new Cloudinary URL and PublicId
        candidate.AvatarUrl = newPublicUrl;
        candidate.AvatarPublicId = newPublicId;
        candidate.ProfileUpdatedAt = DateTimeOffset.UtcNow;

        // 5. Persist changes to database
        try
        {
            await _context.SaveChangesAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            // If DB update fails, clean up the newly uploaded file to prevent orphan files
            try
            {
                await _fileStorage.DeleteAsync(newPublicId, cancellationToken);
            }
            catch
            {
                // Best effort cleanup — ignore deletion errors
            }

            return ServiceResult.Failure<string>($"Failed to save avatar to database: {ex.Message}", ServiceErrorType.Infrastructure);
        }

        // 6. Only after upload AND DB update succeed: delete old avatar from Cloudinary using old AvatarPublicId
        if (!string.IsNullOrEmpty(oldPublicId))
        {
            try
            {
                await _fileStorage.DeleteAsync(oldPublicId, cancellationToken);
            }
            catch
            {
                // Non-critical: failure to delete old avatar from Cloudinary does not break successful DB update
            }
        }

        return ServiceResult.Success(newPublicUrl);
    }

    // -------------------------------------------------------------------------
    // Education
    // -------------------------------------------------------------------------

    public async Task<ServiceResult<EducationResponse>> AddEducationAsync(
        Guid userId, EducationDto dto, CancellationToken cancellationToken = default)
    {
        var candidate = await FindByUserIdAsync(userId, cancellationToken);
        if (candidate is null)
            return ServiceResult.NotFound<EducationResponse>("Candidate profile not found.");

        var education = new Education
        {
            CandidateId = candidate.Id,
            School      = dto.School,
            Degree      = dto.Degree,
            Major       = dto.Major,
            StartYear   = dto.StartYear,
            EndYear     = dto.EndYear,
            Description = dto.Description,
        };

        _context.Educations.Add(education);
        await _context.SaveChangesAsync(cancellationToken);
        return ServiceResult.Success(MapToEducationResponse(education));
    }

    public async Task<ServiceResult<EducationResponse>> UpdateEducationAsync(
        Guid userId, Guid educationId, EducationDto dto, CancellationToken cancellationToken = default)
    {
        var (education, error) = await FindEducationWithOwnershipAsync(userId, educationId, cancellationToken);
        if (error is not null) return error;

        education!.School      = dto.School;
        education.Degree      = dto.Degree;
        education.Major       = dto.Major;
        education.StartYear   = dto.StartYear;
        education.EndYear     = dto.EndYear;
        education.Description = dto.Description;

        await _context.SaveChangesAsync(cancellationToken);
        return ServiceResult.Success(MapToEducationResponse(education));
    }

    public async Task<ServiceResult<bool>> DeleteEducationAsync(
        Guid userId, Guid educationId, CancellationToken cancellationToken = default)
    {
        var (education, error) = await FindEducationWithOwnershipAsync(userId, educationId, cancellationToken);
        if (error is not null) return ServiceResult.Failure<bool>(error.ErrorMessage!, error.ErrorType);

        education!.IsDeleted = true;
        await _context.SaveChangesAsync(cancellationToken);
        return ServiceResult.Success(true);
    }

    // -------------------------------------------------------------------------
    // Experience
    // -------------------------------------------------------------------------

    public async Task<ServiceResult<ExperienceResponse>> AddExperienceAsync(
        Guid userId, ExperienceDto dto, CancellationToken cancellationToken = default)
    {
        var candidate = await FindByUserIdAsync(userId, cancellationToken);
        if (candidate is null)
            return ServiceResult.NotFound<ExperienceResponse>("Candidate profile not found.");

        var experience = new Experience
        {
            CandidateId  = candidate.Id,
            CompanyName  = dto.CompanyName,
            Position     = dto.Position,
            StartDate    = dto.StartDate,
            EndDate      = dto.IsCurrent ? null : dto.EndDate,
            IsCurrent    = dto.IsCurrent,
            Description  = dto.Description,
        };

        _context.Experiences.Add(experience);
        await _context.SaveChangesAsync(cancellationToken);
        return ServiceResult.Success(MapToExperienceResponse(experience));
    }

    public async Task<ServiceResult<ExperienceResponse>> UpdateExperienceAsync(
        Guid userId, Guid experienceId, ExperienceDto dto, CancellationToken cancellationToken = default)
    {
        var (experience, error) = await FindExperienceWithOwnershipAsync(userId, experienceId, cancellationToken);
        if (error is not null) return error;

        experience!.CompanyName = dto.CompanyName;
        experience.Position    = dto.Position;
        experience.StartDate   = dto.StartDate;
        experience.EndDate     = dto.IsCurrent ? null : dto.EndDate;
        experience.IsCurrent   = dto.IsCurrent;
        experience.Description = dto.Description;

        await _context.SaveChangesAsync(cancellationToken);
        return ServiceResult.Success(MapToExperienceResponse(experience));
    }

    public async Task<ServiceResult<bool>> DeleteExperienceAsync(
        Guid userId, Guid experienceId, CancellationToken cancellationToken = default)
    {
        var (experience, error) = await FindExperienceWithOwnershipAsync(userId, experienceId, cancellationToken);
        if (error is not null) return ServiceResult.Failure<bool>(error.ErrorMessage!, error.ErrorType);

        experience!.IsDeleted = true;
        await _context.SaveChangesAsync(cancellationToken);
        return ServiceResult.Success(true);
    }

    // -------------------------------------------------------------------------
    // Skills
    // -------------------------------------------------------------------------

    public async Task<ServiceResult<CandidateSkillResponse>> AddSkillAsync(
        Guid userId, CandidateSkillDto dto, CancellationToken cancellationToken = default)
    {
        var candidate = await FindByUserIdAsync(userId, cancellationToken);
        if (candidate is null)
            return ServiceResult.NotFound<CandidateSkillResponse>("Candidate profile not found.");

        var skill = await _context.Skills.FirstOrDefaultAsync(s => s.Id == dto.SkillId, cancellationToken);
        if (skill is null)
            return ServiceResult.NotFound<CandidateSkillResponse>("Skill not found.");

        var alreadyExists = await _context.CandidateSkills
            .AnyAsync(cs => cs.CandidateId == candidate.Id && cs.SkillId == dto.SkillId, cancellationToken);
        if (alreadyExists)
            return ServiceResult.Conflict<CandidateSkillResponse>("This skill has already been added to your profile.");

        var candidateSkill = new CandidateSkill
        {
            CandidateId = candidate.Id,
            SkillId     = dto.SkillId,
            Level       = dto.Level,
            Years       = dto.Years,
        };

        _context.CandidateSkills.Add(candidateSkill);
        await _context.SaveChangesAsync(cancellationToken);
        return ServiceResult.Success(MapToSkillResponse(candidateSkill, skill));
    }

    public async Task<ServiceResult<bool>> RemoveSkillAsync(
        Guid userId, Guid skillId, CancellationToken cancellationToken = default)
    {
        var candidate = await FindByUserIdAsync(userId, cancellationToken);
        if (candidate is null)
            return ServiceResult.NotFound<bool>("Candidate profile not found.");

        var candidateSkill = await _context.CandidateSkills
            .FirstOrDefaultAsync(cs => cs.CandidateId == candidate.Id && cs.SkillId == skillId, cancellationToken);

        if (candidateSkill is null)
            return ServiceResult.NotFound<bool>("Skill not found in your profile.");

        _context.CandidateSkills.Remove(candidateSkill);
        await _context.SaveChangesAsync(cancellationToken);
        return ServiceResult.Success(true);
    }

    // -------------------------------------------------------------------------
    // Private helpers — reusable across all methods
    // -------------------------------------------------------------------------

    // Single point for candidate lookup — reused by every operation
    private async Task<Candidate?> FindByUserIdAsync(Guid userId, CancellationToken ct)
        => await _context.Candidates
            .FirstOrDefaultAsync(c => c.UserId == userId && !c.IsDeleted, ct);

    // IDOR guard for Education: verifies the record exists AND belongs to the current user
    private async Task<(Education? education, ServiceResult<EducationResponse>? error)>
        FindEducationWithOwnershipAsync(Guid userId, Guid educationId, CancellationToken ct)
    {
        var candidate = await FindByUserIdAsync(userId, ct);
        if (candidate is null)
            return (null, ServiceResult.NotFound<EducationResponse>("Candidate profile not found."));

        var education = await _context.Educations
            .FirstOrDefaultAsync(e => e.Id == educationId && !e.IsDeleted, ct);

        if (education is null)
            return (null, ServiceResult.NotFound<EducationResponse>("Education entry not found."));

        // IDOR check: ensure the record belongs to the authenticated user's candidate
        if (education.CandidateId != candidate.Id)
            return (null, ServiceResult.Forbidden<EducationResponse>("Access denied."));

        return (education, null);
    }

    // IDOR guard for Experience
    private async Task<(Experience? experience, ServiceResult<ExperienceResponse>? error)>
        FindExperienceWithOwnershipAsync(Guid userId, Guid experienceId, CancellationToken ct)
    {
        var candidate = await FindByUserIdAsync(userId, ct);
        if (candidate is null)
            return (null, ServiceResult.NotFound<ExperienceResponse>("Candidate profile not found."));

        var experience = await _context.Experiences
            .FirstOrDefaultAsync(e => e.Id == experienceId && !e.IsDeleted, ct);

        if (experience is null)
            return (null, ServiceResult.NotFound<ExperienceResponse>("Experience entry not found."));

        if (experience.CandidateId != candidate.Id)
            return (null, ServiceResult.Forbidden<ExperienceResponse>("Access denied."));

        return (experience, null);
    }

    // -------------------------------------------------------------------------
    // Private static mappers — pure functions, easy to extend/test
    // -------------------------------------------------------------------------

    // -------------------------------------------------------------------------
    // CV PDF Management (P2-UC03, P2-UC07)
    // -------------------------------------------------------------------------

    public async Task<ServiceResult<CvResponse>> UploadCvAsync(
        Guid userId, FileUploadRequest file, string? title, CancellationToken cancellationToken = default)
    {
        var candidate = await FindByUserIdAsync(userId, cancellationToken);
        if (candidate is null)
            return ServiceResult.NotFound<CvResponse>("Candidate profile not found.");

        if (file.SizeInBytes > CvMaxSizeBytes)
            return ServiceResult.Failure<CvResponse>($"CV file size must not exceed 5 MB.");

        string publicUrl, publicId;
        try
        {
            (publicUrl, publicId) = await _cloudinaryStorage.UploadDocumentAsync(
                file.Stream, file.FileName, CvFolder, cancellationToken);
        }
        catch (Exception ex)
        {
            return ServiceResult.Failure<CvResponse>(
                $"Failed to upload CV: {ex.Message}", ServiceErrorType.Infrastructure);
        }

        // If this is the first CV, auto-set as primary
        var hasPrimary = await _context.CandidateCvs
            .AnyAsync(cv => cv.CandidateId == candidate.Id && cv.IsPrimary && !cv.IsDeleted, cancellationToken);

        var cv = new CandidateCv
        {
            CandidateId   = candidate.Id,
            Title         = title ?? file.FileName,
            FileUrl       = publicUrl,
            PublicId      = publicId,
            FileType      = "PDF",
            FileSizeBytes = file.SizeInBytes,
            Source        = "Upload",
            ParseStatus   = "Pending",
            IsPrimary     = !hasPrimary,
        };

        try
        {
            _context.CandidateCvs.Add(cv);
            await _context.SaveChangesAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            // Rollback Cloudinary upload on DB failure
            try { await _cloudinaryStorage.DeleteDocumentAsync(publicId, cancellationToken); } catch { }
            return ServiceResult.Failure<CvResponse>(
                $"Failed to save CV record: {ex.Message}", ServiceErrorType.Infrastructure);
        }

        return ServiceResult.Success(MapToCvResponse(cv));
    }

    public async Task<ServiceResult<IReadOnlyList<CvResponse>>> GetCvsAsync(
        Guid userId, CancellationToken cancellationToken = default)
    {
        var candidate = await FindByUserIdAsync(userId, cancellationToken);
        if (candidate is null)
            return ServiceResult.NotFound<IReadOnlyList<CvResponse>>("Candidate profile not found.");

        var cvs = await _context.CandidateCvs
            .Where(cv => cv.CandidateId == candidate.Id && !cv.IsDeleted)
            .OrderByDescending(cv => cv.CreatedAt)
            .ToListAsync(cancellationToken);

        return ServiceResult.Success<IReadOnlyList<CvResponse>>(
            cvs.Select(MapToCvResponse).ToList());
    }

    public async Task<ServiceResult<CvResponse>> GetCvByIdAsync(
        Guid userId, Guid cvId, CancellationToken cancellationToken = default)
    {
        var (cv, error) = await FindCvWithOwnershipAsync(userId, cvId, cancellationToken);
        if (error is not null) return error;
        return ServiceResult.Success(MapToCvResponse(cv!));
    }

    public async Task<ServiceResult<CvResponse>> UpdateCvTitleAsync(
        Guid userId, Guid cvId, string title, CancellationToken cancellationToken = default)
    {
        var (cv, error) = await FindCvWithOwnershipAsync(userId, cvId, cancellationToken);
        if (error is not null) return error;

        cv!.Title = title;
        await _context.SaveChangesAsync(cancellationToken);
        return ServiceResult.Success(MapToCvResponse(cv));
    }

    public async Task<ServiceResult<bool>> DeleteCvAsync(
        Guid userId, Guid cvId, CancellationToken cancellationToken = default)
    {
        var (cv, error) = await FindCvWithOwnershipAsync(userId, cvId, cancellationToken);
        if (error is not null) return ServiceResult.Failure<bool>(error.ErrorMessage!, error.ErrorType);

        var oldPublicId = cv!.PublicId;
        cv.IsDeleted = true;

        // If deleted CV was primary, reassign to the next most recent CV
        if (cv.IsPrimary)
        {
            var candidate = await FindByUserIdAsync(userId, cancellationToken);
            var next = await _context.CandidateCvs
                .Where(c => c.CandidateId == candidate!.Id && c.Id != cvId && !c.IsDeleted)
                .OrderByDescending(c => c.CreatedAt)
                .FirstOrDefaultAsync(cancellationToken);
            if (next is not null) next.IsPrimary = true;
            cv.IsPrimary = false;
        }

        await _context.SaveChangesAsync(cancellationToken);

        // Best-effort cleanup on Cloudinary after DB is committed
        if (!string.IsNullOrEmpty(oldPublicId))
            try { await _cloudinaryStorage.DeleteDocumentAsync(oldPublicId, cancellationToken); } catch { }

        return ServiceResult.Success(true);
    }

    public async Task<ServiceResult<CvResponse>> SelectPrimaryCvAsync(
        Guid userId, Guid cvId, CancellationToken cancellationToken = default)
    {
        var (cv, error) = await FindCvWithOwnershipAsync(userId, cvId, cancellationToken);
        if (error is not null) return error;

        var candidate = await FindByUserIdAsync(userId, cancellationToken);

        // Unset current primary
        var currentPrimary = await _context.CandidateCvs
            .FirstOrDefaultAsync(c => c.CandidateId == candidate!.Id && c.IsPrimary && !c.IsDeleted, cancellationToken);
        if (currentPrimary is not null) currentPrimary.IsPrimary = false;

        cv!.IsPrimary = true;
        await _context.SaveChangesAsync(cancellationToken);
        return ServiceResult.Success(MapToCvResponse(cv));
    }

    // -------------------------------------------------------------------------
    // Certificates (P2-UC04)
    // -------------------------------------------------------------------------

    public async Task<ServiceResult<CertificateResponse>> AddCertificateAsync(
        Guid userId, CertificateDto dto, CancellationToken cancellationToken = default)
    {
        var candidate = await FindByUserIdAsync(userId, cancellationToken);
        if (candidate is null)
            return ServiceResult.NotFound<CertificateResponse>("Candidate profile not found.");

        var cert = new Certificate
        {
            CandidateId    = candidate.Id,
            Name           = dto.Name,
            Organization   = dto.Organization,
            IssueDate      = dto.IssueDate,
            ExpirationDate = dto.ExpirationDate,
            CredentialUrl  = dto.CredentialUrl,
            Description    = dto.Description,
        };

        _context.Certificates.Add(cert);
        await _context.SaveChangesAsync(cancellationToken);
        return ServiceResult.Success(MapToCertificateResponse(cert));
    }

    public async Task<ServiceResult<CertificateResponse>> UpdateCertificateAsync(
        Guid userId, Guid certificateId, CertificateDto dto, CancellationToken cancellationToken = default)
    {
        var (cert, error) = await FindCertificateWithOwnershipAsync(userId, certificateId, cancellationToken);
        if (error is not null) return error;

        cert!.Name           = dto.Name;
        cert.Organization   = dto.Organization;
        cert.IssueDate      = dto.IssueDate;
        cert.ExpirationDate = dto.ExpirationDate;
        cert.CredentialUrl  = dto.CredentialUrl;
        cert.Description    = dto.Description;

        await _context.SaveChangesAsync(cancellationToken);
        return ServiceResult.Success(MapToCertificateResponse(cert));
    }

    public async Task<ServiceResult<bool>> DeleteCertificateAsync(
        Guid userId, Guid certificateId, CancellationToken cancellationToken = default)
    {
        var (cert, error) = await FindCertificateWithOwnershipAsync(userId, certificateId, cancellationToken);
        if (error is not null) return ServiceResult.Failure<bool>(error.ErrorMessage!, error.ErrorType);

        cert!.IsDeleted = true;
        await _context.SaveChangesAsync(cancellationToken);
        return ServiceResult.Success(true);
    }

    // -------------------------------------------------------------------------
    // Projects (P2-UC04)
    // -------------------------------------------------------------------------

    public async Task<ServiceResult<ProjectResponse>> AddProjectAsync(
        Guid userId, ProjectDto dto, CancellationToken cancellationToken = default)
    {
        var candidate = await FindByUserIdAsync(userId, cancellationToken);
        if (candidate is null)
            return ServiceResult.NotFound<ProjectResponse>("Candidate profile not found.");

        var project = new Project
        {
            CandidateId = candidate.Id,
            Name        = dto.Name,
            Role        = dto.Role,
            StartDate   = dto.StartDate,
            EndDate     = dto.IsCurrent ? null : dto.EndDate,
            IsCurrent   = dto.IsCurrent,
            ProjectUrl  = dto.ProjectUrl,
            Description = dto.Description,
        };

        _context.Projects.Add(project);
        await _context.SaveChangesAsync(cancellationToken);
        return ServiceResult.Success(MapToProjectResponse(project));
    }

    public async Task<ServiceResult<ProjectResponse>> UpdateProjectAsync(
        Guid userId, Guid projectId, ProjectDto dto, CancellationToken cancellationToken = default)
    {
        var (project, error) = await FindProjectWithOwnershipAsync(userId, projectId, cancellationToken);
        if (error is not null) return error;

        project!.Name        = dto.Name;
        project.Role        = dto.Role;
        project.StartDate   = dto.StartDate;
        project.EndDate     = dto.IsCurrent ? null : dto.EndDate;
        project.IsCurrent   = dto.IsCurrent;
        project.ProjectUrl  = dto.ProjectUrl;
        project.Description = dto.Description;

        await _context.SaveChangesAsync(cancellationToken);
        return ServiceResult.Success(MapToProjectResponse(project));
    }

    public async Task<ServiceResult<bool>> DeleteProjectAsync(
        Guid userId, Guid projectId, CancellationToken cancellationToken = default)
    {
        var (project, error) = await FindProjectWithOwnershipAsync(userId, projectId, cancellationToken);
        if (error is not null) return ServiceResult.Failure<bool>(error.ErrorMessage!, error.ErrorType);

        project!.IsDeleted = true;
        await _context.SaveChangesAsync(cancellationToken);
        return ServiceResult.Success(true);
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    private async Task<string> GetUserEmailAsync(Guid userId)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());
        return user?.Email ?? string.Empty;
    }

    private async Task<(CandidateCv? cv, ServiceResult<CvResponse>? error)>
        FindCvWithOwnershipAsync(Guid userId, Guid cvId, CancellationToken ct)
    {
        var candidate = await FindByUserIdAsync(userId, ct);
        if (candidate is null)
            return (null, ServiceResult.NotFound<CvResponse>("Candidate profile not found."));

        var cv = await _context.CandidateCvs
            .FirstOrDefaultAsync(c => c.Id == cvId && !c.IsDeleted, ct);
        if (cv is null)
            return (null, ServiceResult.NotFound<CvResponse>("CV not found."));

        if (cv.CandidateId != candidate.Id)
            return (null, ServiceResult.Forbidden<CvResponse>("Access denied."));

        return (cv, null);
    }

    private async Task<(Certificate? cert, ServiceResult<CertificateResponse>? error)>
        FindCertificateWithOwnershipAsync(Guid userId, Guid certId, CancellationToken ct)
    {
        var candidate = await FindByUserIdAsync(userId, ct);
        if (candidate is null)
            return (null, ServiceResult.NotFound<CertificateResponse>("Candidate profile not found."));

        var cert = await _context.Certificates
            .FirstOrDefaultAsync(c => c.Id == certId && !c.IsDeleted, ct);
        if (cert is null)
            return (null, ServiceResult.NotFound<CertificateResponse>("Certificate not found."));

        if (cert.CandidateId != candidate.Id)
            return (null, ServiceResult.Forbidden<CertificateResponse>("Access denied."));

        return (cert, null);
    }

    private async Task<(Project? project, ServiceResult<ProjectResponse>? error)>
        FindProjectWithOwnershipAsync(Guid userId, Guid projectId, CancellationToken ct)
    {
        var candidate = await FindByUserIdAsync(userId, ct);
        if (candidate is null)
            return (null, ServiceResult.NotFound<ProjectResponse>("Candidate profile not found."));

        var project = await _context.Projects
            .FirstOrDefaultAsync(p => p.Id == projectId && !p.IsDeleted, ct);
        if (project is null)
            return (null, ServiceResult.NotFound<ProjectResponse>("Project not found."));

        if (project.CandidateId != candidate.Id)
            return (null, ServiceResult.Forbidden<ProjectResponse>("Access denied."));

        return (project, null);
    }

    // -------------------------------------------------------------------------
    // Private static mappers
    // -------------------------------------------------------------------------

    private static CandidateProfileResponse MapToProfileResponse(Candidate c, string email) => new(
        c.Id, c.UserId, email, c.FullName, c.Phone, c.Address, c.AvatarUrl,
        c.DateOfBirth, c.Gender, c.Summary, c.DesiredPosition,
        c.DesiredSalaryMin, c.DesiredSalaryMax, c.ProfileUpdatedAt, c.CreatedAt);

    private static CandidateFullProfileResponse MapToFullProfileResponse(Candidate c, string email) => new()
    {
        Id               = c.Id,
        UserId           = c.UserId,
        Email            = email,
        FullName         = c.FullName,
        Phone            = c.Phone,
        Address          = c.Address,
        AvatarUrl        = c.AvatarUrl,
        DateOfBirth      = c.DateOfBirth,
        Gender           = c.Gender,
        Summary          = c.Summary,
        DesiredPosition  = c.DesiredPosition,
        DesiredSalaryMin = c.DesiredSalaryMin,
        DesiredSalaryMax = c.DesiredSalaryMax,
        ProfileUpdatedAt = c.ProfileUpdatedAt,
        CreatedAt        = c.CreatedAt,
        Educations       = c.Educations.Select(MapToEducationResponse).ToList(),
        Experiences      = c.Experiences.Select(MapToExperienceResponse).ToList(),
        Skills           = c.Skills.Select(cs => MapToSkillResponse(cs, cs.Skill)).ToList(),
        Certificates     = c.Certificates.Select(MapToCertificateResponse).ToList(),
        Projects         = c.Projects.Select(MapToProjectResponse).ToList(),
        CVs              = c.CVs.Select(MapToCvResponse).ToList(),
    };

    private static EducationResponse MapToEducationResponse(Education e) => new(
        e.Id, e.School, e.Degree, e.Major, e.StartYear, e.EndYear, e.Description);

    private static ExperienceResponse MapToExperienceResponse(Experience e) => new(
        e.Id, e.CompanyName, e.Position, e.StartDate, e.EndDate, e.IsCurrent, e.Description);

    private static CandidateSkillResponse MapToSkillResponse(CandidateSkill cs, Skill skill) => new(
        skill.Id, skill.Name, skill.Category, cs.Level.ToString(), cs.Years);

    private static CvResponse MapToCvResponse(CandidateCv cv) => new(
        cv.Id, cv.CandidateId, cv.Title, cv.FileUrl, cv.FileType,
        cv.FileSizeBytes, cv.IsPrimary, cv.CreatedAt);

    private static CertificateResponse MapToCertificateResponse(Certificate c) => new(
        c.Id, c.Name, c.Organization, c.IssueDate, c.ExpirationDate, c.CredentialUrl, c.Description);

    private static ProjectResponse MapToProjectResponse(Project p) => new(
        p.Id, p.Name, p.Role, p.StartDate, p.EndDate, p.IsCurrent, p.ProjectUrl, p.Description);
}
