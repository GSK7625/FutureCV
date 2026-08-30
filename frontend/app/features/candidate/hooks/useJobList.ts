import { useQuery } from "@tanstack/react-query";
import { jobService } from "../services/jobService";
import { candidateQueryKeys } from "../queries/candidateQueryKeys";
import type { JobFilters } from "../types";

export function useJobList(filters: JobFilters) {
  return useQuery({
    queryKey: candidateQueryKeys.jobs.list(filters),
    queryFn: () => jobService().list(filters),
    placeholderData: (prev) => prev,
  });
}
