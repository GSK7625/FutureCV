using Microsoft.AspNetCore.Identity;

namespace FutureCV.Infrastructure.Identity;

/// <summary>
/// Application user entity — currently a thin wrapper over IdentityUser&lt;Guid&gt;.
/// Add custom profile columns here (FullName, AvatarUrl, …) and create a new
/// migration whenever new fields are needed.
/// </summary>
public class AppUser : IdentityUser<Guid>
{
}
