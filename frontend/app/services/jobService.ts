import { apiClient } from '~/lib/apiClient';
import type { Job, CreateJobRequest, UpdateJobRequest, JobFilters, JobsResponse } from '~/types/job';

export const jobService = {
  async getMyJobs(filters: JobFilters): Promise<JobsResponse> {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.search) params.append('search', filters.search);
    if (filters.isActive !== undefined) params.append('isActive', filters.isActive.toString());
    if (filters.page) params.append('pageIndex', filters.page.toString());
    if (filters.pageSize) params.append('pageSize', filters.pageSize.toString());
    
    const response = await apiClient.get<JobsResponse>(`/api/employer/jobs?${params.toString()}`);
    return response.data;
  },

  async createJob(data: CreateJobRequest): Promise<Job> {
    const response = await apiClient.post<Job>('/api/employer/jobs', data);
    return response.data;
  },

  async updateJob(id: string, data: UpdateJobRequest): Promise<Job> {
    const response = await apiClient.put<Job>(`/api/employer/jobs/${id}`, data);
    return response.data;
  },

  async deleteJob(id: string): Promise<void> {
    await apiClient.delete(`/api/employer/jobs/${id}`);
  },

  async toggleJobStatus(id: string): Promise<Job> {
    const response = await apiClient.patch<Job>(`/api/employer/jobs/${id}/status`);
    return response.data;
  },
};
