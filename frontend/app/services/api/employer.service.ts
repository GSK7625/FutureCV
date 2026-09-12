import { fetcher } from "~/lib/fetcher";
import type {
  EmployerProfileDto,
  UpdateEmployerProfileDto,
  CompanyDto,
  CreateCompanyDto,
  UpdateCompanyDto,
  JobDto,
  CreateJobDto,
  UpdateJobDto,
  MessageDto,
  PaginatedResponse,
  ApplicationDto,
  UpdateApplicationStatusDto,
} from "~/types/api";

// ============================================
// EMPLOYER PROFILE
// ============================================

export const employerProfileApi = {
  getProfile: () =>
    fetcher<EmployerProfileDto>("/api/employer/profile", { auth: true }),

  updateProfile: (dto: UpdateEmployerProfileDto) =>
    fetcher<EmployerProfileDto>("/api/employer/profile", {
      method: "PUT",
      body: dto,
      auth: true,
    }),

  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append("avatar", file);
    return fetch(`${import.meta.env.VITE_API_URL ?? "http://localhost:5000"}/api/employer/profile/avatar`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: formData,
    }).then((res) => res.json());
  },
};

// ============================================
// COMPANY
// ============================================

export const companyApi = {
  getCompany: () =>
    fetcher<CompanyDto>("/api/employer/company", { auth: true }),

  createCompany: (dto: CreateCompanyDto) =>
    fetcher<CompanyDto>("/api/employer/company", {
      method: "POST",
      body: dto,
      auth: true,
    }),

  updateCompany: (dto: UpdateCompanyDto) =>
    fetcher<CompanyDto>("/api/employer/company", {
      method: "PUT",
      body: dto,
      auth: true,
    }),

  uploadLogo: (file: File) => {
    const formData = new FormData();
    formData.append("logo", file);
    return fetch(`${import.meta.env.VITE_API_URL ?? "http://localhost:5000"}/api/employer/company/logo`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: formData,
    }).then((res) => res.json());
  },
};

// ============================================
// JOBS
// ============================================

export const employerJobApi = {
  getMyJobs: (params?: {
    keyword?: string;
    approvalStatus?: string;
    isActive?: boolean;
    page?: number;
    pageSize?: number;
  }) => {
    const query = new URLSearchParams();
    if (params?.keyword) query.append("keyword", params.keyword);
    if (params?.approvalStatus) query.append("approvalStatus", params.approvalStatus);
    if (params?.isActive !== undefined) query.append("isActive", String(params.isActive));
    if (params?.page) query.append("page", String(params.page));
    if (params?.pageSize) query.append("pageSize", String(params.pageSize));
    
    return fetcher<PaginatedResponse<JobDto>>(`/api/employer/jobs?${query.toString()}`, {
      auth: true,
    });
  },

  getJobById: (id: string) =>
    fetcher<JobDto>(`/api/employer/jobs/${id}`, { auth: true }),

  createJob: (dto: CreateJobDto) =>
    fetcher<JobDto>("/api/employer/jobs", {
      method: "POST",
      body: dto,
      auth: true,
    }),

  updateJob: (id: string, dto: UpdateJobDto) =>
    fetcher<JobDto>(`/api/employer/jobs/${id}`, {
      method: "PUT",
      body: dto,
      auth: true,
    }),

  deleteJob: (id: string) =>
    fetcher<void>(`/api/employer/jobs/${id}`, {
      method: "DELETE",
      auth: true,
    }),

  toggleJobStatus: (id: string) =>
    fetcher<MessageDto>(`/api/employer/jobs/${id}/status`, {
      method: "PATCH",
      auth: true,
    }),

  getJobApplications: (jobId: string, params?: { status?: string; page?: number; pageSize?: number }) => {
    const query = new URLSearchParams();
    if (params?.status) query.append("status", params.status);
    if (params?.page) query.append("page", String(params.page));
    if (params?.pageSize) query.append("pageSize", String(params.pageSize));
    
    return fetcher<PaginatedResponse<ApplicationDto>>(
      `/api/employer/jobs/${jobId}/applications?${query.toString()}`,
      { auth: true }
    );
  },

  updateApplicationStatus: (applicationId: string, dto: UpdateApplicationStatusDto) =>
    fetcher<ApplicationDto>(`/api/employer/applications/${applicationId}/status`, {
      method: "PATCH",
      body: dto,
      auth: true,
    }),
};
