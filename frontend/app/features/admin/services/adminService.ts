import { fetcher } from "~/lib/fetcher";
import type {
  DashboardStats,
  UserListItem,
  CompanyListItem,
  JobListItem,
  UserFilters,
  CompanyFilters,
  JobFilters,
  PaginatedResponse,
} from "~/features/admin/types";

const BASE_URL = "/api/admin";

// ============================================
// DASHBOARD STATISTICS
// ============================================

export const adminDashboardApi = {
  getStats: async (): Promise<DashboardStats> => {
    return fetcher<DashboardStats>(`${BASE_URL}/statistics`, {
      auth: true,
    });
  },
};

// ============================================
// USER MANAGEMENT
// ============================================

export const adminUserApi = {
  getUsers: async (filter?: UserFilters): Promise<PaginatedResponse<UserListItem>> => {
    const query = new URLSearchParams();
    if (filter?.search) query.append("search", filter.search);
    if (filter?.role) query.append("role", filter.role);
    if (filter?.isLocked !== undefined) query.append("isLocked", String(filter.isLocked));
    if (filter?.pageIndex) query.append("pageIndex", String(filter.pageIndex));
    if (filter?.pageSize) query.append("pageSize", String(filter.pageSize));

    return fetcher<PaginatedResponse<UserListItem>>(
      `${BASE_URL}/users?${query.toString()}`,
      { auth: true }
    );
  },

  lockUser: async (id: string, reason: string): Promise<boolean> => {
    return fetcher<boolean>(`${BASE_URL}/users/${id}/lock`, {
      method: "POST",
      body: { reason },
      auth: true,
    });
  },

  unlockUser: async (id: string): Promise<boolean> => {
    return fetcher<boolean>(`${BASE_URL}/users/${id}/unlock`, {
      method: "POST",
      auth: true,
    });
  },
};

// ============================================
// COMPANY VERIFICATION
// ============================================

export const adminCompanyApi = {
  getCompanies: async (filter?: CompanyFilters): Promise<PaginatedResponse<CompanyListItem>> => {
    const query = new URLSearchParams();
    if (filter?.search) query.append("search", filter.search);
    if (filter?.verifiedStatus) query.append("status", filter.verifiedStatus);
    if (filter?.pageIndex) query.append("pageIndex", String(filter.pageIndex));
    if (filter?.pageSize) query.append("pageSize", String(filter.pageSize));

    return fetcher<PaginatedResponse<CompanyListItem>>(
      `${BASE_URL}/companies?${query.toString()}`,
      { auth: true }
    );
  },

  updateCompanyStatus: async (
    id: string,
    status: string,
    note?: string
  ): Promise<CompanyListItem> => {
    return fetcher<CompanyListItem>(`${BASE_URL}/companies/${id}/status`, {
      method: "PUT",
      body: { status, note },
      auth: true,
    });
  },
};

// ============================================
// JOB MODERATION
// ============================================

export const adminJobApi = {
  getJobs: async (filter?: JobFilters): Promise<PaginatedResponse<JobListItem>> => {
    const query = new URLSearchParams();
    if (filter?.search) query.append("search", filter.search);
    if (filter?.approvalStatus) query.append("status", filter.approvalStatus);
    if (filter?.isActive !== undefined) query.append("isActive", String(filter.isActive));
    if (filter?.pageIndex) query.append("pageIndex", String(filter.pageIndex));
    if (filter?.pageSize) query.append("pageSize", String(filter.pageSize));

    return fetcher<PaginatedResponse<JobListItem>>(
      `${BASE_URL}/jobs?${query.toString()}`,
      { auth: true }
    );
  },

  approveJob: async (id: string): Promise<JobListItem> => {
    return fetcher<JobListItem>(`${BASE_URL}/jobs/${id}/approve`, {
      method: "POST",
      auth: true,
    });
  },

  rejectJob: async (id: string, reason: string): Promise<JobListItem> => {
    return fetcher<JobListItem>(`${BASE_URL}/jobs/${id}/reject`, {
      method: "POST",
      body: { reason },
      auth: true,
    });
  },
};
