import { fetcher } from '~/lib/fetcher';
import type {
  Application,
  ApplicationDetail,
  ApplicationFilterRequest,
  PagedResult,
  RankCandidateRequest,
  CandidateRanking,
  UpdateApplicationStatusRequest,
  PipelineDashboard,
  MoveCandidateStageRequest,
} from '../types';

const BASE_URL = '/api/recruiter/applications';

/**
 * FCV-83: Recruiter Application Management Service
 * Quản lý hồ sơ ứng tuyển, xếp hạng candidate, pipeline
 */
export const hrApplicationService = {
  /**
   * P4-UC04: Lấy danh sách Application cho một Job
   */
  async getJobApplications(
    jobId: string,
    filter: ApplicationFilterRequest = {}
  ): Promise<PagedResult<Application>> {
    const params = new URLSearchParams();
    if (filter.status) params.append('status', filter.status);
    if (filter.keyword) params.append('keyword', filter.keyword);
    if (filter.fromDate) params.append('fromDate', filter.fromDate);
    if (filter.toDate) params.append('toDate', filter.toDate);
    if (filter.sortBy) params.append('sortBy', filter.sortBy);
    params.append('pageIndex', String(filter.pageIndex || 1));
    params.append('pageSize', String(filter.pageSize || 10));

    const response = await fetcher.get(`${BASE_URL}/job/${jobId}?${params.toString()}`);
    return response.data;
  },

  /**
   * P4-UC04: Lấy tất cả Applications của Recruiter (tất cả Jobs)
   */
  async getAllApplications(
    filter: ApplicationFilterRequest = {}
  ): Promise<PagedResult<Application>> {
    const params = new URLSearchParams();
    if (filter.status) params.append('status', filter.status);
    if (filter.keyword) params.append('keyword', filter.keyword);
    if (filter.fromDate) params.append('fromDate', filter.fromDate);
    if (filter.toDate) params.append('toDate', filter.toDate);
    if (filter.sortBy) params.append('sortBy', filter.sortBy);
    params.append('pageIndex', String(filter.pageIndex || 1));
    params.append('pageSize', String(filter.pageSize || 10));

    const response = await fetcher.get(`${BASE_URL}?${params.toString()}`);
    return response.data;
  },

  /**
   * P4-UC04: Xem chi tiết Application và CV
   */
  async getApplicationDetail(applicationId: string): Promise<ApplicationDetail> {
    const response = await fetcher.get(`${BASE_URL}/${applicationId}`);
    return response.data;
  },

  /**
   * P4-UC05: Xếp hạng Candidate
   */
  async rankCandidate(
    applicationId: string,
    data: RankCandidateRequest
  ): Promise<CandidateRanking> {
    const response = await fetcher.post(`${BASE_URL}/${applicationId}/rank`, data);
    return response.data;
  },

  /**
   * P4-UC06: Cập nhật trạng thái Application
   */
  async updateApplicationStatus(
    applicationId: string,
    data: UpdateApplicationStatusRequest
  ): Promise<ApplicationDetail> {
    const response = await fetcher.patch(`${BASE_URL}/${applicationId}/status`, data);
    return response.data;
  },

  /**
   * P4-UC07: Lấy Pipeline Dashboard
   */
  async getPipelineDashboard(jobId: string): Promise<PipelineDashboard> {
    const response = await fetcher.get(`${BASE_URL}/job/${jobId}/pipeline`);
    return response.data;
  },

  /**
   * P4-UC07: Di chuyển Candidate giữa các stage
   */
  async moveCandidateStage(data: MoveCandidateStageRequest): Promise<ApplicationDetail> {
    const response = await fetcher.patch(`${BASE_URL}/move-stage`, data);
    return response.data;
  },
};
