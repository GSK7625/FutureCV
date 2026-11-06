using System.Text.Json;
using FutureCV.Application.Features.Candidate.DTOs;
using FutureCV.Domain.Entities;
using FutureCV.Domain.Enums;
using FutureCV.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace FutureCV.Infrastructure.Persistence.Seeders;

/// <summary>
/// Seeds realistic demo presentation data and extensive test cases for FutureCV:
/// - Companies: FPT Software, VNG Corporation
/// - Recruiters: recruiter@fpt.com (FPT Software), recruiter@vng.com.vn (VNG Corporation)
/// - 12 Diverse Candidates with complete profiles, CVs, and ParsedDataJson
/// - 10 Jobs across various roles, levels, and tech stacks
/// - 15 Job Applications across Jobs 1, 2, 4 covering:
///   * Top High Match (90-95%) with Gold/Silver Medals
///   * Medium Match (60-80%)
///   * Low / Junior Match (40-55%)
///   * Mismatch / Disqualified (15-25%)
///   * Over-budget / Salary mismatch
///   * Location mismatch (Hanoi vs HCM)
///   * Diverse Pipeline statuses: Applied, Screening, Interview, Offer, Hired, Rejected
///   * Application Status History timelines
/// Idempotent: checks before inserting.
/// </summary>
public static class DemoDataSeeder
{
    public static async Task SeedAsync(IServiceProvider serviceProvider)
    {
        using var scope = serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<AppUser>>();
        var logger = scope.ServiceProvider.GetService<ILoggerFactory>()?.CreateLogger(nameof(DemoDataSeeder));

        try
        {
            logger?.LogInformation("Starting rich demo presentation & testcase data seeding...");

            // -----------------------------------------------------------------
            // 1. Companies
            // -----------------------------------------------------------------
            var fptCompany = await context.Companies.FirstOrDefaultAsync(c => c.TaxCode == "0101778162");
            if (fptCompany == null)
            {
                fptCompany = new Company
                {
                    Name = "FPT Software",
                    TaxCode = "0101778162",
                    LogoUrl = "https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/FPT_logo_2010.svg/1200px-FPT_logo_2010.svg.png",
                    Scale = "10000+ nhân viên",
                    Industry = "Công nghệ thông tin / Phần mềm",
                    WebsiteUrl = "https://fptsoftware.com",
                    Address = "Tòa nhà FPT, Phố Duy Tân, Phường Dịch Vọng Hậu, Quận Cầu Giấy, Hà Nội",
                    Description = "FPT Software là công ty thành viên thuộc Tập đoàn FPT, nhà cung cấp dịch vụ công nghệ thông tin và chuyển đổi số hàng đầu tại khu vực Châu Á.",
                    VerifiedStatus = CompanyVerificationStatus.Verified,
                    VerifiedAt = DateTimeOffset.UtcNow
                };
                await context.Companies.AddAsync(fptCompany);
                await context.SaveChangesAsync();
            }

            var vngCompany = await context.Companies.FirstOrDefaultAsync(c => c.TaxCode == "0303538435");
            if (vngCompany == null)
            {
                vngCompany = new Company
                {
                    Name = "VNG Corporation",
                    TaxCode = "0303538435",
                    LogoUrl = "https://upload.wikimedia.org/wikipedia/vi/thumb/9/91/VNG_Corporation_logo.svg/1200px-VNG_Corporation_logo.svg.png",
                    Scale = "1000 - 5000 nhân viên",
                    Industry = "Công nghệ thông tin / Game & Internet",
                    WebsiteUrl = "https://vng.com.vn",
                    Address = "Z06 Đường số 13, Phường Tân Thuận Đông, Quận 7, TP. Hồ Chí Minh",
                    Description = "VNG là doanh nghiệp công nghệ hàng đầu Việt Nam với hệ sinh thái sản phẩm phong phú: Zalo, ZaloPay, VNG Games...",
                    VerifiedStatus = CompanyVerificationStatus.Verified,
                    VerifiedAt = DateTimeOffset.UtcNow
                };
                await context.Companies.AddAsync(vngCompany);
                await context.SaveChangesAsync();
            }

            // -----------------------------------------------------------------
            // 2. Recruiters
            // -----------------------------------------------------------------
            var recruiterEmail = "recruiter@fpt.com";
            var recruiterUser = await userManager.FindByEmailAsync(recruiterEmail);
            if (recruiterUser == null)
            {
                recruiterUser = new AppUser
                {
                    Id = Guid.NewGuid(),
                    UserName = recruiterEmail,
                    Email = recruiterEmail,
                    EmailConfirmed = true,
                    CreatedAt = DateTimeOffset.UtcNow,
                    UpdatedAt = DateTimeOffset.UtcNow
                };
                var result = await userManager.CreateAsync(recruiterUser, "Recruiter@123456");
                if (result.Succeeded)
                {
                    await userManager.AddToRoleAsync(recruiterUser, "Employer");
                }
            }

            var employerProfile = await context.Employers.FirstOrDefaultAsync(e => e.UserId == recruiterUser.Id);
            if (employerProfile == null)
            {
                employerProfile = new Employer
                {
                    UserId = recruiterUser.Id,
                    FullName = "Lê Thị Tuyển Dụng",
                    Position = "Lead Technical Talent Acquisition",
                    Phone = "0987654321",
                    CompanyId = fptCompany.Id,
                    Company = fptCompany
                };
                await context.Employers.AddAsync(employerProfile);
                await context.SaveChangesAsync();
            }

            var vngRecruiterEmail = "recruiter@vng.com.vn";
            var vngRecruiterUser = await userManager.FindByEmailAsync(vngRecruiterEmail);
            if (vngRecruiterUser == null)
            {
                vngRecruiterUser = new AppUser
                {
                    Id = Guid.NewGuid(),
                    UserName = vngRecruiterEmail,
                    Email = vngRecruiterEmail,
                    EmailConfirmed = true,
                    CreatedAt = DateTimeOffset.UtcNow,
                    UpdatedAt = DateTimeOffset.UtcNow
                };
                var vngResult = await userManager.CreateAsync(vngRecruiterUser, "Recruiter@123456");
                if (vngResult.Succeeded)
                {
                    await userManager.AddToRoleAsync(vngRecruiterUser, "Employer");
                }

                var vngEmployer = new Employer
                {
                    UserId = vngRecruiterUser.Id,
                    FullName = "Nguyễn Hoàng Nam",
                    Position = "Engineering Recruitment Lead",
                    Phone = "0918765432",
                    CompanyId = vngCompany.Id,
                    Company = vngCompany
                };
                await context.Employers.AddAsync(vngEmployer);
                await context.SaveChangesAsync();
            }

            // -----------------------------------------------------------------
            // 3. Lookups for References (Categories, Levels, Types, Locations, Skills)
            // -----------------------------------------------------------------
            var backendCategory = await context.JobCategories.FirstOrDefaultAsync(c => c.Name.Contains("Lập trình Backend"))
                ?? await context.JobCategories.FirstOrDefaultAsync(c => c.Name.Contains("Công nghệ thông tin"));
            var frontendCategory = await context.JobCategories.FirstOrDefaultAsync(c => c.Name.Contains("Lập trình Frontend")) ?? backendCategory;
            var fullstackCategory = await context.JobCategories.FirstOrDefaultAsync(c => c.Name.Contains("Lập trình Fullstack")) ?? backendCategory;
            var mobileCategory = await context.JobCategories.FirstOrDefaultAsync(c => c.Name.Contains("Lập trình Di động")) ?? backendCategory;
            var devopsCategory = await context.JobCategories.FirstOrDefaultAsync(c => c.Name.Contains("DevOps")) ?? backendCategory;
            var aiCategory = await context.JobCategories.FirstOrDefaultAsync(c => c.Name.Contains("Trí tuệ nhân tạo")) ?? backendCategory;
            var qaCategory = await context.JobCategories.FirstOrDefaultAsync(c => c.Name.Contains("Kiểm thử")) ?? backendCategory;
            var pmCategory = await context.JobCategories.FirstOrDefaultAsync(c => c.Name.Contains("Quản lý dự án")) ?? backendCategory;
            var designCategory = await context.JobCategories.FirstOrDefaultAsync(c => c.Name.Contains("Thiết kế UI"))
                ?? await context.JobCategories.FirstOrDefaultAsync(c => c.Name.Contains("Thiết kế")) ?? backendCategory;

            var internLevel = await context.JobLevels.FirstOrDefaultAsync(l => l.Name.Contains("Intern"));
            var middleLevel = await context.JobLevels.FirstOrDefaultAsync(l => l.Name.Contains("Middle"));
            var seniorLevel = await context.JobLevels.FirstOrDefaultAsync(l => l.Name.Contains("Senior"));
            var managerLevel = await context.JobLevels.FirstOrDefaultAsync(l => l.Name.Contains("Manager"));

            var fullTime = await context.EmploymentTypes.FirstOrDefaultAsync(t => t.Name.Contains("Full-time"));
            var remote = await context.EmploymentTypes.FirstOrDefaultAsync(t => t.Name.Contains("Remote"));
            var hybrid = await context.EmploymentTypes.FirstOrDefaultAsync(t => t.Name.Contains("Hybrid"));

            var hanoiLoc = await context.Locations.FirstOrDefaultAsync(l => l.Name == "Hà Nội");
            var hcmLoc = await context.Locations.FirstOrDefaultAsync(l => l.Name.Contains("Hồ Chí Minh"));
            var danangLoc = await context.Locations.FirstOrDefaultAsync(l => l.Name.Contains("Đà Nẵng"));
            var remoteLoc = await context.Locations.FirstOrDefaultAsync(l => l.Name.Contains("Toàn quốc") || l.Name.Contains("từ xa")) ?? hanoiLoc;

            var csharpSkill = await context.Skills.FirstOrDefaultAsync(s => s.Name == "C#");
            var dotnetSkill = await context.Skills.FirstOrDefaultAsync(s => s.Name.Contains(".NET"));
            var pgSkill = await context.Skills.FirstOrDefaultAsync(s => s.Name == "PostgreSQL");
            var dockerSkill = await context.Skills.FirstOrDefaultAsync(s => s.Name == "Docker");
            var gitSkill = await context.Skills.FirstOrDefaultAsync(s => s.Name.Contains("Git"));
            var awsSkill = await context.Skills.FirstOrDefaultAsync(s => s.Name.Contains("AWS"));
            var reactSkill = await context.Skills.FirstOrDefaultAsync(s => s.Name.Contains("React"));
            var tsSkill = await context.Skills.FirstOrDefaultAsync(s => s.Name.Contains("TypeScript"));
            var sqlServerSkill = await context.Skills.FirstOrDefaultAsync(s => s.Name.Contains("SQL Server"));
            var k8sSkill = await context.Skills.FirstOrDefaultAsync(s => s.Name == "Kubernetes");
            var pythonSkill = await context.Skills.FirstOrDefaultAsync(s => s.Name == "Python");
            var golangSkill = await context.Skills.FirstOrDefaultAsync(s => s.Name == "Golang");
            var flutterSkill = await context.Skills.FirstOrDefaultAsync(s => s.Name == "Flutter");
            var reactNativeSkill = await context.Skills.FirstOrDefaultAsync(s => s.Name == "React Native");
            var redisSkill = await context.Skills.FirstOrDefaultAsync(s => s.Name == "Redis");
            var figmaSkill = await context.Skills.FirstOrDefaultAsync(s => s.Name == "Figma");
            var agileSkill = await context.Skills.FirstOrDefaultAsync(s => s.Name.Contains("Agile"));
            var cicdSkill = await context.Skills.FirstOrDefaultAsync(s => s.Name.Contains("CI / CD"));
            var mlSkill = await context.Skills.FirstOrDefaultAsync(s => s.Name.Contains("Machine Learning"));

            // -----------------------------------------------------------------
            // 4. Jobs Seeding (10 Jobs)
            // -----------------------------------------------------------------
            var job1 = await context.Jobs.FirstOrDefaultAsync(j => j.Title == "Senior .NET Backend Developer");
            if (job1 == null)
            {
                job1 = new Job
                {
                    CompanyId = fptCompany.Id,
                    PostedById = recruiterUser.Id,
                    Title = "Senior .NET Backend Developer",
                    Description = "FPT Software đang tìm kiếm các kỹ sư Senior .NET Backend tài năng gia nhập đội ngũ phát triển các giải pháp phần mềm chuyển đổi số quy mô lớn cho khách hàng toàn cầu.\n\nTrách nhiệm chính:\n- Tham gia thiết kế, phát triển và bảo trì các hệ thống backend microservices sử dụng .NET 8 / C#.\n- Thiết kế kiến trúc cơ sở dữ liệu quan hệ (PostgreSQL) và tối ưu hóa truy vấn hiệu năng cao.\n- Tích hợp các hệ thống message broker (RabbitMQ/Kafka) và bộ nhớ đệm (Redis).\n- Triển khai ứng dụng containerized qua Docker và phối hợp CI/CD với đội ngũ DevOps.",
                    Requirements = "- Tối thiểu 3 - 5 năm kinh nghiệm phát triển phần mềm với .NET Core / .NET 8 và C#.\n- Thành thạo Entity Framework Core, LINQ, và thiết kế RESTful Web API chuẩn RFC.\n- Kinh nghiệm vững chắc với PostgreSQL hoặc các RDBMS khác, hiểu sâu về Indexing và Transaction.\n- Có kinh nghiệm làm việc với Docker và Git.\n- Ưu tiên ứng viên có hiểu biết về Cloud (AWS/Azure) hoặc kiến trúc Microservices.",
                    Benefits = "- Thu nhập cạnh tranh từ 25 - 42 triệu/tháng + tháng lương 13 và thưởng dự án.\n- Chế độ bảo hiểm sức khỏe toàn diện FPT Care cho bản thân và gia đình.\n- Môi trường làm việc năng động, hybrid linh hoạt và cơ hội onsite nước ngoài.",
                    CategoryId = backendCategory?.Id,
                    LevelId = seniorLevel?.Id,
                    EmploymentTypeId = fullTime?.Id,
                    LocationId = hanoiLoc?.Id,
                    SalaryMin = 25000000,
                    SalaryMax = 42000000,
                    SalaryCurrency = "VND",
                    ExperienceYearsMin = 3,
                    ExperienceYearsMax = 5,
                    Deadline = DateTime.UtcNow.AddMonths(2),
                    PositionsCount = 3,
                    ApprovalStatus = JobApprovalStatus.Approved,
                    IsActive = true,
                    IsExpired = false,
                    ViewCount = 185
                };
                await context.Jobs.AddAsync(job1);
                await context.SaveChangesAsync();

                if (csharpSkill != null) await context.JobSkills.AddAsync(new JobSkill { JobId = job1.Id, SkillId = csharpSkill.Id, IsRequired = true });
                if (dotnetSkill != null) await context.JobSkills.AddAsync(new JobSkill { JobId = job1.Id, SkillId = dotnetSkill.Id, IsRequired = true });
                if (pgSkill != null) await context.JobSkills.AddAsync(new JobSkill { JobId = job1.Id, SkillId = pgSkill.Id, IsRequired = true });
                if (dockerSkill != null) await context.JobSkills.AddAsync(new JobSkill { JobId = job1.Id, SkillId = dockerSkill.Id, IsRequired = true });
                if (awsSkill != null) await context.JobSkills.AddAsync(new JobSkill { JobId = job1.Id, SkillId = awsSkill.Id, IsRequired = false });
                await context.SaveChangesAsync();
            }

            var job2 = await context.Jobs.FirstOrDefaultAsync(j => j.Title == "Frontend React / TypeScript Engineer");
            if (job2 == null)
            {
                job2 = new Job
                {
                    CompanyId = vngCompany.Id,
                    PostedById = recruiterUser.Id,
                    Title = "Frontend React / TypeScript Engineer",
                    Description = "VNG Corporation tìm kiếm Frontend Engineer tài năng xây dựng giao diện ứng dụng web trải nghiệm mượt mà, phục vụ hàng triệu người dùng.\n\nTrách nhiệm chính:\n- Xây dựng giao diện Single Page Application hiện đại với React, TypeScript và Tailwind CSS.\n- Tối ưu hóa hiệu năng render, Web Vitals và trải nghiệm người dùng responsive.",
                    Requirements = "- Tối thiểu 2 năm kinh nghiệm với React, TypeScript và HTML5/CSS3.\n- Sử dụng thành thạo Git và làm việc với RESTful API.",
                    Benefits = "- Mức lương 18 - 30 triệu/tháng + thưởng hiệu quả kinh doanh.\n- Ăn trưa miễn phí tại công ty, phòng gym và khu vui chơi giải trí.",
                    CategoryId = frontendCategory?.Id,
                    LevelId = middleLevel?.Id,
                    EmploymentTypeId = fullTime?.Id,
                    LocationId = hcmLoc?.Id,
                    SalaryMin = 18000000,
                    SalaryMax = 30000000,
                    SalaryCurrency = "VND",
                    ExperienceYearsMin = 2,
                    ExperienceYearsMax = 4,
                    Deadline = DateTime.UtcNow.AddMonths(1),
                    PositionsCount = 2,
                    ApprovalStatus = JobApprovalStatus.Approved,
                    IsActive = true,
                    IsExpired = false,
                    ViewCount = 112
                };
                await context.Jobs.AddAsync(job2);
                await context.SaveChangesAsync();

                if (reactSkill != null) await context.JobSkills.AddAsync(new JobSkill { JobId = job2.Id, SkillId = reactSkill.Id, IsRequired = true });
                if (tsSkill != null) await context.JobSkills.AddAsync(new JobSkill { JobId = job2.Id, SkillId = tsSkill.Id, IsRequired = true });
                if (gitSkill != null) await context.JobSkills.AddAsync(new JobSkill { JobId = job2.Id, SkillId = gitSkill.Id, IsRequired = false });
                await context.SaveChangesAsync();
            }

            var job4 = await context.Jobs.FirstOrDefaultAsync(j => j.Title == "Fullstack Developer (.NET 8 & React)");
            if (job4 == null)
            {
                job4 = new Job
                {
                    CompanyId = fptCompany.Id,
                    PostedById = recruiterUser.Id,
                    Title = "Fullstack Developer (.NET 8 & React)",
                    Description = "Phát triển toàn diện giải pháp Enterprise từ Backend API đến Frontend UI cho đối tác quốc tế tại chi nhánh FPT Đà Nẵng.\n\nTrách nhiệm:\n- Xây dựng Web API bằng C# .NET 8 và giao diện tương tác bằng React.\n- Tối ưu hóa truy vấn dữ liệu và tích hợp hệ thống bên thứ ba.",
                    Requirements = "- 2+ năm kinh nghiệm Fullstack với C#, .NET Web API và React/TypeScript.\n- Hiểu biết về cơ sở dữ liệu SQL Server hoặc PostgreSQL.",
                    Benefits = "- Lương 20 - 32 triệu/tháng, phụ cấp ngoại ngữ.\n- Môi trường làm việc ven biển Đà Nẵng hiện đại, văn hóa cởi mở.",
                    CategoryId = fullstackCategory?.Id,
                    LevelId = middleLevel?.Id,
                    EmploymentTypeId = fullTime?.Id,
                    LocationId = danangLoc?.Id,
                    SalaryMin = 20000000,
                    SalaryMax = 32000000,
                    SalaryCurrency = "VND",
                    ExperienceYearsMin = 2,
                    ExperienceYearsMax = 4,
                    Deadline = DateTime.UtcNow.AddMonths(2),
                    PositionsCount = 2,
                    ApprovalStatus = JobApprovalStatus.Approved,
                    IsActive = true,
                    IsExpired = false,
                    ViewCount = 76
                };
                await context.Jobs.AddAsync(job4);
                await context.SaveChangesAsync();

                if (csharpSkill != null) await context.JobSkills.AddAsync(new JobSkill { JobId = job4.Id, SkillId = csharpSkill.Id, IsRequired = true });
                if (dotnetSkill != null) await context.JobSkills.AddAsync(new JobSkill { JobId = job4.Id, SkillId = dotnetSkill.Id, IsRequired = true });
                if (reactSkill != null) await context.JobSkills.AddAsync(new JobSkill { JobId = job4.Id, SkillId = reactSkill.Id, IsRequired = true });
                if (sqlServerSkill != null) await context.JobSkills.AddAsync(new JobSkill { JobId = job4.Id, SkillId = sqlServerSkill.Id, IsRequired = false });
                await context.SaveChangesAsync();
            }

            // -----------------------------------------------------------------
            // 5. Candidates, CVs & Parsed CVs Helper
            // -----------------------------------------------------------------
            var allSkills = await context.Skills.ToListAsync();

            // Candidate 1: Trần Đức Nam (Top 1 Gold Medal Match - Senior .NET & AWS, 5 yrs exp)
            var candNam = await EnsureCandidateAsync(
                context, userManager,
                email: "nam.tranduc@gmail.com",
                fullName: "Trần Đức Nam",
                phone: "0901234567",
                address: "Quận Cầu Giấy, Hà Nội",
                gender: "Nam",
                dob: new DateTime(1997, 4, 15, 0, 0, 0, DateTimeKind.Utc),
                summary: "Kỹ sư Backend Senior 5 năm kinh nghiệm chuyên sâu về .NET 8, C#, PostgreSQL, Microservices và Điện toán đám mây AWS. Đã từng lead đội ngũ 6 kỹ sư xây dựng hệ thống Core Banking và cổng thanh toán.",
                desiredPosition: "Senior .NET Backend Developer",
                desiredSalaryMin: 30000000,
                desiredSalaryMax: 38000000,
                educations: new[] {
                    new CvEducationDto("Đại học Bách Khoa Hà Nội", "Kỹ sư", "Công nghệ Thông tin", 2015, 2020, "Tốt nghiệp loại Giỏi, GPA 3.6/4.0")
                },
                experiences: new[] {
                    new CvExperienceDto("Techcombank", "Senior Backend Engineer", new DateOnly(2022, 1, 1), null, true, "Thiết kế và phát triển Microservices .NET 8, PostgreSQL, RabbitMQ, Docker và AWS EKS cho hệ thống giao dịch trực tuyến."),
                    new CvExperienceDto("FPT Information System", "Software Engineer", new DateOnly(2020, 3, 1), new DateOnly(2021, 12, 31), false, "Xây dựng các giải pháp ERP và Web API cho khách hàng tài chính.")
                },
                skillNames: new[] { "C#", ".NET", "PostgreSQL", "Docker", "AWS", "Kubernetes", "Redis", "RabbitMQ", "Git" },
                allSkills: allSkills
            );

            // Candidate 2: Nguyễn Văn A (Top 2 Silver Medal Match - 4 yrs exp Viettel)
            var candA = await EnsureCandidateAsync(
                context, userManager,
                email: "nguyenvana@gmail.com",
                fullName: "Nguyễn Văn A",
                phone: "0912345678",
                address: "Quận Cầu Giấy, Hà Nội",
                gender: "Nam",
                dob: new DateTime(1998, 5, 20, 0, 0, 0, DateTimeKind.Utc),
                summary: "Kỹ sư phần mềm 4+ năm kinh nghiệm phát triển backend phân tán bằng .NET Core, C# và PostgreSQL. Nắm vững Clean Architecture, Docker CI/CD và tối ưu hóa truy vấn CSDL.",
                desiredPosition: "Senior .NET Backend Developer",
                desiredSalaryMin: 25000000,
                desiredSalaryMax: 35000000,
                educations: new[] {
                    new CvEducationDto("Đại học Bách Khoa Hà Nội", "Kỹ sư", "Công nghệ Phần mềm", 2016, 2021, "Tốt nghiệp loại Giỏi")
                },
                experiences: new[] {
                    new CvExperienceDto("Tập đoàn Viettel", "Backend Software Engineer", new DateOnly(2021, 8, 1), new DateOnly(2024, 8, 31), false, "Phát triển và bảo trì hệ thống microservices .NET 8, PostgreSQL phục vụ hàng triệu người dùng.")
                },
                skillNames: new[] { "C#", ".NET", "PostgreSQL", "Docker", "Git", "Redis" },
                allSkills: allSkills
            );

            // Candidate 3: Hoàng Minh Tuấn (Top 3 Bronze Medal Match - 3 yrs exp .NET & SQL Server)
            var candTuan = await EnsureCandidateAsync(
                context, userManager,
                email: "tuan.hoangminh@gmail.com",
                fullName: "Hoàng Minh Tuấn",
                phone: "0934567890",
                address: "Quận Ba Đình, Hà Nội",
                gender: "Nam",
                dob: new DateTime(1999, 8, 12, 0, 0, 0, DateTimeKind.Utc),
                summary: "Lập trình viên Backend 3 năm kinh nghiệm với C#, ASP.NET Core, SQL Server và Docker. Đam mê thiết kế RESTful API chuẩn và tối ưu hóa hệ thống backend.",
                desiredPosition: ".NET Backend Developer",
                desiredSalaryMin: 24000000,
                desiredSalaryMax: 30000000,
                educations: new[] {
                    new CvEducationDto("Đại học Công nghệ - ĐHQGHN", "Cử nhân", "Công nghệ Thông tin", 2017, 2021, "Tốt nghiệp Khá")
                },
                experiences: new[] {
                    new CvExperienceDto("MISA JSC", "Backend Developer", new DateOnly(2021, 9, 1), null, true, "Xây dựng các module kế toán đám mây sử dụng .NET Core và SQL Server, triển khai Docker.")
                },
                skillNames: new[] { "C#", ".NET", "SQL Server", "Docker", "Git", "Redis" },
                allSkills: allSkills
            );

            // Candidate 4: Phạm Thanh Hải (Moderate Match - 2.5 yrs exp, lacks Docker/PostgreSQL)
            var candHai = await EnsureCandidateAsync(
                context, userManager,
                email: "hai.phamthanh@gmail.com",
                fullName: "Phạm Thanh Hải",
                phone: "0945678901",
                address: "Quận Thanh Xuân, Hà Nội",
                gender: "Nam",
                dob: new DateTime(2000, 2, 28, 0, 0, 0, DateTimeKind.Utc),
                summary: "Backend Developer 2.5 năm kinh nghiệm làm việc với C# và .NET Web API, cơ sở dữ liệu MySQL và Git. Đang tìm kiếm cơ hội nâng cao kỹ năng Microservices và Cloud.",
                desiredPosition: ".NET Backend Developer",
                desiredSalaryMin: 20000000,
                desiredSalaryMax: 25000000,
                educations: new[] {
                    new CvEducationDto("Học viện Công nghệ Bưu chính Viễn thông", "Kỹ sư", "Công nghệ Thông tin", 2018, 2022, "Tốt nghiệp Khá")
                },
                experiences: new[] {
                    new CvExperienceDto("SmartOSC", "Junior Backend Developer", new DateOnly(2022, 6, 1), null, true, "Phát triển API thương mại điện tử bằng ASP.NET Core và MySQL.")
                },
                skillNames: new[] { "C#", ".NET", "Git" },
                allSkills: allSkills
            );

            // Candidate 5: Trần Thị B (Junior / Fresher - 0.5 yr exp)
            var candB = await EnsureCandidateAsync(
                context, userManager,
                email: "tranthib@gmail.com",
                fullName: "Trần Thị B",
                phone: "0923456789",
                address: "Quận Đống Đa, Hà Nội",
                gender: "Nữ",
                dob: new DateTime(2002, 11, 10, 0, 0, 0, DateTimeKind.Utc),
                summary: "Sinh viên mới tốt nghiệp ngành CNTT Đại học Quốc gia Hà Nội. Đã có 6 tháng thực tập lập trình C# .NET và làm đồ án tốt nghiệp ứng dụng web.",
                desiredPosition: "Junior Software Developer",
                desiredSalaryMin: 10000000,
                desiredSalaryMax: 15000000,
                educations: new[] {
                    new CvEducationDto("Đại học Quốc gia Hà Nội", "Cử nhân", "Khoa học Máy tính", 2020, 2024, "Tốt nghiệp loại Giỏi")
                },
                experiences: new[] {
                    new CvExperienceDto("VTI Software", "Intern .NET Developer", new DateOnly(2024, 1, 1), new DateOnly(2024, 6, 30), false, "Hỗ trợ viết Unit Test và bảo trì API nhỏ sử dụng C# .NET.")
                },
                skillNames: new[] { "C#", "Git" },
                allSkills: allSkills
            );

            // Candidate 6: Lê Quốc Bảo (Frontend Mismatch for Job 1, Perfect Top 1 for Job 2)
            var candBao = await EnsureCandidateAsync(
                context, userManager,
                email: "bao.lequoc@gmail.com",
                fullName: "Lê Quốc Bảo",
                phone: "0956789012",
                address: "Quận Cầu Giấy, Hà Nội",
                gender: "Nam",
                dob: new DateTime(1998, 9, 5, 0, 0, 0, DateTimeKind.Utc),
                summary: "Lead Frontend Engineer với 3.5 năm kinh nghiệm chuyên sâu về React 19, TypeScript, Tailwind CSS, Next.js và Redux Toolkit. Tối ưu hiệu năng Web Vitals và thiết kế UI/UX xuất sắc.",
                desiredPosition: "Frontend React / TypeScript Engineer",
                desiredSalaryMin: 22000000,
                desiredSalaryMax: 28000000,
                educations: new[] {
                    new CvEducationDto("Đại học Bách Khoa Hà Nội", "Cử nhân", "Công nghệ Thông tin", 2016, 2020, "Tốt nghiệp loại Giỏi")
                },
                experiences: new[] {
                    new CvExperienceDto("Sendo", "Senior Frontend Developer", new DateOnly(2021, 3, 1), null, true, "Xây dựng Single Page Application thương mại điện tử bằng React, TypeScript và Tailwind CSS.")
                },
                skillNames: new[] { "React", "TypeScript", "Git", "Figma" },
                allSkills: allSkills
            );

            // Candidate 7: Đặng Quang Huy (Tech Lead - Over-budget case: 60M expected vs 42M max)
            var candHuyDang = await EnsureCandidateAsync(
                context, userManager,
                email: "huy.dangquang@gmail.com",
                fullName: "Đặng Quang Huy",
                phone: "0967890123",
                address: "Quận Tây Hồ, Hà Nội",
                gender: "Nam",
                dob: new DateTime(1994, 12, 1, 0, 0, 0, DateTimeKind.Utc),
                summary: "Principal / Lead Backend Architect với 7+ năm kinh nghiệm thiết kế kiến trúc phân tán lớn, chịu tải hàng trăm ngàn RPS trên nền tảng .NET Core, AWS, Kubernetes và PostgreSQL.",
                desiredPosition: "Technical Lead / Solution Architect",
                desiredSalaryMin: 55000000,
                desiredSalaryMax: 65000000,
                educations: new[] {
                    new CvEducationDto("Đại học Bách Khoa Hà Nội", "Thạc sĩ", "Hệ thống Thông tin", 2012, 2018, "Tốt nghiệp Xuất sắc")
                },
                experiences: new[] {
                    new CvExperienceDto("MoMo", "Backend Technical Lead", new DateOnly(2020, 1, 1), null, true, "Thiết kế kiến trúc Core Payment Microservices bằng .NET 8, PostgreSQL, AWS và Kafka.")
                },
                skillNames: new[] { "C#", ".NET", "PostgreSQL", "Docker", "AWS", "Kubernetes", "Redis", "CI / CD", "Git" },
                allSkills: allSkills
            );

            // Candidate 8: Vũ Thu Trang (Location Mismatch - TP.HCM based vs Hanoi Onsite)
            var candTrang = await EnsureCandidateAsync(
                context, userManager,
                email: "trang.vuthu@gmail.com",
                fullName: "Vũ Thu Trang",
                phone: "0978901234",
                address: "Quận 1, TP. Hồ Chí Minh",
                gender: "Nữ",
                dob: new DateTime(1999, 3, 14, 0, 0, 0, DateTimeKind.Utc),
                summary: "Backend Software Engineer 3 năm kinh nghiệm với C# .NET Core và PostgreSQL tại TP. Hồ Chí Minh. Có tinh thần trách nhiệm cao và khả năng làm việc độc lập tốt.",
                desiredPosition: ".NET Backend Developer",
                desiredSalaryMin: 22000000,
                desiredSalaryMax: 28000000,
                educations: new[] {
                    new CvEducationDto("Đại học Khoa học Tự nhiên TP.HCM", "Cử nhân", "Công nghệ Thông tin", 2017, 2021, "Tốt nghiệp loại Giỏi")
                },
                experiences: new[] {
                    new CvExperienceDto("ZaloPay", "Backend Developer", new DateOnly(2021, 7, 1), null, true, "Xây dựng các API thanh toán và quản lý người dùng với .NET Core và PostgreSQL.")
                },
                skillNames: new[] { "C#", ".NET", "PostgreSQL", "Git" },
                allSkills: allSkills
            );

            // Candidate 9: Ngô Gia Huy (Offer Stage - 4.5 yrs exp, 91% match)
            var candHuyNgo = await EnsureCandidateAsync(
                context, userManager,
                email: "huy.ngogia@gmail.com",
                fullName: "Ngô Gia Huy",
                phone: "0989012345",
                address: "Quận Nam Từ Liêm, Hà Nội",
                gender: "Nam",
                dob: new DateTime(1996, 7, 22, 0, 0, 0, DateTimeKind.Utc),
                summary: "Senior Backend Developer 4.5 năm kinh nghiệm. Nắm vững .NET Core, Clean Architecture, Docker, PostgreSQL và bảo mật API chuẩn OAuth2/JWT.",
                desiredPosition: "Senior .NET Developer",
                desiredSalaryMin: 32000000,
                desiredSalaryMax: 40000000,
                educations: new[] {
                    new CvEducationDto("Đại học FPT", "Kỹ sư", "Kỹ thuật Phần mềm", 2015, 2019, "Tốt nghiệp loại Giỏi")
                },
                experiences: new[] {
                    new CvExperienceDto("One Mount Group", "Senior Software Engineer", new DateOnly(2021, 1, 1), null, true, "Phát triển giải pháp bán lẻ công nghệ cao với .NET 8, PostgreSQL và Docker.")
                },
                skillNames: new[] { "C#", ".NET", "PostgreSQL", "Docker", "Git", "Redis" },
                allSkills: allSkills
            );

            // Candidate 10: Bùi Phương Mai (Hired Stage - 5 yrs exp, 95% match)
            var candMaiBui = await EnsureCandidateAsync(
                context, userManager,
                email: "mai.buiphuong@gmail.com",
                fullName: "Bùi Phương Mai",
                phone: "0990123456",
                address: "Quận Hoàn Kiếm, Hà Nội",
                gender: "Nữ",
                dob: new DateTime(1996, 10, 8, 0, 0, 0, DateTimeKind.Utc),
                summary: "Senior Cloud & .NET Engineer với 5 năm kinh nghiệm thực chiến phát triển giải pháp SaaS quy mô toàn cầu với C#, .NET 8, PostgreSQL, Docker và AWS.",
                desiredPosition: "Senior .NET Backend Developer",
                desiredSalaryMin: 35000000,
                desiredSalaryMax: 42000000,
                educations: new[] {
                    new CvEducationDto("Đại học Bách Khoa Hà Nội", "Kỹ sư", "Hệ thống Thông tin", 2014, 2019, "Tốt nghiệp loại Giỏi")
                },
                experiences: new[] {
                    new CvExperienceDto("LINE Technology Vietnam", "Senior Backend Engineer", new DateOnly(2020, 2, 1), new DateOnly(2024, 10, 31), false, "Phát triển dịch vụ cloud backend độ tin cậy cao trên nền tảng AWS và .NET.")
                },
                skillNames: new[] { "C#", ".NET", "PostgreSQL", "Docker", "AWS", "Git" },
                allSkills: allSkills
            );

            // Candidate 11: Nguyễn Thị Mai (Junior Frontend - 70% match for Job 2)
            var candMaiNguyen = await EnsureCandidateAsync(
                context, userManager,
                email: "mai.nguyenthi@gmail.com",
                fullName: "Nguyễn Thị Mai",
                phone: "0911223344",
                address: "Quận Bình Thạnh, TP. Hồ Chí Minh",
                gender: "Nữ",
                dob: new DateTime(2001, 6, 18, 0, 0, 0, DateTimeKind.Utc),
                summary: "Frontend Developer 1.5 năm kinh nghiệm với React, JavaScript và CSS3. Có khả năng chuyển đổi thiết kế Figma thành giao diện web pixel-perfect.",
                desiredPosition: "Junior Frontend Developer",
                desiredSalaryMin: 14000000,
                desiredSalaryMax: 18000000,
                educations: new[] {
                    new CvEducationDto("Đại học FPT TP.HCM", "Cử nhân", "Kỹ thuật Phần mềm", 2019, 2023, "Tốt nghiệp Khá")
                },
                experiences: new[] {
                    new CvExperienceDto("Tiki", "Junior Frontend Developer", new DateOnly(2023, 7, 1), null, true, "Xây dựng các landing page sự kiện và component React cho ứng dụng web Tiki.")
                },
                skillNames: new[] { "React", "Git", "Figma" },
                allSkills: allSkills
            );

            // Candidate 12: Đinh Khắc Cường (Fullstack .NET & React - 92% match for Job 4)
            var candCuong = await EnsureCandidateAsync(
                context, userManager,
                email: "cuong.dinhkhac@gmail.com",
                fullName: "Đinh Khắc Cường",
                phone: "0922334455",
                address: "Quận Hải Châu, Đà Nẵng",
                gender: "Nam",
                dob: new DateTime(1997, 1, 25, 0, 0, 0, DateTimeKind.Utc),
                summary: "Fullstack Web Developer 3.5 năm kinh nghiệm làm việc cả Backend C# .NET Web API và Frontend React/TypeScript. Đã xây dựng nhiều hệ thống CRM và Quản lý bán hàng trọn gói.",
                desiredPosition: "Fullstack Developer (.NET & React)",
                desiredSalaryMin: 24000000,
                desiredSalaryMax: 32000000,
                educations: new[] {
                    new CvEducationDto("Đại học Bách Khoa - Đại học Đà Nẵng", "Kỹ sư", "Công nghệ Thông tin", 2015, 2020, "Tốt nghiệp loại Giỏi")
                },
                experiences: new[] {
                    new CvExperienceDto("Enclave", "Fullstack Engineer", new DateOnly(2021, 2, 1), null, true, "Phát triển end-to-end các module ứng dụng doanh nghiệp với C# .NET và React.")
                },
                skillNames: new[] { "C#", ".NET", "React", "TypeScript", "SQL Server", "Git" },
                allSkills: allSkills
            );

            // -----------------------------------------------------------------
            // 6. Job Applications Seeding (Covering Multiple Edge Cases)
            // -----------------------------------------------------------------

            // === JOB 1: Senior .NET Backend Developer (FPT Software) ===
            // Case 1.1: 🥇 Gold Medal - Trần Đức Nam (Match 94%, Top 1, Interview)
            await EnsureApplicationAsync(
                context, candNam, job1,
                status: ApplicationStatus.Interview,
                matchScore: 94,
                matchedSkills: new[] { "C#", ".NET", "PostgreSQL", "Docker", "AWS" },
                missingSkills: Array.Empty<string>(),
                rating: 5,
                evaluationLabel: "Ứng viên xuất sắc (Top 1)",
                privateNotes: "Vượt qua vòng 1 thuật toán và kiến trúc microservices với điểm tuyệt đối. Phỏng vấn vòng 2 cùng CTO vào thứ Ba tới.",
                coverLetter: "Kính gửi quý công ty FPT Software, tôi có 5 năm kinh nghiệm sâu sắc về kiến trúc microservices .NET 8, PostgreSQL và AWS. Tôi rất tự tin có thể đóng góp hiệu quả vào các dự án chuyển đổi số lớn của FPT.",
                appliedDaysAgo: 5,
                recruiterUserId: recruiterUser.Id
            );

            // Case 1.2: 🥈 Silver Medal - Nguyễn Văn A (Match 88%, Top 2, Screening)
            await EnsureApplicationAsync(
                context, candA, job1,
                status: ApplicationStatus.Screening,
                matchScore: 88,
                matchedSkills: new[] { "C#", ".NET", "PostgreSQL", "Docker" },
                missingSkills: new[] { "AWS" },
                rating: 4,
                evaluationLabel: "Hồ sơ sáng giá (Top 2)",
                privateNotes: "Kinh nghiệm Viettel rất vững chắc. Cần trao đổi thêm để đánh giá mức độ tiếp thu và làm quen với Cloud AWS.",
                coverLetter: "Với 4 năm kinh nghiệm phát triển backend bằng .NET và PostgreSQL tại Viettel, tôi mong muốn được tham gia đội ngũ kỹ sư hàng đầu của FPT Software.",
                appliedDaysAgo: 4,
                recruiterUserId: recruiterUser.Id
            );

            // Case 1.3: 🥉 Bronze Medal - Hoàng Minh Tuấn (Match 78%, Top 3, Applied)
            await EnsureApplicationAsync(
                context, candTuan, job1,
                status: ApplicationStatus.Applied,
                matchScore: 78,
                matchedSkills: new[] { "C#", ".NET", "Docker" },
                missingSkills: new[] { "PostgreSQL", "AWS" },
                rating: 4,
                evaluationLabel: "Tiềm năng (Top 3)",
                privateNotes: "Cần kiểm tra kỹ năng cơ sở dữ liệu PostgreSQL vì kinh nghiệm chính của ứng viên là SQL Server.",
                coverLetter: "Tôi có 3 năm kinh nghiệm lập trình backend C# và Docker tại MISA, rất quan tâm và mong muốn thử sức tại FPT Software.",
                appliedDaysAgo: 3,
                recruiterUserId: recruiterUser.Id
            );

            // Case 1.4: Phạm Thanh Hải (Match 65%, Moderate, Applied)
            await EnsureApplicationAsync(
                context, candHai, job1,
                status: ApplicationStatus.Applied,
                matchScore: 65,
                matchedSkills: new[] { "C#", ".NET" },
                missingSkills: new[] { "PostgreSQL", "Docker", "AWS" },
                rating: 3,
                evaluationLabel: "Xem xét thêm",
                privateNotes: "Thiếu kinh nghiệm Docker và PostgreSQL, chỉ có kinh nghiệm MySQL cơ bản. Cân nhắc nếu mở rộng vị trí Mid-level.",
                coverLetter: "Tôi xin ứng tuyển vị trí .NET Developer tại FPT với mong muốn đóng góp kỹ năng lập trình API và phát triển bản thân.",
                appliedDaysAgo: 6,
                recruiterUserId: recruiterUser.Id
            );

            // Case 1.5: Trần Thị B (Match 45%, Junior / Under-experienced, Applied)
            await EnsureApplicationAsync(
                context, candB, job1,
                status: ApplicationStatus.Applied,
                matchScore: 45,
                matchedSkills: new[] { "C#" },
                missingSkills: new[] { ".NET", "PostgreSQL", "Docker", "AWS" },
                rating: 2,
                evaluationLabel: "Chưa đủ kinh nghiệm Senior",
                privateNotes: "Ứng viên là sinh viên mới tốt nghiệp, kỹ năng tốt so với mặt bằng Fresher nhưng chưa phù hợp cho vị trí Senior 3-5 năm. Có thể chuyển sang chương trình Fresher FPT.",
                coverLetter: "Em mới tốt nghiệp loại Giỏi ngành CNTT và đã có đồ án tốt nghiệp về C#. Rất mong có cơ hội thực tập hoặc thử việc tại FPT.",
                appliedDaysAgo: 7,
                recruiterUserId: recruiterUser.Id
            );

            // Case 1.6: Lê Quốc Bảo (Match 21%, Tech Stack Mismatch, Rejected)
            await EnsureApplicationAsync(
                context, candBao, job1,
                status: ApplicationStatus.Rejected,
                matchScore: 21,
                matchedSkills: Array.Empty<string>(),
                missingSkills: new[] { "C#", ".NET", "PostgreSQL", "Docker", "AWS" },
                rating: 1,
                evaluationLabel: "Trái chuyên môn (Frontend)",
                privateNotes: "Ứng viên chuyên sâu về React/Frontend, hoàn toàn không có kinh nghiệm .NET Backend. Đã gửi email từ chối lịch sự và giới thiệu ứng tuyển sang vị trí Frontend.",
                coverLetter: "Tôi ứng tuyển với mong muốn thử sức ở các mảng công nghệ mới tại FPT Software.",
                appliedDaysAgo: 8,
                recruiterUserId: recruiterUser.Id
            );

            // Case 1.7: Đặng Quang Huy (Match 82%, High Match but Over-budget, Screening)
            await EnsureApplicationAsync(
                context, candHuyDang, job1,
                status: ApplicationStatus.Screening,
                matchScore: 82,
                matchedSkills: new[] { "C#", ".NET", "PostgreSQL", "Docker", "AWS" },
                missingSkills: Array.Empty<string>(),
                rating: 4,
                evaluationLabel: "Lương vượt ngân sách",
                privateNotes: "Kỹ năng kiến trúc rất mạnh (7 năm Lead). Tuy nhiên mức lương kỳ vọng 60 triệu vượt xa mức trần 42 triệu của vị trí này. Đang hẹn trao đổi để thương lượng hoặc đề xuất vị trí Solution Architect.",
                coverLetter: "Tôi có 7 năm kinh nghiệm dẫn dắt đội ngũ kỹ thuật và thiết kế hệ thống phân tán chịu tải cao. Mong muốn trao đổi về cơ hội hợp tác.",
                appliedDaysAgo: 2,
                recruiterUserId: recruiterUser.Id
            );

            // Case 1.8: Vũ Thu Trang (Match 68%, Location Mismatch, Applied)
            await EnsureApplicationAsync(
                context, candTrang, job1,
                status: ApplicationStatus.Applied,
                matchScore: 68,
                matchedSkills: new[] { "C#", ".NET", "PostgreSQL" },
                missingSkills: new[] { "Docker", "AWS" },
                rating: 3,
                evaluationLabel: "Khác địa điểm làm việc",
                privateNotes: "Ứng viên sinh sống tại TP.HCM trong khi Job yêu cầu Onsite tại Cầu Giấy, Hà Nội. Cần liên hệ hỏi ứng viên có sẵn sàng relocate ra Hà Nội hay không.",
                coverLetter: "Tôi mong muốn ứng tuyển vị trí .NET Backend để tiếp tục phát triển kỹ năng với các dự án lớn.",
                appliedDaysAgo: 5,
                recruiterUserId: recruiterUser.Id
            );

            // Case 1.9: Ngô Gia Huy (Match 91%, Offer Stage)
            await EnsureApplicationAsync(
                context, candHuyNgo, job1,
                status: ApplicationStatus.Offer,
                matchScore: 91,
                matchedSkills: new[] { "C#", ".NET", "PostgreSQL", "Docker" },
                missingSkills: new[] { "AWS" },
                rating: 5,
                evaluationLabel: "Đã gửi Offer",
                privateNotes: "Đã hoàn thành xuất sắc 2 vòng phỏng vấn kỹ thuật và văn hóa. Đã gửi thư mời nhận việc với mức lương 38 triệu/tháng, chờ ứng viên phản hồi trước ngày 15.",
                coverLetter: "Tôi tự tin kinh nghiệm 4.5 năm làm việc với microservices .NET và Clean Architecture sẽ mang lại giá trị tức thì cho dự án của FPT.",
                appliedDaysAgo: 10,
                recruiterUserId: recruiterUser.Id
            );

            // Case 1.10: Bùi Phương Mai (Match 95%, Hired Stage)
            await EnsureApplicationAsync(
                context, candMaiBui, job1,
                status: ApplicationStatus.Hired,
                matchScore: 95,
                matchedSkills: new[] { "C#", ".NET", "PostgreSQL", "Docker", "AWS" },
                missingSkills: Array.Empty<string>(),
                rating: 5,
                evaluationLabel: "Đã nhận việc thành công",
                privateNotes: "Ứng viên đã ký hợp đồng lao động chính thức. Ngày bắt đầu onboard: 01/12/2026 tại Tòa nhà FPT Cầu Giấy.",
                coverLetter: "Tôi có 5 năm làm việc chuyên sâu với .NET 8 và AWS Cloud. Rất vinh dự được gia nhập đội ngũ FPT Software.",
                appliedDaysAgo: 14,
                recruiterUserId: recruiterUser.Id
            );

            // === JOB 2: Frontend React / TypeScript Engineer (VNG Corporation) ===
            // Case 2.1: 🥇 Gold Medal - Lê Quốc Bảo (Match 95%, Top 1 Frontend Lead, Interview)
            await EnsureApplicationAsync(
                context, candBao, job2,
                status: ApplicationStatus.Interview,
                matchScore: 95,
                matchedSkills: new[] { "React", "TypeScript", "Git" },
                missingSkills: Array.Empty<string>(),
                rating: 5,
                evaluationLabel: "Top 1 Frontend Lead",
                privateNotes: "Portfolio dự án React/TypeScript cực kỳ ấn tượng, hiểu sâu về Web Vitals và thiết kế Design System. Hẹn phỏng vấn vòng 1 với Tech Lead VNG.",
                coverLetter: "Tôi theo dõi và rất hâm mộ hệ sinh thái sản phẩm của VNG. Với 3.5 năm kinh nghiệm React và TypeScript, tôi tin sẽ đóng góp lớn cho các sản phẩm web của công ty.",
                appliedDaysAgo: 3,
                recruiterUserId: vngRecruiterUser.Id
            );

            // Case 2.2: Nguyễn Thị Mai (Match 70%, Junior Frontend, Screening)
            await EnsureApplicationAsync(
                context, candMaiNguyen, job2,
                status: ApplicationStatus.Screening,
                matchScore: 70,
                matchedSkills: new[] { "React", "Git" },
                missingSkills: new[] { "TypeScript" },
                rating: 3,
                evaluationLabel: "Junior Frontend tiềm năng",
                privateNotes: "Kỹ năng React tốt, khả năng cắt HTML/CSS chuẩn. Cần làm bài test về TypeScript và State Management.",
                coverLetter: "Tôi có 1.5 năm kinh nghiệm làm React tại Tiki, mong muốn được gia nhập VNG để học hỏi và phát triển chuyên môn.",
                appliedDaysAgo: 2,
                recruiterUserId: vngRecruiterUser.Id
            );

            // Case 2.3: Trần Đức Nam (Match 25%, Backend applying for Frontend, Rejected)
            await EnsureApplicationAsync(
                context, candNam, job2,
                status: ApplicationStatus.Rejected,
                matchScore: 25,
                matchedSkills: new[] { "Git" },
                missingSkills: new[] { "React", "TypeScript" },
                rating: 1,
                evaluationLabel: "Trái chuyên môn",
                privateNotes: "Ứng viên chuyên sâu Backend .NET, thiếu kinh nghiệm chuyên sâu về React/Frontend. Đã lưu hồ sơ cho các vị trí Backend tại VNG.",
                coverLetter: "Tôi nộp hồ sơ tìm hiểu thêm về các vị trí kỹ thuật tại VNG Corporation.",
                appliedDaysAgo: 5,
                recruiterUserId: vngRecruiterUser.Id
            );

            // === JOB 4: Fullstack Developer (.NET 8 & React) (FPT Software Đà Nẵng) ===
            // Case 4.1: Đinh Khắc Cường (Match 92%, Fullstack vững, Interview)
            await EnsureApplicationAsync(
                context, candCuong, job4,
                status: ApplicationStatus.Interview,
                matchScore: 92,
                matchedSkills: new[] { "C#", ".NET", "React", "SQL Server" },
                missingSkills: Array.Empty<string>(),
                rating: 5,
                evaluationLabel: "Fullstack vững vàng",
                privateNotes: "3.5 năm làm fullstack cả .NET Web API và React SPA tại Đà Nẵng, rất phù hợp với tiêu chí tuyển dụng của chi nhánh.",
                coverLetter: "Tôi sinh sống và làm việc tại Đà Nẵng, có 3.5 năm kinh nghiệm fullstack .NET và React. Rất mong muốn được gia nhập FPT Software Đà Nẵng.",
                appliedDaysAgo: 4,
                recruiterUserId: recruiterUser.Id
            );

            // Case 4.2: Nguyễn Văn A (Match 78%, Strong Backend, Basic React, Applied)
            await EnsureApplicationAsync(
                context, candA, job4,
                status: ApplicationStatus.Applied,
                matchScore: 78,
                matchedSkills: new[] { "C#", ".NET" },
                missingSkills: new[] { "React" },
                rating: 4,
                evaluationLabel: "Backend mạnh, cần bồi dưỡng Frontend",
                privateNotes: "Kỹ năng Backend .NET rất vững, cần kiểm tra thêm khả năng học và làm việc với React Frontend.",
                coverLetter: "Tôi mong muốn mở rộng sang vai trò Fullstack Developer tại FPT Software Đà Nẵng.",
                appliedDaysAgo: 3,
                recruiterUserId: recruiterUser.Id
            );

            logger?.LogInformation("Rich demo presentation & testcase data seeded successfully.");
        }
        catch (Exception ex)
        {
            logger?.LogError(ex, "An error occurred while seeding rich demo presentation & testcase data.");
            throw;
        }
    }

    // =========================================================================
    // Helper Methods
    // =========================================================================

    private static async Task<Candidate> EnsureCandidateAsync(
        ApplicationDbContext context,
        UserManager<AppUser> userManager,
        string email,
        string fullName,
        string phone,
        string address,
        string gender,
        DateTime dob,
        string summary,
        string desiredPosition,
        int? desiredSalaryMin,
        int? desiredSalaryMax,
        CvEducationDto[] educations,
        CvExperienceDto[] experiences,
        string[] skillNames,
        List<Skill> allSkills)
    {
        var user = await userManager.FindByEmailAsync(email);
        if (user == null)
        {
            user = new AppUser
            {
                Id = Guid.NewGuid(),
                UserName = email,
                Email = email,
                EmailConfirmed = true,
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow
            };
            var result = await userManager.CreateAsync(user, "Candidate@123456");
            if (result.Succeeded)
            {
                await userManager.AddToRoleAsync(user, "Candidate");
            }
        }

        var candidate = await context.Candidates
            .Include(c => c.Educations)
            .Include(c => c.Experiences)
            .Include(c => c.Skills)
            .FirstOrDefaultAsync(c => c.UserId == user.Id);

        if (candidate == null)
        {
            candidate = new Candidate
            {
                UserId = user.Id,
                FullName = fullName,
                Phone = phone,
                Address = address,
                Gender = gender,
                DateOfBirth = dob,
                Summary = summary,
                DesiredPosition = desiredPosition,
                DesiredSalaryMin = desiredSalaryMin,
                DesiredSalaryMax = desiredSalaryMax,
                ProfileUpdatedAt = DateTimeOffset.UtcNow
            };
            await context.Candidates.AddAsync(candidate);
            await context.SaveChangesAsync();
        }

        // Educations
        if (!context.Educations.Any(e => e.CandidateId == candidate.Id))
        {
            foreach (var edu in educations)
            {
                await context.Educations.AddAsync(new Education
                {
                    CandidateId = candidate.Id,
                    School = edu.School,
                    Degree = edu.Degree ?? "Cử nhân",
                    Major = edu.Major ?? "Công nghệ Thông tin",
                    StartYear = edu.StartYear ?? 2016,
                    EndYear = edu.EndYear ?? 2020,
                    Description = edu.Description
                });
            }
            await context.SaveChangesAsync();
        }

        // Experiences
        if (!context.Experiences.Any(e => e.CandidateId == candidate.Id))
        {
            foreach (var exp in experiences)
            {
                await context.Experiences.AddAsync(new Experience
                {
                    CandidateId = candidate.Id,
                    CompanyName = exp.CompanyName,
                    Position = exp.Position ?? "Software Engineer",
                    StartDate = exp.StartDate,
                    EndDate = exp.EndDate,
                    IsCurrent = exp.IsCurrent,
                    Description = exp.Description
                });
            }
            await context.SaveChangesAsync();
        }

        // CandidateSkills
        if (!context.CandidateSkills.Any(cs => cs.CandidateId == candidate.Id))
        {
            foreach (var name in skillNames)
            {
                var skill = allSkills.FirstOrDefault(s => s.Name.Equals(name, StringComparison.OrdinalIgnoreCase));
                if (skill != null)
                {
                    await context.CandidateSkills.AddAsync(new CandidateSkill
                    {
                        CandidateId = candidate.Id,
                        SkillId = skill.Id,
                        Level = SkillLevel.Advanced,
                        Years = 3
                    });
                }
            }
            await context.SaveChangesAsync();
        }

        // CandidateCv & CvParser
        var cv = await context.CandidateCvs.FirstOrDefaultAsync(c => c.CandidateId == candidate.Id && !c.IsDeleted);
        if (cv == null)
        {
            cv = new CandidateCv
            {
                CandidateId = candidate.Id,
                Title = $"{fullName} - CV.pdf",
                FileType = "PDF",
                FileUrl = $"https://res.cloudinary.com/demo/image/upload/sample_cv_{candidate.Id}.pdf",
                Source = "Upload",
                ParseStatus = "Parsed",
                ParsedAt = DateTime.UtcNow,
                IsPrimary = true,
                IsDeleted = false
            };
            await context.CandidateCvs.AddAsync(cv);
            await context.SaveChangesAsync();

            var structuredCv = new StructuredCvDataDto(
                FullName: fullName,
                Email: email,
                Phone: phone,
                Summary: summary,
                Skills: skillNames.ToList(),
                Experiences: experiences.ToList(),
                Educations: educations.ToList(),
                Projects: new List<CvProjectDto>()
            );

            var parser = new CvParser
            {
                CvId = cv.Id,
                RawText = $"{fullName}\nEmail: {email}\nPhone: {phone}\nSummary: {summary}\nSkills: {string.Join(", ", skillNames)}",
                ParsedDataJson = JsonSerializer.Serialize(structuredCv),
                ModelVersion = "1.0",
                ParsedAt = DateTime.UtcNow,
                IsVerifiedByUser = true,
                VerifiedAt = DateTime.UtcNow
            };
            await context.CvParsers.AddAsync(parser);
            await context.SaveChangesAsync();
        }

        return candidate;
    }

    private static async Task EnsureApplicationAsync(
        ApplicationDbContext context,
        Candidate candidate,
        Job job,
        ApplicationStatus status,
        int matchScore,
        string[] matchedSkills,
        string[] missingSkills,
        int rating,
        string evaluationLabel,
        string privateNotes,
        string coverLetter,
        int appliedDaysAgo,
        Guid recruiterUserId)
    {
        var existingApp = await context.Applications
            .FirstOrDefaultAsync(a => a.CandidateId == candidate.Id && a.JobId == job.Id);

        var cv = await context.CandidateCvs
            .FirstOrDefaultAsync(c => c.CandidateId == candidate.Id && !c.IsDeleted);

        if (cv == null) return;

        if (existingApp == null)
        {
            var application = new JobApplication
            {
                CandidateId = candidate.Id,
                JobId = job.Id,
                CvId = cv.Id,
                CoverLetter = coverLetter,
                Status = status,
                AppliedAt = DateTime.UtcNow.AddDays(-appliedDaysAgo),
                Rating = rating,
                EvaluationLabel = evaluationLabel,
                PrivateNotes = privateNotes,
                MatchScore = matchScore,
                MatchExplanation = $"Độ tương thích tổng quan đạt {matchScore}%. Ứng viên đáp ứng {matchedSkills.Length} kỹ năng yêu cầu. {(missingSkills.Length > 0 ? "Còn thiếu: " + string.Join(", ", missingSkills) : "Đáp ứng đầy đủ các tiêu chí trọng tâm.")}",
                MatchedSkillsJson = JsonSerializer.Serialize(matchedSkills),
                MissingSkillsJson = JsonSerializer.Serialize(missingSkills),
                IsDeleted = false
            };

            await context.Applications.AddAsync(application);
            await context.SaveChangesAsync();

            // Status Histories
            var history1 = new ApplicationStatusHistory
            {
                ApplicationId = application.Id,
                FromStatus = null,
                ToStatus = ApplicationStatus.Applied.ToString(),
                ChangedById = recruiterUserId,
                Reason = "Ứng viên nộp hồ sơ trực tuyến qua hệ thống FutureCV Portal",
                ChangedAt = application.AppliedAt
            };
            await context.ApplicationStatusHistories.AddAsync(history1);

            if (status != ApplicationStatus.Applied)
            {
                var history2 = new ApplicationStatusHistory
                {
                    ApplicationId = application.Id,
                    FromStatus = ApplicationStatus.Applied.ToString(),
                    ToStatus = status.ToString(),
                    ChangedById = recruiterUserId,
                    Reason = evaluationLabel ?? $"Chuyển trạng thái sang {status}",
                    ChangedAt = application.AppliedAt.AddDays(1)
                };
                await context.ApplicationStatusHistories.AddAsync(history2);
            }

            await context.SaveChangesAsync();
        }
        else
        {
            // Update existing application with latest test data
            existingApp.CvId = cv.Id;
            existingApp.Status = status;
            existingApp.MatchScore = matchScore;
            existingApp.Rating = rating;
            existingApp.EvaluationLabel = evaluationLabel;
            existingApp.PrivateNotes = privateNotes;
            existingApp.MatchExplanation = $"Độ tương thích tổng quan đạt {matchScore}%. Ứng viên đáp ứng {matchedSkills.Length} kỹ năng yêu cầu. {(missingSkills.Length > 0 ? "Còn thiếu: " + string.Join(", ", missingSkills) : "Đáp ứng đầy đủ các tiêu chí trọng tâm.")}";
            existingApp.MatchedSkillsJson = JsonSerializer.Serialize(matchedSkills);
            existingApp.MissingSkillsJson = JsonSerializer.Serialize(missingSkills);
            await context.SaveChangesAsync();
        }
    }
}
