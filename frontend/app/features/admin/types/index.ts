export interface DashboardStats {
  totalUsers: number;
  totalCandidates: number;
  totalEmployers: number;
  totalAdmins: number;
  activeUsers: number;
  lockedUsers: number;
  totalCompanies: number;
  verifiedCompanies: number;
  pendingCompanies: number;
  rejectedCompanies: number;
  totalJobs: number;
  activeJobs: number;
  pendingJobs: number;
  closedJobs: number;
  rejectedJobs: number;
  totalApplications: number;
  userGrowthLast7Days: Array<{ date: string; count: number }>;
  jobGrowthLast7Days: Array<{ date: string; count: number }>;
}

export interface UserFilters {
  search?: string;
  role?: "Admin" | "Employer" | "Candidate" | "";
  status?: "active" | "locked" | "";
  emailConfirmed?: boolean;
  isLocked?: boolean;
  page?: number;
  pageIndex?: number;
  pageSize?: number;
}

export interface UserListItem {
  id: string;
  email: string;
  fullName: string | null;
  roles: string[];
  isLockedOut: boolean;
  lockoutEnd: string | null;
  createdAt: string;
}

export interface CompanyFilters {
  search?: string;
  verificationStatus?: "Verified" | "Pending" | "Rejected" | "";
  verifiedStatus?: "Verified" | "Pending" | "Rejected" | "";
  page?: number;
  pageIndex?: number;
  pageSize?: number;
}

export interface CompanyListItem {
  id: string;
  name: string;
  taxCode: string;
  logoUrl: string | null;
  industry: string | null;
  scale: string | null;
  verifiedStatus: string;
  verifiedAt: string | null;
  employerCount: number;
  jobCount: number;
  createdAt: string;
}

export interface JobFilters {
  search?: string;
  status?: "Approved" | "Pending" | "Rejected" | "Draft" | "";
  approvalStatus?: "Approved" | "Pending" | "Rejected" | "Draft" | "";
  isActive?: boolean;
  page?: number;
  pageIndex?: number;
  pageSize?: number;
}

export interface JobListItem {
  id: string;
  title: string;
  companyName: string;
  companyLogoUrl: string | null;
  locationName: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string;
  approvalStatus: string;
  isActive: boolean;
  viewCount: number;
  deadline: string | null;
  postedAt: string | null;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  pageIndex: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export type PagedResult<T> = PaginatedResponse<T>;
