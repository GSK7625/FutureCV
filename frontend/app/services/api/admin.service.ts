import { fetcher } from "~/lib/fetcher";
import type {
  UserDto,
  UserSearchParams,
  PaginatedResponse,
  CompanyDto,
  UpdateCompanyVerificationDto,
  JobDto,
  UpdateJobApprovalDto,
  MessageDto,
} from "~/types/api";

// ============================================
// USER MANAGEMENT
// ============================================

export const adminUserApi = {
  getUsers: (params?: UserSearchParams) => {
    const query = new URLSearchParams();
    if (params?.keyword) query.append("keyword", params.keyword);
    if (params?.role) query.append("role", params.role);
    if (params?.isLocked !== undefined) query.append("isLocked", String(params.isLocked));
    if (params?.page) query.append("page", String(params.page));
    if (params?.pageSize) query.append("pageSize", String(params.pageSize));
    
    return fetcher<PaginatedResponse<UserDto>>(`/api/admin/users?${query.toString()}`, {
      auth: true,
    });
  },

  getUserById: (id: string) =>
    fetcher<UserDto>(`/api/admin/users/${id}`, { auth: true }),

  lockUser: (id: string) =>
    fetcher<MessageDto>(`/api/admin/users/${id}/lock`, {
      method: "POST",
      auth: true,
    }),

  unlockUser: (id: string) =>
    fetcher<MessageDto>(`/api/admin/users/${id}/unlock`, {
      method: "POST",
      auth: true,
    }),
};

// ============================================
// COMPANY VERIFICATION
// ============================================

export const adminCompanyApi = {
  getCompanies: (params?: {
    keyword?: string;
    verifiedStatus?: string;
    page?: number;
    pageSize?: number;
  }) => {
    const query = new URLSearchParams();
    if (params?.keyword) query.append("keyword", params.keyword);
    if (params?.verifiedStatus) query.append("verifiedStatus", params.verifiedStatus);
    if (params?.page) query.append("page", String(params.page));
    if (params?.pageSize) query.append("pageSize", String(params.pageSize));
    
    return fetcher<PaginatedResponse<CompanyDto>>(`/api/admin/companies?${query.toString()}`, {
      auth: true,
    });
  },

  getCompanyById: (id: string) =>
    fetcher<CompanyDto>(`/api/admin/companies/${id}`, { auth: true }),

  updateCompanyVerification: (id: string, dto: UpdateCompanyVerificationDto) =>
    fetcher<CompanyDto>(`/api/admin/companies/${id}/status`, {
      method: "PUT",
      body: dto,
      auth: true,
    }),
};

// ============================================
// JOB MODERATION
// ============================================

export const adminJobApi = {
  getJobs: (params?: {
    keyword?: string;
    approvalStatus?: string;
    page?: number;
    pageSize?: number;
  }) => {
    const query = new URLSearchParams();
    if (params?.keyword) query.append("keyword", params.keyword);
    if (params?.approvalStatus) query.append("approvalStatus", params.approvalStatus);
    if (params?.page) query.append("page", String(params.page));
    if (params?.pageSize) query.append("pageSize", String(params.pageSize));
    
    return fetcher<PaginatedResponse<JobDto>>(`/api/admin/jobs?${query.toString()}`, {
      auth: true,
    });
  },

  getJobById: (id: string) =>
    fetcher<JobDto>(`/api/admin/jobs/${id}`, { auth: true }),

  updateJobApproval: (id: string, dto: UpdateJobApprovalDto) =>
    fetcher<JobDto>(`/api/admin/jobs/${id}/approval`, {
      method: "PATCH",
      body: dto,
      auth: true,
    }),
};
