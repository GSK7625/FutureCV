import { useState } from "react";
import { IconSearch, IconCheck, IconX, IconBriefcase, IconEye, IconMapPin, IconCurrencyDollar } from "@tabler/icons-react";
import { useJobs, useApproveJob, useRejectJob } from "~/features/admin/hooks/useAdminQueries";
import type { JobFilters } from "~/features/admin/types";
import { QueryBoundary } from "~/components/shared/QueryBoundary";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import { Badge } from "~/components/ui/Badge";
import { Modal } from "~/components/ui/Modal";
import { EmptyState } from "~/components/ui/EmptyState";
import { Avatar } from "~/components/ui/Avatar";
import { cn } from "~/lib/cn";

export default function JobsPage() {
  const [filters, setFilters] = useState<JobFilters>({
    search: "",
    status: "",
    page: 1,
    pageSize: 20,
  });

  const handleSearch = (value: string) => {
    setFilters((prev) => ({ ...prev, search: value, page: 1 }));
  };

  const handleFilterChange = (key: keyof JobFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-headline-lg font-bold text-navy">Kiểm duyệt tin tuyển dụng</h1>
        <p className="mt-2 text-body text-ink-muted">
          Xem xét và phê duyệt các tin tuyển dụng được đăng bởi nhà tuyển dụng
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 rounded-default border border-border-subtle bg-surface p-4 shadow-sm sm:flex-row">
        <div className="flex-1">
          <Input
            placeholder="Tìm theo tiêu đề công việc hoặc công ty..."
            value={filters.search}
            onChange={(e) => handleSearch(e.target.value)}
            icon={<IconSearch size={18} />}
          />
        </div>
        <select
          className="rounded-default border border-border-strong bg-surface px-4 py-2 text-body text-navy focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20"
          value={filters.status}
          onChange={(e) => handleFilterChange("status", e.target.value)}
        >
          <option value="">Tất cả trạng thái</option>
          <option value="Pending">Chờ duyệt</option>
          <option value="Approved">Đã duyệt</option>
          <option value="Rejected">Từ chối</option>
          <option value="Draft">Bản nháp</option>
        </select>
      </div>

      <QueryBoundary
        isLoading={false}
        skeleton={<JobTableSkeleton />}
      >
        <JobTable filters={filters} onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))} />
      </QueryBoundary>
    </div>
  );
}

interface JobTableProps {
  filters: JobFilters;
  onPageChange: (page: number) => void;
}

function JobTable({ filters, onPageChange }: JobTableProps) {
  const { data } = useJobs(filters);
  const approveJob = useApproveJob();
  const rejectJob = useRejectJob();
  const [rejectModal, setRejectModal] = useState<{ isOpen: boolean; jobId: string; jobTitle: string }>({
    isOpen: false,
    jobId: "",
    jobTitle: "",
  });
  const [rejectReason, setRejectReason] = useState("");

  if (!data || data.items.length === 0) {
    return (
      <EmptyState
        icon={<IconBriefcase size={48} />}
        title="Không tìm thấy tin tuyển dụng"
        description="Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm"
      />
    );
  }

  const handleApprove = async (jobId: string) => {
    if (confirm("Bạn có chắc muốn phê duyệt tin tuyển dụng này?")) {
      await approveJob.mutateAsync(jobId);
    }
  };

  const handleRejectClick = (jobId: string, jobTitle: string) => {
    setRejectModal({ isOpen: true, jobId, jobTitle });
    setRejectReason("");
  };

  const handleRejectSubmit = async () => {
    if (!rejectReason.trim()) {
      alert("Vui lòng nhập lý do từ chối");
      return;
    }
    await rejectJob.mutateAsync({ jobId: rejectModal.jobId, reason: rejectReason });
    setRejectModal({ isOpen: false, jobId: "", jobTitle: "" });
  };

  const formatSalary = (min: number | null, max: number | null, currency: string) => {
    if (!min && !max) return "Thỏa thuận";
    if (min && max) return `${min.toLocaleString()} - ${max.toLocaleString()} ${currency}`;
    if (min) return `Từ ${min.toLocaleString()} ${currency}`;
    if (max) return `Đến ${max.toLocaleString()} ${currency}`;
    return "Thỏa thuận";
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4">
        {data.items.map((job) => (
          <div
            key={job.id}
            className="rounded-default border border-border-subtle bg-surface p-6 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              {/* Job Info */}
              <div className="flex flex-1 gap-4">
                <Avatar
                  name={job.companyName}
                  size="lg"
                  src={job.companyLogoUrl || undefined}
                />
                <div className="flex-1 space-y-2">
                  <h3 className="text-headline-sm font-semibold text-navy">{job.title}</h3>
                  <p className="text-body font-medium text-ink-variant">{job.companyName}</p>
                  
                  <div className="flex flex-wrap gap-3 text-label-sm text-ink-muted">
                    {job.locationName && (
                      <div className="flex items-center gap-1">
                        <IconMapPin size={16} />
                        {job.locationName}
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <IconCurrencyDollar size={16} />
                      {formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency)}
                    </div>
                    <div className="flex items-center gap-1">
                      <IconEye size={16} />
                      {job.viewCount} lượt xem
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <ApprovalBadge status={job.approvalStatus} />
                    {job.isActive ? (
                      <Badge variant="success">Đang mở</Badge>
                    ) : (
                      <Badge variant="default">Đã đóng</Badge>
                    )}
                    {job.deadline && new Date(job.deadline) < new Date() && (
                      <Badge variant="danger">Hết hạn</Badge>
                    )}
                  </div>

                  <div className="flex gap-3 text-label-sm text-ink-muted">
                    <span>
                      Đăng: {job.postedAt ? new Date(job.postedAt).toLocaleDateString("vi-VN") : "Chưa đăng"}
                    </span>
                    {job.deadline && (
                      <>
                        <span>•</span>
                        <span>Hạn: {new Date(job.deadline).toLocaleDateString("vi-VN")}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 lg:flex-col">
                {job.approvalStatus === "Pending" && (
                  <>
                    <Button
                      size="sm"
                      variant="success"
                      onClick={() => handleApprove(job.id)}
                      disabled={approveJob.isPending}
                      className="flex-1 lg:flex-none"
                    >
                      <IconCheck size={16} />
                      Duyệt
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleRejectClick(job.id, job.title)}
                      disabled={rejectJob.isPending}
                      className="flex-1 lg:flex-none"
                    >
                      <IconX size={16} />
                      Từ chối
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between rounded-default border border-border-subtle bg-surface px-6 py-4 shadow-sm">
        <p className="text-body text-ink-muted">
          Hiển thị {(data.pageIndex - 1) * data.pageSize + 1} -{" "}
          {Math.min(data.pageIndex * data.pageSize, data.totalCount)} trong tổng {data.totalCount} tin tuyển dụng
        </p>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onPageChange(data.pageIndex - 1)}
            disabled={!data.hasPreviousPage}
          >
            Trước
          </Button>
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, data.totalPages) }, (_, i) => {
              const page = i + 1;
              return (
                <button
                  key={page}
                  onClick={() => onPageChange(page)}
                  className={cn(
                    "rounded-default px-3 py-1.5 text-label font-medium transition-colors",
                    page === data.pageIndex
                      ? "bg-gold text-white"
                      : "text-navy hover:bg-surface-high"
                  )}
                >
                  {page}
                </button>
              );
            })}
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onPageChange(data.pageIndex + 1)}
            disabled={!data.hasNextPage}
          >
            Sau
          </Button>
        </div>
      </div>

      {/* Reject Modal */}
      <Modal
        isOpen={rejectModal.isOpen}
        onClose={() => setRejectModal({ isOpen: false, jobId: "", jobTitle: "" })}
        title="Từ chối tin tuyển dụng"
      >
        <div className="space-y-4">
          <p className="text-body text-ink-muted">
            Bạn đang từ chối tin tuyển dụng <strong className="text-navy">{rejectModal.jobTitle}</strong>
          </p>
          <div>
            <label className="mb-2 block text-label font-medium text-navy">
              Lý do từ chối <span className="text-danger">*</span>
            </label>
            <textarea
              className="w-full rounded-default border border-border-strong bg-surface px-4 py-3 text-body text-navy placeholder-ink-muted focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20"
              rows={4}
              placeholder="Nhập lý do từ chối..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </div>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => setRejectModal({ isOpen: false, jobId: "", jobTitle: "" })}
              className="flex-1"
            >
              Hủy
            </Button>
            <Button
              variant="danger"
              onClick={handleRejectSubmit}
              disabled={rejectJob.isPending || !rejectReason.trim()}
              className="flex-1"
            >
              Xác nhận từ chối
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function ApprovalBadge({ status }: { status: string }) {
  const variants = {
    Approved: { variant: "success" as const, label: "Đã duyệt" },
    Pending: { variant: "warning" as const, label: "Chờ duyệt" },
    Rejected: { variant: "danger" as const, label: "Từ chối" },
    Draft: { variant: "default" as const, label: "Bản nháp" },
  };

  const config = variants[status as keyof typeof variants] || { variant: "default" as const, label: status };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

function JobTableSkeleton() {
  return (
    <div className="rounded-default border border-border-subtle bg-surface p-6 shadow-sm">
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="h-10 flex-1 animate-pulse rounded bg-surface-high" />
            <div className="h-10 w-32 animate-pulse rounded bg-surface-high" />
            <div className="h-10 w-24 animate-pulse rounded bg-surface-high" />
            <div className="h-10 w-32 animate-pulse rounded bg-surface-high" />
          </div>
        ))}
      </div>
    </div>
  );
}
