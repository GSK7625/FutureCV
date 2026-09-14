/**
 * @file useJobDetail.ts
 * @description Hook lấy thông tin chi tiết một công việc theo Id từ GET /api/jobs/{id}.
 */

import { useQuery } from "@tanstack/react-query";
import { jobService } from "../services/jobService";
import { candidateQueryKeys } from "../queries/candidateQueryKeys";

export function useJobDetail(id?: string) {
  return useQuery({
    queryKey: id ? candidateQueryKeys.jobs.detail(id) : candidateQueryKeys.jobs.all,
    queryFn: ({ signal }) => {
      if (!id) throw new Error("Job ID is required");
      return jobService().detail(id, signal);
    },
    enabled: Boolean(id),
  });
}
