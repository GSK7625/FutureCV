export interface Company {
  id: string;
  name: string;
  logoUrl: string | null;
  address: string | null;
  industry: string | null;
  scale: string | null;
  verifiedStatus: 'Unverified' | 'Verified' | 'Rejected';
}

export interface Job {
  id: string;
  companyId: string;
  company: Company;
  postedById: string;
  title: string;
  description: string;
  requirements: string;
  benefits: string;
  categoryId: string | null;
  categoryName: string | null;
  levelId: string | null;
  levelName: string | null;
  employmentTypeId: string | null;
  employmentTypeName: string | null;
  locationId: string | null;
  locationName: string | null;
  salaryMin: number;
  salaryMax: number;
  salaryCurrency: string;
  experienceYearsMin: number | null;
  experienceYearsMax: number | null;
  deadline: string | null;
  positionsCount: number;
  approvalStatus: 'Pending' | 'Approved' | 'Rejected';
  isActive: boolean;
  isExpired: boolean;
  viewCount: number;
  createdAt: string;
  updatedAt: string | null;
  skills: string[];
}

export interface JobFilters {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  isActive?: boolean;
}

export interface JobsResponse {
  items: Job[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface CreateJobRequest {
  title: string;
  description: string;
  requirements: string;
  benefits: string;
  location?: string;
  salaryMin: number;
  salaryMax: number;
  salaryCurrency: string;
  experienceLevel?: string;
  employmentType?: string;
  closingDate?: string;
}

export interface UpdateJobRequest extends Partial<CreateJobRequest> {}
