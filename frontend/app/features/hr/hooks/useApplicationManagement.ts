import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { hrApplicationService } from '../services/hrApplicationService';
import type {
  ApplicationFilterRequest,
  RankCandidateRequest,
  UpdateApplicationStatusRequest,
  MoveCandidateStageRequest,
} from '../types';

const HR_APP_KEYS = {
  all: ['hr', 'applications'] as const,
  lists: () => [...HR_APP_KEYS.all, 'list'] as const,
  list: (filter: ApplicationFilterRequest) => [...HR_APP_KEYS.lists(), filter] as const,
  jobList: (jobId: string, filter: ApplicationFilterRequest) => 
    [...HR_APP_KEYS.lists(), 'job', jobId, filter] as const,
  details: () => [...HR_APP_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...HR_APP_KEYS.details(), id] as const,
  pipeline: (jobId: string) => [...HR_APP_KEYS.all, 'pipeline', jobId] as const,
};

/**
 * Hook để lấy danh sách Applications cho một Job
 */
export function useJobApplications(jobId: string, filter: ApplicationFilterRequest = {}) {
  return useQuery({
    queryKey: HR_APP_KEYS.jobList(jobId, filter),
    queryFn: () => hrApplicationService.getJobApplications(jobId, filter),
    enabled: !!jobId,
  });
}

/**
 * Hook để lấy tất cả Applications của Recruiter
 */
export function useAllApplications(filter: ApplicationFilterRequest = {}) {
  return useQuery({
    queryKey: HR_APP_KEYS.list(filter),
    queryFn: () => hrApplicationService.getAllApplications(filter),
  });
}

/**
 * Hook để lấy chi tiết Application
 */
export function useApplicationDetail(applicationId: string) {
  return useQuery({
    queryKey: HR_APP_KEYS.detail(applicationId),
    queryFn: () => hrApplicationService.getApplicationDetail(applicationId),
    enabled: !!applicationId,
  });
}

/**
 * Hook để xếp hạng Candidate
 */
export function useRankCandidate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ applicationId, data }: { applicationId: string; data: RankCandidateRequest }) =>
      hrApplicationService.rankCandidate(applicationId, data),
    onSuccess: (_, variables) => {
      // Invalidate application detail and lists
      queryClient.invalidateQueries({ queryKey: HR_APP_KEYS.detail(variables.applicationId) });
      queryClient.invalidateQueries({ queryKey: HR_APP_KEYS.lists() });
    },
  });
}

/**
 * Hook để cập nhật trạng thái Application
 */
export function useUpdateApplicationStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ 
      applicationId, 
      data 
    }: { 
      applicationId: string; 
      data: UpdateApplicationStatusRequest 
    }) =>
      hrApplicationService.updateApplicationStatus(applicationId, data),
    onSuccess: (_, variables) => {
      // Invalidate application detail, lists, and pipeline
      queryClient.invalidateQueries({ queryKey: HR_APP_KEYS.detail(variables.applicationId) });
      queryClient.invalidateQueries({ queryKey: HR_APP_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: HR_APP_KEYS.all }); // Invalidate pipeline too
    },
  });
}

/**
 * Hook để lấy Pipeline Dashboard
 */
export function usePipelineDashboard(jobId: string) {
  return useQuery({
    queryKey: HR_APP_KEYS.pipeline(jobId),
    queryFn: () => hrApplicationService.getPipelineDashboard(jobId),
    enabled: !!jobId,
  });
}

/**
 * Hook để di chuyển Candidate giữa các stage
 */
export function useMoveCandidateStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: MoveCandidateStageRequest) =>
      hrApplicationService.moveCandidateStage(data),
    onSuccess: (result) => {
      // Invalidate pipeline, application detail, and lists
      queryClient.invalidateQueries({ queryKey: HR_APP_KEYS.pipeline(result.jobId) });
      queryClient.invalidateQueries({ queryKey: HR_APP_KEYS.detail(result.id) });
      queryClient.invalidateQueries({ queryKey: HR_APP_KEYS.lists() });
    },
  });
}
