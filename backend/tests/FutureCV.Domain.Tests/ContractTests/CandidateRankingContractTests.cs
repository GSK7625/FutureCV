using System.Text.Json;
using FutureCV.Application.Features.AiMatching.DTOs;
using FutureCV.Application.Features.JobApplication.DTOs;
using Xunit;

namespace FutureCV.Domain.Tests.ContractTests;

public class CandidateRankingContractTests
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    [Fact]
    public void AiCandidateRankRequest_SerializesWithExpectedSnakeCaseKeys()
    {
        var request = new AiCandidateRankRequest(
            Job: new AiStructuredJobDto(
                Title: "Frontend Engineer",
                Description: "React & TypeScript expert",
                RequiredSkills: ["React", "TypeScript"]
            ),
            Candidates:
            [
                new AiCandidateItemDto(
                    CandidateId: "cand-1",
                    Cv: new AiStructuredCvDto(
                        FullName: "Nguyen Van A",
                        Skills: ["React", "TypeScript", "TailwindCSS"]
                    )
                ),
                new AiCandidateItemDto(
                    CandidateId: "cand-2",
                    Cv: new AiStructuredCvDto(
                        FullName: "Tran Van B",
                        Skills: ["React"]
                    )
                )
            ]
        );

        var json = JsonSerializer.Serialize(request, JsonOptions);
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        Assert.True(root.TryGetProperty("job", out var jobProp));
        Assert.Equal("Frontend Engineer", jobProp.GetProperty("title").GetString());

        Assert.True(root.TryGetProperty("candidates", out var candidatesProp));
        Assert.Equal(2, candidatesProp.GetArrayLength());

        var firstCandidate = candidatesProp[0];
        Assert.Equal("cand-1", firstCandidate.GetProperty("candidate_id").GetString());
        Assert.Equal("Nguyen Van A", firstCandidate.GetProperty("cv").GetProperty("full_name").GetString());
    }

    [Fact]
    public void AiCandidateRankResponse_DeserializesFromFastApiPayload()
    {
        var json = """
        {
          "job_title": "Fullstack Developer",
          "total_evaluated": 2,
          "ranked_candidates": [
            {
              "rank": 1,
              "candidate_id": "app-001",
              "match_result": {
                "match_score": 92,
                "matched_skills": ["React", "TypeScript", "Node.js"],
                "missing_skills": ["Docker"],
                "experience_comparison": "3 years experience matches requirement.",
                "education_comparison": "Bachelor degree matches.",
                "project_domain_relevance": "Strong relevance.",
                "match_explanation": "Ứng viên phù hợp cao vì đáp ứng 3/4 kỹ năng bắt buộc."
              }
            },
            {
              "rank": 2,
              "candidate_id": "app-002",
              "match_result": {
                "match_score": 74,
                "matched_skills": ["React"],
                "missing_skills": ["TypeScript", "Node.js", "Docker"],
                "experience_comparison": "1 year experience.",
                "education_comparison": "College diploma.",
                "project_domain_relevance": "Basic relevance.",
                "match_explanation": "Ứng viên đáp ứng 1/4 kỹ năng bắt buộc."
              }
            }
          ],
          "meta": {
            "algorithm_version": "matching-v0",
            "contract_version": "match-result-v1",
            "llm_invoked": false,
            "explanation_mode": "deterministic",
            "processing_time_ms": 15.2,
            "correlation_id": "test-corr-456"
          }
        }
        """;

        var response = JsonSerializer.Deserialize<AiCandidateRankResponse>(json, JsonOptions);

        Assert.NotNull(response);
        Assert.Equal("Fullstack Developer", response.JobTitle);
        Assert.Equal(2, response.TotalEvaluated);
        Assert.Equal(2, response.RankedCandidates.Count);

        var first = response.RankedCandidates[0];
        Assert.Equal(1, first.Rank);
        Assert.Equal("app-001", first.CandidateId);
        Assert.Equal(92, first.MatchResult.MatchScore);
        Assert.Equal(3, first.MatchResult.MatchedSkills.Count);
        Assert.Equal("Ứng viên phù hợp cao vì đáp ứng 3/4 kỹ năng bắt buộc.", first.MatchResult.MatchExplanation);

        var second = response.RankedCandidates[1];
        Assert.Equal(2, second.Rank);
        Assert.Equal("app-002", second.CandidateId);
        Assert.Equal(74, second.MatchResult.MatchScore);
    }

    [Fact]
    public void JobCandidateRankingResponse_InstantiatesCleanly()
    {
        var jobId = Guid.NewGuid();
        var candidateId = Guid.NewGuid();
        var appId = Guid.NewGuid();

        var rankedItem = new RankedCandidateDto(
            Rank: 1,
            ApplicationId: appId,
            CandidateId: candidateId,
            CandidateFullName: "Nguyen Van A",
            CandidateAvatarUrl: null,
            CandidatePhone: "0901234567",
            CandidateEmail: "candidate@example.com",
            CvId: Guid.NewGuid(),
            CvTitle: "Senior React Developer CV",
            CvFileUrl: "https://example.com/cv.pdf",
            Status: "Applied",
            Rating: 5,
            EvaluationLabel: "Phù hợp",
            MatchScore: 92,
            MatchExplanation: "Đáp ứng 3/4 kỹ năng bắt buộc",
            MatchedSkills: ["React", "TypeScript", "Node.js"],
            MissingSkills: ["Docker"],
            AppliedAt: DateTime.UtcNow
        );

        var response = new JobCandidateRankingResponse(
            JobId: jobId,
            JobTitle: "Frontend Lead",
            TotalCandidates: 1,
            IsAiEvaluated: true,
            RankedCandidates: [rankedItem]
        );

        Assert.Equal(jobId, response.JobId);
        Assert.Equal("Frontend Lead", response.JobTitle);
        Assert.Equal(1, response.TotalCandidates);
        Assert.True(response.IsAiEvaluated);
        Assert.Single(response.RankedCandidates);
        Assert.Equal(1, response.RankedCandidates[0].Rank);
        Assert.Equal(92, response.RankedCandidates[0].MatchScore);
    }
}
