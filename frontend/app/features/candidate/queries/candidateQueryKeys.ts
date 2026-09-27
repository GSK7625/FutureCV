export const candidateQueryKeys = {
  jobs: {
    all: ["candidate", "jobs"] as const,
    list: (filters: unknown) => ["candidate", "jobs", "list", filters] as const,
    detail: (id: string) => ["candidate", "jobs", "detail", id] as const,
    masterData: ["candidate", "jobs", "master-data"] as const,
  },
  applications: {
    all: ["candidate", "applications"] as const,
  },
  profile: ["candidate", "profile"] as const,
};
