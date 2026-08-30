import { create } from "zustand";

interface CandidateFilterState {
  keyword: string;
  categories: string[];
  locations: string[];
  jobTypes: string[];
  setKeyword: (keyword: string) => void;
  toggleCategory: (category: string) => void;
  toggleLocation: (location: string) => void;
  toggleJobType: (type: string) => void;
  clearAll: () => void;
}

export const useCandidateFilterStore = create<CandidateFilterState>((set, get) => ({
  keyword: "",
  categories: [],
  locations: [],
  jobTypes: [],
  setKeyword: (keyword) => set({ keyword }),
  toggleCategory: (category) =>
    set({
      categories: get().categories.includes(category)
        ? get().categories.filter((c) => c !== category)
        : [...get().categories, category],
    }),
  toggleLocation: (location) =>
    set({
      locations: get().locations.includes(location)
        ? get().locations.filter((l) => l !== location)
        : [...get().locations, location],
    }),
  toggleJobType: (jobType) =>
    set({
      jobTypes: get().jobTypes.includes(jobType)
        ? get().jobTypes.filter((t) => t !== jobType)
        : [...get().jobTypes, jobType],
    }),
  clearAll: () => set({ keyword: "", categories: [], locations: [], jobTypes: [] }),
}));
