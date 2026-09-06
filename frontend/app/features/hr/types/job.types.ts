/**
 * FCV-82: Job Types
 * Định nghĩa types cho Job Management
 */

export type JobStatus = 'Open' | 'Closed' | 'Draft';

export interface Job {
  id: string;
  title: string;
  description: string;
  location: string;
  salaryRange: string;
  requirements: string;
  benefits: string;
  employmentType: string;
  experienceLevel: string;
  status: JobStatus;
  postedDate: string;
  closingDate: string;
  employerId: string;
  employerName?: string;
  applicationCount?: number;
  viewCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateJobDto {
  title: string;
  description: string;
  location: string;
  salaryRange: string;
  requirements: string;
  benefits: string;
  employmentType: string;
  experienceLevel: string;
  closingDate: string;
}

export interface UpdateJobDto extends Partial<CreateJobDto> {
  status?: JobStatus;
}

export interface JobFilters {
  status?: JobStatus;
  location?: string;
  searchTerm?: string;
  page?: number;
  pageSize?: number;
}
