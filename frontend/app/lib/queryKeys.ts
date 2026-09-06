/**
 * Centralized query keys for TanStack Query
 * Sử dụng factory pattern để tránh hardcode string
 */

export const queryKeys = {
  // Auth
  auth: {
    me: () => ['auth', 'me'] as const,
  },

  // Jobs
  jobs: {
    all: () => ['jobs'] as const,
    list: (filters?: Record<string, any>) => ['jobs', 'list', filters] as const,
    detail: (id: string) => ['jobs', 'detail', id] as const,
    byCompany: (companyId: string) => ['jobs', 'company', companyId] as const,
  },

  // Candidate
  candidate: {
    profile: () => ['candidate', 'profile'] as const,
    applications: () => ['candidate', 'applications'] as const,
    application: (id: string) => ['candidate', 'application', id] as const,
  },

  // HR
  hr: {
    jobs: () => ['hr', 'jobs'] as const,
    candidates: (jobId: string) => ['hr', 'candidates', jobId] as const,
    interviews: () => ['hr', 'interviews'] as const,
  },

  // Admin
  admin: {
    users: () => ['admin', 'users'] as const,
    roles: () => ['admin', 'roles'] as const,
    permissions: () => ['admin', 'permissions'] as const,
  },
};
