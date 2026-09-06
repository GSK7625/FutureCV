import { create } from 'zustand';
import type { JobFilterRequest, ApplicationFilterRequest } from '../types';

interface HRFilterState {
  // Job filters
  jobFilter: JobFilterRequest;
  setJobFilter: (filter: Partial<JobFilterRequest>) => void;
  resetJobFilter: () => void;

  // Application filters
  applicationFilter: ApplicationFilterRequest;
  setApplicationFilter: (filter: Partial<ApplicationFilterRequest>) => void;
  resetApplicationFilter: () => void;
}

const defaultJobFilter: JobFilterRequest = {
  keyword: '',
  approvalStatus: undefined,
  isActive: undefined,
  pageIndex: 1,
  pageSize: 10,
};

const defaultApplicationFilter: ApplicationFilterRequest = {
  status: undefined,
  keyword: '',
  fromDate: undefined,
  toDate: undefined,
  sortBy: 'newest',
  pageIndex: 1,
  pageSize: 10,
};

/**
 * Zustand store để quản lý filter state cho HR module
 */
export const useHRFilterStore = create<HRFilterState>((set) => ({
  jobFilter: defaultJobFilter,
  setJobFilter: (filter) =>
    set((state) => ({
      jobFilter: { ...state.jobFilter, ...filter },
    })),
  resetJobFilter: () => set({ jobFilter: defaultJobFilter }),

  applicationFilter: defaultApplicationFilter,
  setApplicationFilter: (filter) =>
    set((state) => ({
      applicationFilter: { ...state.applicationFilter, ...filter },
    })),
  resetApplicationFilter: () => set({ applicationFilter: defaultApplicationFilter }),
}));
