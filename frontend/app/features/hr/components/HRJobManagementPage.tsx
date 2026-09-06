import { useState } from 'react';
import { useJobs, useDeleteJob, useToggleJobStatus } from '~/hooks/useJobs';
import type { Job, JobFilters } from '~/types/job';
import { CreateJobModal } from './CreateJobModal';
import { EditJobModal } from './EditJobModal';

/**
 * FCV-82: HR Job Management Page Component
 * Hiển thị danh sách Job của Recruiter với filter, search, CRUD
 */
export function HRJobManagementPage() {
  const [filters, setFilters] = useState<JobFilters>({
    page: 1,
    pageSize: 10,
  });
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const { data, isLoading, error } = useJobs(filters);
  const toggleStatus = useToggleJobStatus();
  const deleteJob = useDeleteJob();
  
  const jobs = data?.items || [];
  const totalPages = data?.totalPages || 0;

  const handleSearch = (searchTerm: string) => {
    setFilters({ ...filters, search: searchTerm, page: 1 });
  };

  const handleFilterChange = (key: keyof JobFilters, value: any) => {
    setFilters({ ...filters, [key]: value, page: 1 });
  };

  const handlePageChange = (page: number) => {
    setFilters({ ...filters, page });
  };

  const handleToggleStatus = async (job: Job) => {
    try {
      await toggleStatus.mutateAsync(job.id);
    } catch (error) {
      console.error('Failed to toggle job status:', error);
    }
  };

  const handleDelete = async (jobId: string) => {
    if (!confirm('Bạn có chắc muốn xóa tin tuyển dụng này?')) return;
    
    try {
      await deleteJob.mutateAsync(jobId);
    } catch (error) {
      console.error('Failed to delete job:', error);
    }
  };

  const handleEdit = (job: Job) => {
    setSelectedJob(job);
    setShowEditModal(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Đang tải danh sách công việc...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-400 mb-4">Có lỗi xảy ra khi tải danh sách</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-50 mb-2">Quản lý tin tuyển dụng</h1>
            <p className="text-slate-400">Quản lý các tin tuyển dụng của bạn</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-cyan-500 text-white rounded-lg font-medium hover:bg-cyan-600 transition-colors"
          >
            + Đăng tin mới
          </button>
        </div>

        {/* Filter Bar */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <input
                type="text"
                placeholder="Tìm kiếm theo tiêu đề..."
                value={filters.search || ''}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={filters.status || ''}
                onChange={(e) => handleFilterChange('status', e.target.value || undefined)}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500"
              >
                <option value="">Tất cả trạng thái</option>
                <option value="Pending">Chờ duyệt</option>
                <option value="Approved">Đã duyệt</option>
                <option value="Rejected">Từ chối</option>
              </select>
            </div>

            {/* Active Filter */}
            <div>
              <select
                value={filters.isActive?.toString() || ''}
                onChange={(e) => handleFilterChange('isActive', e.target.value ? e.target.value === 'true' : undefined)}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500"
              >
                <option value="">Tất cả</option>
                <option value="true">Đang hoạt động</option>
                <option value="false">Đã đóng</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Job List */}
      <div className="max-w-7xl mx-auto">
        {jobs && jobs.length === 0 ? (
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-12 text-center">
            <p className="text-slate-400 mb-4">Chưa có tin tuyển dụng nào</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors"
            >
              Đăng tin đầu tiên
            </button>
          </div>
        ) : (
          <>
            <div className="grid gap-4 mb-6">
              {jobs?.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  onToggleStatus={handleToggleStatus}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => handlePageChange((filters.page || 1) - 1)}
                disabled={!data?.hasPreviousPage}
                className="px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-800"
              >
                Trước
              </button>
              
              <span className="text-slate-400">
                Trang {filters.page || 1} / {totalPages || 1}
              </span>

              <button
                onClick={() => handlePageChange((filters.page || 1) + 1)}
                disabled={!data?.hasNextPage}
                className="px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-800"
              >
                Sau
              </button>
            </div>
          </>
        )}
      </div>

      {/* Modals */}
      {showCreateModal && <CreateJobModal onClose={() => setShowCreateModal(false)} />}
      {showEditModal && selectedJob && <EditJobModal job={selectedJob} onClose={() => setShowEditModal(false)} />}
    </div>
  );
}

/**
 * Job Card Component
 */
interface JobCardProps {
  job: Job;
  onToggleStatus: (job: Job) => void;
  onEdit: (job: Job) => void;
  onDelete: (jobId: string) => void;
}

function JobCard({ job, onToggleStatus, onEdit, onDelete }: JobCardProps) {
  const statusColors = {
    Pending: 'bg-yellow-900/30 text-yellow-400 border border-yellow-700',
    Approved: 'bg-green-900/30 text-green-400 border border-green-700',
    Rejected: 'bg-red-900/30 text-red-400 border border-red-700',
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  const isExpired = job.deadline ? new Date(job.deadline) < new Date() : false;

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 hover:border-slate-700 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-xl font-semibold text-slate-50">{job.title}</h3>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[job.approvalStatus]}`}>
              {job.approvalStatus === 'Pending' ? 'Chờ duyệt' : job.approvalStatus === 'Approved' ? 'Đã duyệt' : 'Từ chối'}
            </span>
            {job.isActive && (
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-900/30 text-green-400 border border-green-700">
                Đang mở
              </span>
            )}
            {!job.isActive && (
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-700 text-slate-300">
                Đã đóng
              </span>
            )}
            {isExpired && (
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-orange-900/30 text-orange-400 border border-orange-700">
                Hết hạn
              </span>
            )}
          </div>
          
          <div className="flex flex-wrap gap-4 text-sm text-slate-400 mb-3">
            {job.company && <span>🏢 {job.company.name}</span>}
            {job.locationName && <span>📍 {job.locationName}</span>}
            {job.levelName && <span>💼 {job.levelName}</span>}
            {job.employmentTypeName && <span>⏰ {job.employmentTypeName}</span>}
          </div>

          <div className="text-sm text-slate-400 mb-3">
            <span className="text-cyan-400 font-medium">
              {job.salaryMin.toLocaleString()} - {job.salaryMax.toLocaleString()} {job.salaryCurrency}
            </span>
          </div>

          <p className="text-sm text-slate-400 line-clamp-2 mb-3">
            {job.description}
          </p>
        </div>

        <div className="flex flex-col gap-2 ml-4">
          <button
            onClick={() => onEdit(job)}
            className="px-4 py-2 bg-slate-800 text-slate-100 rounded-lg text-sm hover:bg-slate-700 transition-colors"
          >
            Sửa
          </button>
          <button
            onClick={() => onToggleStatus(job)}
            className="px-4 py-2 bg-slate-800 text-slate-100 rounded-lg text-sm hover:bg-slate-700 transition-colors"
          >
            {job.isActive ? 'Đóng tin' : 'Mở tin'}
          </button>
          <button
            onClick={() => onDelete(job.id)}
            className="px-4 py-2 bg-red-900/30 text-red-400 rounded-lg text-sm hover:bg-red-900/50 transition-colors border border-red-700"
          >
            Xóa
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-slate-800 text-sm text-slate-400">
        <div>
          <span>👁️ {job.viewCount || 0} lượt xem</span>
          <span className="ml-4">📦 {job.positionsCount} vị trí</span>
          {job.deadline && (
            <span className="ml-4">
              ⏰ Hết hạn: {formatDate(job.deadline)}
            </span>
          )}
        </div>
        <div>
          Đăng: {formatDate(job.createdAt)}
        </div>
      </div>
    </div>
  );
}
