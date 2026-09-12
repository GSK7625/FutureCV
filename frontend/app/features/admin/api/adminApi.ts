import { fetcher } from "~/lib/fetcher";
import type { PagedResult, DashboardStats, UserListItem, UserFilters, CompanyListItem, CompanyFilters, JobListItem, JobFilters } from "../types";

export const adminApi = {
  getDashboardStats: async (): Promise<DashboardStats> => {
    return await fetcher("/api/admin/dashboard/stats", { auth: true });
  },

  getUsers: async (filters: UserFilters): Promise<PagedResult<UserListItem>> => {
    const queryParams = new URLSearchParams();
    if (filters.page) queryParams.set("page", String(filters.page));
    if (filters.pageSize) queryParams.set("pageSize", String(filters.pageSize));
    if (filters.role) queryParams.set("role", filters.role);
    if (filters.status) queryParams.set("status", filters.status);
    if (filters.search) queryParams.set("search", filters.search);
    
    return await fetcher(`/api/admin/users?${queryParams.toString()}`, { auth: true });
  },

  lockUser: async (userId: string): Promise<void> => {
    await fetcher(`/api/admin/users/${userId}/lock`, { method: "POST", auth: true });
  },

  unlockUser: async (userId: string): Promise<void> => {
    await fetcher(`/api/admin/users/${userId}/unlock`, { method: "POST", auth: true });
  },

  getCompanies: async (filters: CompanyFilters): Promise<PagedResult<CompanyListItem>> => {
    const queryParams = new URLSearchParams();
    if (filters.page) queryParams.set("page", String(filters.page));
    if (filters.pageSize) queryParams.set("pageSize", String(filters.pageSize));
    if (filters.verificationStatus) queryParams.set("verificationStatus", filters.verificationStatus);
    if (filters.search) queryParams.set("search", filters.search);
    
    return await fetcher(`/api/admin/companies?${queryParams.toString()}`, { auth: true });
  },

  verifyCompany: async (companyId: string): Promise<void> => {
    await fetcher(`/api/admin/companies/${companyId}/verify`, { method: "POST", auth: true });
  },

  rejectCompany: async (companyId: string, reason: string): Promise<void> => {
    await fetcher(`/api/admin/companies/${companyId}/reject`, { 
      method: "POST", 
      auth: true,
      body: { reason }
    });
  },

  getJobs: async (filters: JobFilters): Promise<PagedResult<JobListItem>> => {
    const queryParams = new URLSearchParams();
    if (filters.page) queryParams.set("page", String(filters.page));
    if (filters.pageSize) queryParams.set("pageSize", String(filters.pageSize));
    if (filters.status) queryParams.set("status", filters.status);
    if (filters.search) queryParams.set("search", filters.search);
    
    return await fetcher(`/api/admin/jobs?${queryParams.toString()}`, { auth: true });
  },

  approveJob: async (jobId: string): Promise<void> => {
    await fetcher(`/api/admin/jobs/${jobId}/approve`, { method: "POST", auth: true });
  },

  rejectJob: async (jobId: string, reason: string): Promise<void> => {
    await fetcher(`/api/admin/jobs/${jobId}/reject`, { 
      method: "POST", 
      auth: true,
      body: { reason }
    });
  },
};
