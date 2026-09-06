import { apiClient } from '~/lib/apiClient';
import type { Job, CreateJobDto, UpdateJobDto, JobFilters } from '../types/job.types';

/**
 * FCV-82: Job Management Service
 * Xử lý các API calls liên quan đến Job
 */

// Lấy danh sách jobs với filters và pagination
export async function getJobs(filters?: JobFilters): Promise<Job[]> {
  const params = new URLSearchParams();
  
  if (filters?.status) params.append('status', filters.status);
  if (filters?.location) params.append('location', filters.location);
  if (filters?.searchTerm) params.append('searchTerm', filters.searchTerm);
  if (filters?.page) params.append('page', filters.page.toString());
  if (filters?.pageSize) params.append('pageSize', filters.pageSize.toString());
  
  const response = await apiClient.get(`/api/Job?${params.toString()}`);
  return response.data;
}

// Lấy chi tiết một job
export async function getJobById(id: string): Promise<Job> {
  const response = await apiClient.get(`/api/Job/${id}`);
  return response.data;
}

// Tạo job mới
export async function createJob(data: CreateJobDto): Promise<Job> {
  const response = await apiClient.post('/api/Job', data);
  return response.data;
}

// Cập nhật job
export async function updateJob(id: string, data: UpdateJobDto): Promise<Job> {
  const response = await apiClient.put(`/api/Job/${id}`, data);
  return response.data;
}

// Xóa job
export async function deleteJob(id: string): Promise<void> {
  await apiClient.delete(`/api/Job/${id}`);
}

// Đóng job (chuyển status sang Closed)
export async function closeJob(id: string): Promise<Job> {
  const response = await apiClient.patch(`/api/Job/${id}/close`);
  return response.data;
}

// Mở lại job (chuyển status sang Open)
export async function reopenJob(id: string): Promise<Job> {
  const response = await apiClient.patch(`/api/Job/${id}/reopen`);
  return response.data;
}
