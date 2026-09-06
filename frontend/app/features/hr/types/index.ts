// =====================================================================
// Job Management Types for HR/Recruiter
// =====================================================================

export interface Job {
  id: string;
  companyId: string;
  company: JobCompany;
  postedById: string;
  title: string;
  description: string;
  requirements: string | null;
  benefits: string | null;
  categoryId: string | null;
  categoryName: string | null;
  levelId: string | null;
  levelName: string | null;
  employmentTypeId: string | null;
  employmentTypeName: string | null;
  locationId: string | null;
  locationName: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string;
  experienceYearsMin: number | null;
  experienceYearsMax: number | null;
  deadline: string | null;
  positionsCount: number;
  approvalStatus: 'Draft' | 'Pending' | 'Approved' | 'Rejected';
  isActive: boolean;
  isExpired: boolean;
  viewCount: number;
  createdAt: string;
  updatedAt: string | null;
  skills: JobSkill[];
}

export interface JobCompany {
  id: string;
  name: string;
  logoUrl: string | null;
  address: string | null;
  industry: string | null;
  scale: string | null;
  verifiedStatus: string;
}

export interface JobSkill {
  id: string;
  name: string;
  isRequired: boolean;
}

export interface JobListItem {
  id: string;
  companyId: string;
  companyName: string;
  companyLogoUrl: string | null;
  title: string;
  categoryName: string | null;
  levelName: string | null;
  employmentTypeName: string | null;
  locationName: string | null;
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
  requiredSkills: string[];
}

export interface CreateJobRequest {
  title: string;
  description: string;
  requirements?: string;
  benefits?: string;
  categoryId?: string;
  levelId?: string;
  employmentTypeId?: string;
  locationId?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  experienceYearsMin?: number;
  experienceYearsMax?: number;
  deadline?: string;
  positionsCount?: number;
  skills?: { skillId: string; isRequired: boolean }[];
}

export interface UpdateJobRequest extends CreateJobRequest {}

export interface JobFilterRequest {
  keyword?: string;
  approvalStatus?: string;
  isActive?: boolean;
  pageIndex?: number;
  pageSize?: number;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
  totalPages: number;
}

// =====================================================================
// Application Management Types
// =====================================================================

export interface Application {
  id: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string | null;
  candidatePhone: string | null;
  jobId: string;
  jobTitle: string;
  companyName: string;
  status: ApplicationStatus;
  matchScore: number | null;
  manualRating: number | null;
  appliedAt: string;
  lastStatusChangedAt: string | null;
}

export type ApplicationStatus = 
  | 'Applied' 
  | 'Screening' 
  | 'Interview' 
  | 'Offer' 
  | 'Rejected' 
  | 'Withdrawn';

export interface ApplicationDetail {
  id: string;
  candidateId: string;
  jobId: string;
  cvId: string;
  candidate: ApplicationCandidate;
  job: ApplicationJob;
  cv: ApplicationCV;
  coverLetter: string | null;
  matchScore: number | null;
  matchExplanation: string | null;
  matchedSkills: string[] | null;
  missingSkills: string[] | null;
  status: ApplicationStatus;
  appliedAt: string;
  lastStatusChangedAt: string | null;
  ranking: CandidateRanking | null;
  statusHistory: StatusHistory[];
}

export interface ApplicationCandidate {
  id: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  avatarUrl: string | null;
  summary: string | null;
  desiredPosition: string | null;
  desiredSalaryMin: number | null;
  desiredSalaryMax: number | null;
}

export interface ApplicationJob {
  id: string;
  title: string;
  companyName: string;
  companyLogoUrl: string | null;
  locationName: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string;
  deadline: string | null;
  isActive: boolean;
  isExpired: boolean;
}

export interface ApplicationCV {
  id: string;
  title: string | null;
  fileUrl: string | null;
  fileType: string | null;
}

export interface CandidateRanking {
  id: string;
  rankPosition: number;
  score: number;
  manualRating: number | null;
  reviewComment: string | null;
  tags: string[] | null;
  rankedByName: string | null;
  computedAt: string;
}

export interface StatusHistory {
  id: string;
  fromStatus: string;
  toStatus: string;
  reason: string | null;
  comment: string | null;
  changedByName: string | null;
  changedAt: string;
}

export interface RankCandidateRequest {
  manualRating: number; // 1-5 stars
  reviewComment?: string;
  tags?: string[];
  privateNotes?: string;
}

export interface UpdateApplicationStatusRequest {
  newStatus: ApplicationStatus;
  reason?: string;
  comment?: string;
  sendNotification?: boolean;
}

// =====================================================================
// Pipeline Types
// =====================================================================

export interface PipelineDashboard {
  jobId: string;
  jobTitle: string;
  totalApplications: number;
  activeApplications: number;
  stages: PipelineStageStats[];
  candidatesByStage: Record<ApplicationStatus, PipelineCandidateCard[]>;
}

export interface PipelineStageStats {
  stageName: string;
  status: ApplicationStatus;
  count: number;
  avgDaysInStage: number;
}

export interface PipelineCandidateCard {
  applicationId: string;
  candidateId: string;
  candidateName: string;
  candidateAvatar: string | null;
  status: ApplicationStatus;
  matchScore: number | null;
  manualRating: number | null;
  tags: string[] | null;
  daysInCurrentStage: number;
  appliedAt: string;
}

export interface MoveCandidateStageRequest {
  applicationId: string;
  newStage: ApplicationStatus;
  reason?: string;
}

export interface ApplicationFilterRequest {
  status?: ApplicationStatus;
  keyword?: string;
  fromDate?: string;
  toDate?: string;
  sortBy?: 'newest' | 'oldest' | 'status' | 'rating';
  pageIndex?: number;
  pageSize?: number;
}
