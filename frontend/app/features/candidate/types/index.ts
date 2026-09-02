export interface Job {
  id: string;
  title: string;
  company: string;
  companyLogo?: string;
  location: string;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryText?: string;
  jobType: string;
  experience: string;
  categories: string[];
  postedAt: string;
  hot?: boolean;
  verified?: boolean;
  level?: string;
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
  benefits?: string[];
}

export interface JobFilters {
  keyword?: string;
  category?: string[];
  location?: string[];
  jobType?: string[];
  page?: number;
  pageSize?: number;
}

export interface JobListResult {
  items: Job[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ApplicationDto {
  jobId: string;
  fullName: string;
  email: string;
  phone: string;
  coverLetter?: string;
  cvFileName?: string;
}
