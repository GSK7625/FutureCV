using FutureCV.Infrastructure.Identity;
using FutureCV.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;

namespace FutureCV.Api.Data;

/// <summary>
/// Seed test data cho FCV-82 testing
/// Chạy 1 lần khi start application nếu database trống
/// </summary>
public static class TestDataSeeder
{
    public static async Task SeedTestDataAsync(
        ApplicationDbContext context,
        UserManager<AppUser> userManager,
        RoleManager<IdentityRole<Guid>> roleManager)
    {
        // TODO: Fix entity properties mismatch before enabling seeder
        // Seeder tạm thời bị vô hiệu hóa vì các entity thiếu properties
        // Cần update entities trước khi enable lại
        await Task.CompletedTask;
    }
}
