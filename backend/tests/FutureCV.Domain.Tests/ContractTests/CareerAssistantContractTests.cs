using System.Text.Json;
using FutureCV.Application.Features.AiMatching.DTOs;
using FutureCV.Application.Features.CareerAssistant.DTOs;
using Xunit;

namespace FutureCV.Domain.Tests.ContractTests;

public class CareerAssistantContractTests
{
    private static readonly JsonSerializerOptions WebJsonOptions = new(JsonSerializerDefaults.Web);
    private static readonly JsonSerializerOptions SnakeCaseJsonOptions = new(JsonSerializerDefaults.Web)
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower
    };

    [Fact]
    public void AiRequestUsesPythonFieldNames()
    {
        var request = new CareerAiRequest("Advice", [new("user", "Hello")], new(null, null));
        var json = JsonSerializer.Serialize(request, WebJsonOptions);
        using var doc = JsonDocument.Parse(json);
        Assert.Equal("Advice", doc.RootElement.GetProperty("message").GetString());
        Assert.Equal("user", doc.RootElement.GetProperty("history")[0].GetProperty("role").GetString());
        Assert.True(doc.RootElement.GetProperty("context").TryGetProperty("cv", out _));
        Assert.True(doc.RootElement.GetProperty("context").TryGetProperty("match_result", out _));
    }

    [Fact]
    public void AiRequestSerializesMatchResultWithAllRequiredPythonFieldNames()
    {
        var matchResult = new AiMatchResultDto(
            MatchScore: 84,
            MatchedSkills: ["C#", ".NET"],
            MissingSkills: ["Docker"],
            ExperienceComparison: "3.0 years vs 2.0 years required.",
            EducationComparison: "Bachelor matches requirement.",
            ProjectDomainRelevance: "High backend relevance.",
            MatchExplanation: "Strong backend fit, add Docker.");

        var request = new CareerAiRequest(
            "How can I improve?",
            [],
            new CareerAiContext(null, null, matchResult));

        foreach (var options in new[] { WebJsonOptions, SnakeCaseJsonOptions })
        {
            var json = JsonSerializer.Serialize(request, options);
            using var doc = JsonDocument.Parse(json);
            var mr = doc.RootElement.GetProperty("context").GetProperty("match_result");

            Assert.Equal(84, mr.GetProperty("match_score").GetInt32());
            Assert.Equal(["C#", ".NET"], mr.GetProperty("matched_skills").EnumerateArray().Select(x => x.GetString()!).ToArray());
            Assert.Equal(["Docker"], mr.GetProperty("missing_skills").EnumerateArray().Select(x => x.GetString()!).ToArray());
            Assert.Equal("3.0 years vs 2.0 years required.", mr.GetProperty("experience_comparison").GetString());
            Assert.Equal("Bachelor matches requirement.", mr.GetProperty("education_comparison").GetString());
            Assert.Equal("High backend relevance.", mr.GetProperty("project_domain_relevance").GetString());
            Assert.Equal("Strong backend fit, add Docker.", mr.GetProperty("match_explanation").GetString());
        }
    }

    [Fact]
    public void AiRequestSerializesEnrichedCvAndCvEvaluationWithPythonFieldNames()
    {
        var cv = new AiStructuredCvDto(
            CareerSummary: "Senior .NET Backend",
            Skills: ["C#", ".NET"],
            WorkExperience: [new AiWorkExperienceDto(JobTitle: "Backend Lead", Company: "TechCo", Description: "Built APIs")],
            Education: [new AiEducationDto(Degree: "Bachelor", Institution: "HUST", FieldOfStudy: "CS", GraduationYear: "2020")],
            Certificates: ["AWS SAA"],
            Projects: [new AiProjectDto(Name: "Order API", Description: "Microservice", Technologies: ["C#", "Redis"])],
            Technologies: ["Redis"]);

        var cvEval = new CareerCvEvaluationDto(
            CvScore: 88,
            Strengths: ["Strong architecture"],
            Weaknesses: ["Missing metrics"],
            ImprovementSuggestions: ["Add KPI impact"]);

        var request = new CareerAiRequest("Tu van CV", [], new CareerAiContext(cv, null, null, cvEval));

        foreach (var options in new[] { WebJsonOptions, SnakeCaseJsonOptions })
        {
            var json = JsonSerializer.Serialize(request, options);
            using var doc = JsonDocument.Parse(json);
            var ctx = doc.RootElement.GetProperty("context");
            var cvJson = ctx.GetProperty("cv");
            Assert.Equal("Backend Lead", cvJson.GetProperty("work_experience")[0].GetProperty("job_title").GetString());
            Assert.Equal("HUST", cvJson.GetProperty("education")[0].GetProperty("institution").GetString());
            Assert.Equal("Order API", cvJson.GetProperty("projects")[0].GetProperty("name").GetString());
            Assert.Equal("AWS SAA", cvJson.GetProperty("certificates")[0].GetString());

            var evalJson = ctx.GetProperty("cv_evaluation");
            Assert.Equal(88, evalJson.GetProperty("cv_score").GetInt32());
            Assert.Equal("Strong architecture", evalJson.GetProperty("strengths")[0].GetString());
            Assert.Equal("Missing metrics", evalJson.GetProperty("weaknesses")[0].GetString());
            Assert.Equal("Add KPI impact", evalJson.GetProperty("improvement_suggestions")[0].GetString());
        }
    }
}
