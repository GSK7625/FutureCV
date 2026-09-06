import { create } from "zustand";

interface CandidateFilterState {
  keyword: string;
  categories: string[];
  locations: string[];
  jobTypes: string[];
  setKeyword: (keyword: string) => void;
  setLocations: (locations: string[]) => void;
  toggleCategory: (category: string) => void;
  toggleLocation: (location: string) => void;
  toggleJobType: (type: string) => void;
  clearAll: () => void;
}

export const useCandidateFilterStore = create<CandidateFilterState>((set) => ({
  keyword: "",
  categories: [],
  locations: [],
  jobTypes: [],
  setKeyword: (keyword) => set({ keyword }),
  setLocations: (locations) => set({ locations }),
  toggleCategory: (category) =>
    set((state) => ({
      categories: state.categories.includes(category)
        ? state.categories.filter((c) => c !== category)
        : [...state.categories, category],
    })),
  toggleLocation: (location) =>
    set((state) => ({
      locations: state.locations.includes(location)
        ? state.locations.filter((l) => l !== location)
        : [...state.locations, location],
    })),
  toggleJobType: (jobType) =>
    set((state) => ({
      jobTypes: state.jobTypes.includes(jobType)
        ? state.jobTypes.filter((t) => t !== jobType)
        : [...state.jobTypes, jobType],
    })),
  clearAll: () => set({ keyword: "", categories: [], locations: [], jobTypes: [] }),
}));
