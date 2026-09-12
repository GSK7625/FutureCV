import { useQuery } from "@tanstack/react-query";
import { masterDataApi } from "~/services/api";

export const MASTER_DATA_KEYS = {
  jobCategories: ["master-data", "job-categories"] as const,
  jobLevels: ["master-data", "job-levels"] as const,
  employmentTypes: ["master-data", "employment-types"] as const,
  locations: ["master-data", "locations"] as const,
  skills: (search?: string, categoryId?: string) =>
    ["master-data", "skills", { search, categoryId }] as const,
};

// ============================================
// MASTER DATA HOOKS
// ============================================

export function useJobCategories() {
  return useQuery({
    queryKey: MASTER_DATA_KEYS.jobCategories,
    queryFn: () => masterDataApi.getJobCategories(),
    staleTime: 1000 * 60 * 60, // Cache 1 hour
  });
}

export function useJobLevels() {
  return useQuery({
    queryKey: MASTER_DATA_KEYS.jobLevels,
    queryFn: () => masterDataApi.getJobLevels(),
    staleTime: 1000 * 60 * 60,
  });
}

export function useEmploymentTypes() {
  return useQuery({
    queryKey: MASTER_DATA_KEYS.employmentTypes,
    queryFn: () => masterDataApi.getEmploymentTypes(),
    staleTime: 1000 * 60 * 60,
  });
}

export function useLocations() {
  return useQuery({
    queryKey: MASTER_DATA_KEYS.locations,
    queryFn: () => masterDataApi.getLocations(),
    staleTime: 1000 * 60 * 60,
  });
}

export function useSkills(search?: string, categoryId?: string) {
  return useQuery({
    queryKey: MASTER_DATA_KEYS.skills(search, categoryId),
    queryFn: () => masterDataApi.getSkills({ search, categoryId }),
    staleTime: 1000 * 60 * 5, // Cache 5 minutes
    enabled: search !== undefined || categoryId !== undefined,
  });
}
