import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUIStore } from '~/stores/useUIStore';
import * as jobService from '../services/jobService';
import type { CreateJobDto, UpdateJobDto, JobFilters } from '../types/job.types';

/**
 * FCV-82: Job Management Hooks
 * React Query hooks cho Job CRUD operations
 */

// Query key factory
export const jobKeys = {
  all: ['jobs'] as const,
  lists: () => [...jobKeys.all, 'list'] as const,
  list: (filters?: JobFilters) => [...jobKeys.lists(), filters] as const,
  details: () => [...jobKeys.all, 'detail'] as const,
  detail: (id: string) => [...jobKeys.details(), id] as const,
};

// Hook: Lấy danh sách jobs
export function useJobs(filters?: JobFilters) {
  return useQuery({
    queryKey: jobKeys.list(filters),
    queryFn: () => jobService.getJobs(filters),
  });
}

// Hook: Lấy chi tiết job
export function useJob(id: string) {
  return useQuery({
    queryKey: jobKeys.detail(id),
    queryFn: () => jobService.getJobById(id),
    enabled: !!id,
  });
}

// Hook: Tạo job mới
export function useCreateJob() {
  const queryClient = useQueryClient();
  const addToast = useUIStore((state) => state.addToast);

  return useMutation({
    mutationFn: (data: CreateJobDto) => jobService.createJob(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jobKeys.lists() });
      addToast({
        type: 'success',
        message: 'Tạo tin tuyển dụng thành công!',
      });
    },
    onError: (error: any) => {
      addToast({
        type: 'error',
        message: error.message || 'Tạo tin tuyển dụng thất bại',
      });
    },
  });
}

// Hook: Cập nhật job
export function useUpdateJob() {
  const queryClient = useQueryClient();
  const addToast = useUIStore((state) => state.addToast);

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateJobDto }) =>
      jobService.updateJob(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: jobKeys.lists() });
      queryClient.invalidateQueries({ queryKey: jobKeys.detail(variables.id) });
      addToast({
        type: 'success',
        message: 'Cập nhật tin tuyển dụng thành công!',
      });
    },
    onError: (error: any) => {
      addToast({
        type: 'error',
        message: error.message || 'Cập nhật tin tuyển dụng thất bại',
      });
    },
  });
}

// Hook: Xóa job
export function useDeleteJob() {
  const queryClient = useQueryClient();
  const addToast = useUIStore((state) => state.addToast);

  return useMutation({
    mutationFn: (id: string) => jobService.deleteJob(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jobKeys.lists() });
      addToast({
        type: 'success',
        message: 'Xóa tin tuyển dụng thành công!',
      });
    },
    onError: (error: any) => {
      addToast({
        type: 'error',
        message: error.message || 'Xóa tin tuyển dụng thất bại',
      });
    },
  });
}

// Hook: Đóng job
export function useCloseJob() {
  const queryClient = useQueryClient();
  const addToast = useUIStore((state) => state.addToast);

  return useMutation({
    mutationFn: (id: string) => jobService.closeJob(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: jobKeys.lists() });
      queryClient.invalidateQueries({ queryKey: jobKeys.detail(id) });
      addToast({
        type: 'success',
        message: 'Đóng tin tuyển dụng thành công!',
      });
    },
    onError: (error: any) => {
      addToast({
        type: 'error',
        message: error.message || 'Đóng tin tuyển dụng thất bại',
      });
    },
  });
}

// Hook: Mở lại job
export function useReopenJob() {
  const queryClient = useQueryClient();
  const addToast = useUIStore((state) => state.addToast);

  return useMutation({
    mutationFn: (id: string) => jobService.reopenJob(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: jobKeys.lists() });
      queryClient.invalidateQueries({ queryKey: jobKeys.detail(id) });
      addToast({
        type: 'success',
        message: 'Mở lại tin tuyển dụng thành công!',
      });
    },
    onError: (error: any) => {
      addToast({
        type: 'error',
        message: error.message || 'Mở lại tin tuyển dụng thất bại',
      });
    },
  });
}
