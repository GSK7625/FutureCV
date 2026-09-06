import { fetcher } from '~/lib/fetcher';
import type {
  Job,
  JobListItem,
  CreateJobRequest,
  UpdateJobRequest,
  JobFilterRequest,
  PagedResult,
} from '../types';

const BASE_URL = '/api/employer/jobs';

/**
 * FCV-82: HR Job Management Service
 * CRUD operations for Recruiter's job postings
 */
export const hrJobService = {
  /**
   * Lấy danh sách Job của Recruiter
   */
  async getMyJobs(filter: JobFilterRequest = {}): Promise<PagedResult<JobListItem>> {
    const params = new URLSearchParams();
    if (filter.keyword) params.append('keyword', filter.keyword);
    if (filter.approvalStatus) params.append('approvalStatus', filter.approvalStatus);
    if (filter.isActive !== undefined) params.append('isActive', String(filter.isActive));
    params.append('pageIndex', String(filter.pageIndex || 1));
    params.append('pageSize', String(filter.pageSize || 10));

    const response = await fetcher.get(`${BASE_URL}?${params.toString()}`);
    return response.data;
  },

  /**
   * Lấy chi tiết một Job
   */
  async getJobById(jobId: string): Promise<Job> {
    const response = await fetcher.get(`${BASE_URL}/${jobId}`);
    return response.data;
  },

  /**
   * Tạo Job mới
   */
  async createJob(data: CreateJobRequest): Promise<Job> {
    const response = await fetcher.post(BASE_URL, data);
    return response.data;
  },

  /**
   * Cập nhật Job
   */
  async updateJob(jobId: string, data: UpdateJobRequest): Promise<Job> {
    const response = await fetcher.put(`${BASE_URL}/${jobId}`, data);
    return response.data;
  },

  /**
   * Đóng/Mở Job (toggle IsActive)
   */
  async toggleJobStatus(jobId: string): Promise<boolean> {
    const response = await fetcher.patch(`${BASE_URL}/${jobId}/status`);
    return response.data;
  },

  /**
   * Xóa Job
   */
  async deleteJob(jobId: string): Promise<boolean> {
    const response = await fetcher.delete(`${BASE_URL}/${jobId}`);
    return response.data;
  },
};
