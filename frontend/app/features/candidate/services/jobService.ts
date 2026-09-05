/**
 * @file jobService.ts
 * @description Candidate Job Service: Xử lý giao tiếp API cho các thao tác việc làm của ứng viên (danh sách việc làm, chi tiết, nộp đơn ứng tuyển, việc làm tương tự).
 * @architecture Tuân thủ Interface Segregation Principle (ISP: khai báo interface IJobService) & Dependency Inversion Principle (DIP: tích hợp fallback adapter với mock data khi backend API chưa sẵn sàng).
 */

import { fetcher } from "~/lib/fetcher";
import type { ApplicationDto, Job, JobFilters, JobListResult } from "../types";
import { DEMO_JOBS, filterDemoJobs } from "../mocks/jobs.mock";


export { DEMO_JOBS };


export interface IJobService {
  list(filters: JobFilters): Promise<JobListResult>;
  detail(id: string): Promise<Job>;
  apply(dto: ApplicationDto): Promise<{ id: string }>;
  similar(id: string): Promise<Job[]>;
}

/**
 * Helper bọc API call: Nếu backend endpoint chưa sẵn sàng (hoặc môi trường dev chưa có backend),
 * tự động fallback về mock data để toàn bộ luồng UI vẫn hoạt động mượt mà.
 */
async function withFallback<T>(apiCall: () => Promise<T>, fallback: () => T | Promise<T>): Promise<T> {
  try {
    return await apiCall();
  } catch (_error) {
    return await fallback();
  }
}

export function jobService(): IJobService {
  return {
    list: async (filters: JobFilters): Promise<JobListResult> => {
      return withFallback(
        () => fetcher<JobListResult>("/api/jobs", { method: "GET" }),
        () => filterDemoJobs(filters)
      );
    },

    detail: async (id: string): Promise<Job> => {
      return withFallback(
        () => fetcher<Job>(`/api/jobs/${id}`, { method: "GET" }),
        () => {
          const found = DEMO_JOBS.find((j) => String(j.id) === String(id));
          return found ?? DEMO_JOBS[0];
        }
      );
    },

    apply: async (dto: ApplicationDto): Promise<{ id: string }> => {
      return withFallback(
        () => fetcher<{ id: string }>("/api/applications", { method: "POST", body: dto, auth: true }),
        () => ({ id: "app-" + Date.now() })
      );
    },

    similar: async (id: string): Promise<Job[]> => {
      return withFallback(
        () => fetcher<Job[]>(`/api/jobs/${id}/similar`, { method: "GET" }),
        () => DEMO_JOBS.filter((j) => String(j.id) !== String(id)).slice(0, 3)
      );
    },
  };
}
