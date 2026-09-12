import { fetcher } from "~/lib/fetcher";
import type {
  JobDto,
  JobSearchParams,
  PaginatedResponse,
  JobCategoryDto,
  JobLevelDto,
  EmploymentTypeDto,
  JobSkillDto,
  LocationDto,
  ApplicationDto,
  CreateApplicationDto,
} from "~/types/api";

// ============================================
// PUBLIC JOBS
// ============================================

export const jobsApi = {
  searchJobs: (params?: JobSearchParams) => {
    const query = new URLSearchParams();
    if (params?.keyword) query.append("keyword", params.keyword);
    if (params?.jobCategoryId) query.append("jobCategoryId", params.jobCategoryId);
    if (params?.jobLevelId) query.append("jobLevelId", params.jobLevelId);
    if (params?.location) query.append("location", params.location);
    if (params?.employmentTypeId) query.append("employmentTypeId", params.employmentTypeId);
    if (params?.salaryMin) query.append("salaryMin", String(params.salaryMin));
    if (params?.salaryMax) query.append("salaryMax", String(params.salaryMax));
    if (params?.skillIds) params.skillIds.forEach(id => query.append("skillIds", id));
    if (params?.page) query.append("page", String(params.page));
    if (params?.pageSize) query.append("pageSize", String(params.pageSize));
    
    return fetcher<PaginatedResponse<JobDto>>(`/api/jobs?${query.toString()}`);
  },

  getJobById: (id: string) =>
    fetcher<JobDto>(`/api/jobs/${id}`),

  getFeaturedJobs: (limit: number = 10) =>
    fetcher<JobDto[]>(`/api/jobs/featured?limit=${limit}`),

  getRecommendedJobs: (limit: number = 10) =>
    fetcher<JobDto[]>(`/api/jobs/recommended?limit=${limit}`, { auth: true }),
};

// ============================================
// MASTER DATA
// ============================================

export const masterDataApi = {
  getJobCategories: () =>
    fetcher<JobCategoryDto[]>("/api/jobs/categories"),

  getJobLevels: () =>
    fetcher<JobLevelDto[]>("/api/jobs/levels"),

  getEmploymentTypes: () =>
    fetcher<EmploymentTypeDto[]>("/api/jobs/employment-types"),

  getSkills: (params?: { search?: string; categoryId?: string }) => {
    const query = new URLSearchParams();
    if (params?.search) query.append("search", params.search);
    if (params?.categoryId) query.append("categoryId", params.categoryId);
    return fetcher<JobSkillDto[]>(`/api/jobs/skills?${query.toString()}`);
  },

  getLocations: () =>
    fetcher<LocationDto[]>("/api/jobs/locations"),
};

// ============================================
// APPLICATIONS
// ============================================

export const applicationApi = {
  getMyApplications: (params?: { status?: string; page?: number; pageSize?: number }) => {
    const query = new URLSearchParams();
    if (params?.status) query.append("status", params.status);
    if (params?.page) query.append("page", String(params.page));
    if (params?.pageSize) query.append("pageSize", String(params.pageSize));
    
    return fetcher<PaginatedResponse<ApplicationDto>>(
      `/api/candidate/applications?${query.toString()}`,
      { auth: true }
    );
  },

  applyJob: (dto: CreateApplicationDto) =>
    fetcher<ApplicationDto>("/api/candidate/applications", {
      method: "POST",
      body: dto,
      auth: true,
    }),

  withdrawApplication: (id: string) =>
    fetcher<void>(`/api/candidate/applications/${id}/withdraw`, {
      method: "POST",
      auth: true,
    }),

  checkApplied: (jobId: string) =>
    fetcher<{ hasApplied: boolean; applicationId?: string }>(
      `/api/candidate/applications/check/${jobId}`,
      { auth: true }
    ),
};
