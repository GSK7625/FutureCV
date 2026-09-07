/**
 * @file jobService.ts
 * @description Candidate Job Service: Xử lý giao tiếp API cho các thao tác việc làm của ứng viên.
 * @architecture Tuân thủ ISP (IJobService) & DIP (fallback adapter có điều kiện cho dev).
 */

import { fetcher, ApiError } from "~/lib/fetcher";
import type { ApplicationDto, Job, JobFilters, JobListResult } from "../types";
import { DEMO_JOBS, filterDemoJobs } from "../mocks/jobs.mock";

export { DEMO_JOBS };

export interface IJobService {
  list(filters: JobFilters, signal?: AbortSignal): Promise<JobListResult>;
  detail(id: string, signal?: AbortSignal): Promise<Job>;
  apply(dto: ApplicationDto): Promise<{ id: string }>;
  similar(id: string, signal?: AbortSignal): Promise<Job[]>;
}

/**
 * Fallback mock CHỈ khi thỏa đồng thời:
 * (1) đang chạy DEV, (2) lỗi hạ tầng (mạng/timeout) hoặc endpoint chưa tồn tại (404).
 * Tuyệt đối không nuốt 401/403/5xx — đó là lỗi thật mà UI phải hiển thị.
 */
async function withDevFallback<T>(
  apiCall: () => Promise<T>,
  fallback: () => T | Promise<T>,
): Promise<T> {
  if (!import.meta.env.DEV) return apiCall();
  try {
    return await apiCall();
  } catch (error) {
    const isDevScenario =
      error instanceof ApiError && (error.isNetworkError || error.status === 404);
    if (!isDevScenario) throw error;
    console.warn("[jobService] API chưa sẵn sàng hoặc ngoại lệ kết nối, fallback mock:", (error as Error).message);
    return fallback();
  }
}

export function jobService(): IJobService {
  return {
    list: (filters, signal) =>
      withDevFallback(
        () => fetcher<JobListResult>("/api/jobs", { method: "GET", signal }),
        () => filterDemoJobs(filters),
      ),

    detail: (id, signal) =>
      withDevFallback(
        () => fetcher<Job>(`/api/jobs/${id}`, { method: "GET", signal }),
        () => {
          const found = DEMO_JOBS.find((j) => String(j.id) === String(id));
          return found ?? DEMO_JOBS[0];
        },
      ),

    // ❌ KHÔNG fallback cho mutation ghi dữ liệu — thất bại phải báo lỗi thật.
    apply: (dto) =>
      fetcher<{ id: string }>("/api/applications", {
        method: "POST",
        body: dto,
        auth: true,
      }),

    similar: (id, signal) =>
      withDevFallback(
        () => fetcher<Job[]>(`/api/jobs/${id}/similar`, { method: "GET", signal }),
        () => DEMO_JOBS.filter((j) => String(j.id) !== String(id)).slice(0, 3),
      ),
  };
}
