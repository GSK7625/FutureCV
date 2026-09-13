/**
 * @file index.ts
 * @description Candidate Domain Types & Backend API DTOs.
 */

export interface ApiPaged<T> {
  items: T[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface ApiJobListItem {
  id: string;
  companyId: string;
  companyName: string;
  companyLogoUrl?: string | null;
  title: string;
  categoryName?: string | null;
  levelName?: string | null;
  employmentTypeName?: string | null;
  locationName?: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  experienceYearsMin: number | null;
  experienceYearsMax: number | null;
  deadline: string | null;
  positionsCount: number;
  approvalStatus: string;
  isActive: boolean;
  isExpired: boolean;
  viewCount: number;
  createdAt: string;
  requiredSkills: string[];
}

export interface ApiJobCompany {
  id: string;
  name: string;
  logoUrl?: string | null;
  address?: string | null;
  industry?: string | null;
  scale?: string | null;
  verifiedStatus: string;
}

export interface ApiJobSkill {
  skillId: string;
  skillName: string;
  category?: string | null;
  isRequired: boolean;
}

export interface ApiJobDetail {
  id: string;
  companyId: string;
  company: ApiJobCompany;
  postedById: string;
  title: string;
  description: string;
  requirements?: string | null;
  benefits?: string | null;
  categoryId?: string | null;
  categoryName?: string | null;
  levelId?: string | null;
  levelName?: string | null;
  employmentTypeId?: string | null;
  employmentTypeName?: string | null;
  locationId?: string | null;
  locationName?: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string;
  experienceYearsMin: number | null;
  experienceYearsMax: number | null;
  deadline: string | null;
  positionsCount: number;
  approvalStatus: string;
  isActive: boolean;
  isExpired: boolean;
  viewCount: number;
  createdAt: string;
  updatedAt?: string | null;
  skills: ApiJobSkill[];
}

export interface LookupOption {
  id: string;
  name: string;
}

export interface JobMasterData {
  categories: LookupOption[];
  levels: LookupOption[];
  employmentTypes: LookupOption[];
  locations: LookupOption[];
  isDemoFallback?: boolean;
}

export interface Job {
  id: string;
  companyId?: string;
  title: string;
  company: string;
  companyLogo?: string;
  location: string;
  locationId?: string;
  salaryMin?: number | null; // In Millions VND for UI presentation
  salaryMax?: number | null; // In Millions VND for UI presentation
  salaryRawMin?: number | null; // In raw VND
  salaryRawMax?: number | null; // In raw VND
  salaryText?: string;
  salaryCurrency?: string;
  jobType: string;
  employmentTypeId?: string;
  experience: string;
  experienceYearsMin?: number | null;
  experienceYearsMax?: number | null;
  categories: string[];
  categoryId?: string;
  categoryName?: string;
  level?: string;
  levelId?: string;
  postedAt: string;
  hot?: boolean;
  verified?: boolean;
  deadline?: string;
  quantity?: string;
  gender?: string;
  workAddress?: string;
  companyWebsite?: string;
  companySize?: string;
  companyIndustry?: string;
  matchRate?: number;
  description?: string;
  descriptionList?: string[];
  requirements?: string[];
  requirementsText?: string;
  benefits?: string[];
  benefitsText?: string;
  skills?: string[];
  viewCount?: number;
  isDemoFallback?: boolean;
}

export interface JobFilters {
  keyword?: string;
  categoryId?: string;
  levelId?: string;
  employmentTypeId?: string;
  locationId?: string;
  salaryMin?: number; // Raw VND or mapped when building params
  salaryMax?: number; // Raw VND
  sortBy?: "newest" | "salary_desc" | "deadline" | string;
  page?: number;
  pageSize?: number;
}

export interface JobListResult {
  items: Job[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
  isDemoFallback?: boolean;
}

export interface ApplicationDto {
  jobId: string;
  fullName: string;
  email: string;
  phone: string;
  coverLetter?: string;
  cvFileName?: string;
}
