import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetcher } from "~/lib/fetcher";
import type {
  DashboardStats,
  UserFilters,
  UserListItem,
  CompanyFilters,
  CompanyListItem,
  JobFilters,
  JobListItem,
  PaginatedResponse,
} from "../types";

// Dashboard Stats
export function useDashboardStats() {
  return useQuery<DashboardStats>({
    queryKey: ["admin", "dashboard", "stats"],
    queryFn: () => fetcher("/api/admin/statistics", { auth: true }),
  });
}

// User Management
export function useUsers(filters: UserFilters) {
  return useQuery<PaginatedResponse<UserListItem>>({
    queryKey: ["admin", "users", filters],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters.search) params.append("search", filters.search);
      if (filters.role) params.append("role", filters.role);
      if (filters.status) params.append("status", filters.status);
      if (filters.page) params.append("page", filters.page.toString());
      if (filters.pageSize) params.append("pageSize", filters.pageSize.toString());

      return fetcher(`/api/admin/users?${params.toString()}`, { auth: true });
    },
  });
}

export function useLockUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => 
      fetcher(`/api/admin/users/${userId}/lock`, { method: "POST", auth: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
    },
  });
}

export function useUnlockUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => 
      fetcher(`/api/admin/users/${userId}/unlock`, { method: "POST", auth: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
    },
  });
}

// Company Verification
export function useCompanies(filters: CompanyFilters) {
  return useQuery<PaginatedResponse<CompanyListItem>>({
    queryKey: ["admin", "companies", filters],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters.search) params.append("search", filters.search);
      if (filters.verificationStatus) params.append("verificationStatus", filters.verificationStatus);
      if (filters.page) params.append("page", filters.page.toString());
      if (filters.pageSize) params.append("pageSize", filters.pageSize.toString());

      return fetcher(`/api/admin/companies?${params.toString()}`, { auth: true });
    },
  });
}

export function useVerifyCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (companyId: string) => 
      fetcher(`/api/admin/companies/${companyId}/verify`, { method: "POST", auth: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "companies"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
    },
  });
}

export function useRejectCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ companyId, reason }: { companyId: string; reason: string }) => 
      fetcher(`/api/admin/companies/${companyId}/reject`, { 
        method: "POST", 
        auth: true,
        body: { reason }
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "companies"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
    },
  });
}

// Job Moderation
export function useJobs(filters: JobFilters) {
  return useQuery<PaginatedResponse<JobListItem>>({
    queryKey: ["admin", "jobs", filters],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters.search) params.append("search", filters.search);
      if (filters.status) params.append("status", filters.status);
      if (filters.page) params.append("page", filters.page.toString());
      if (filters.pageSize) params.append("pageSize", filters.pageSize.toString());

      return fetcher(`/api/admin/jobs?${params.toString()}`, { auth: true });
    },
  });
}

export function useApproveJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (jobId: string) => 
      fetcher(`/api/admin/jobs/${jobId}/approve`, { method: "POST", auth: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "jobs"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
    },
  });
}

export function useRejectJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ jobId, reason }: { jobId: string; reason: string }) => 
      fetcher(`/api/admin/jobs/${jobId}/reject`, { 
        method: "POST", 
        auth: true,
        body: { reason }
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "jobs"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
    },
  });
}
