import { useMemo, useState } from "react";
import { IconBriefcase, IconChevronLeft, IconChevronRight, IconCircleCheck, IconSearch, IconX, IconEye } from "@tabler/icons-react";
import { Badge, Button, EmptyState, Input, Skeleton } from "~/components/ui";
import { QueryBoundary } from "~/components/shared/QueryBoundary";
import { useDebounce } from "~/hooks/useDebounce";
import { useUIStore } from "~/stores/useUIStore";
import { useJobs, useApproveJob, useRejectJob } from "~/features/admin/hooks/useAdminQueries";
import type { JobFilters, JobListItem } from "~/features/admin/types";

const statusLabels: Record<string, string> = { 
  Draft: "Bản nháp", 
  Pending: "Chờ duyệt", 
  Approved: "Đã duyệt", 
  Rejected: "Bị từ chối" 
};

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={status === "Approved" ? "success" : status === "Rejected" ? "danger" : status === "Pending" ? "gold" : "neutral"}>
      {statusLabels[status] || status}
    </Badge>
  );
}

function formatSalary(job: JobListItem) {
  if (job.salaryMin === null && job.salaryMax === null) return "Thỏa thuận";
  const formatter = new Intl.NumberFormat("vi-VN");
  if (job.salaryMin !== null && job.salaryMax !== null) 
    return `${formatter.format(job.salaryMin)}–${formatter.format(job.salaryMax)} ${job.salaryCurrency}`;
  return `${formatter.format(job.salaryMin ?? job.salaryMax ?? 0)} ${job.salaryCurrency}`;
}

export default function Page() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [filters, setFilters] = useState<JobFilters>({ pageIndex: 1, pageSize: 10 });
  const [rejectDialogJob, setRejectDialogJob] = useState<JobListItem | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const showToast = useUIStore((state) => state.showToast);
  
  const effectiveFilters = useMemo(
    () => ({ ...filters, keyword: debouncedSearch }),
    [filters, debouncedSearch]
  );
  
  const jobsQuery = useJobs(effectiveFilters);
  const approveJob = useApproveJob();
  const rejectJob = useRejectJob();

  const setFilter = <K extends keyof JobFilters>(key: K, value: JobFilters[K]) => {
    setFilters((current) => ({ ...current, [key]: value, pageIndex: 1 }));
  };

  const handleApprove = async (job: JobListItem) => {
    if (!window.confirm(`Phê duyệt tin "${job.title}"?`)) return;
    try {
      await approveJob.mutateAsync(job.id);
      showToast("Đã phê duyệt tin tuyển dụng", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Không thể phê duyệt", "error");
    }
  };

  const handleReject = async () => {
    if (!rejectDialogJob || !rejectReason.trim()) {
      showToast("Vui lòng nhập lý do từ chối", "error");
      return;
    }
    try {
      await rejectJob.mutateAsync({ 
        jobId: rejectDialogJob.id, 
        reason: rejectReason 
      });
      showToast("Đã từ chối tin tuyển dụng", "success");
      setRejectDialogJob(null);
      setRejectReason("");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Không thể từ chối", "error");
    }
  };

  const jobs = jobsQuery.data?.items ?? [];

  return (
    <section aria-labelledby="jobs-title">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-label font-semibold text-gold">QUẢN TRỊ</p>
          <h1 id="jobs-title" className="mt-1 text-headline text-navy">Kiểm duyệt tin tuyển dụng</h1>
          <p className="mt-2 text-ink-variant">Phê duyệt hoặc từ chối các tin tuyển dụng trên hệ thống.</p>
        </div>
      </div>

      <div className="mb-5 grid gap-3 rounded-default border border-border-subtle bg-surface p-4 shadow-surface md:grid-cols-[minmax(0,1fr)_13rem_13rem]">
        <Input 
          aria-label="Tìm kiếm tin tuyển dụng" 
          icon={<IconSearch size={18} aria-hidden="true" />} 
          placeholder="Tìm theo tiêu đề" 
          value={search} 
          onChange={(event) => setSearch(event.target.value)} 
        />
        <select 
          aria-label="Lọc theo trạng thái duyệt" 
          value={filters.approvalStatus ?? ""} 
          onChange={(event) => setFilter("approvalStatus", event.target.value as JobFilters["approvalStatus"])}
          className="h-11 rounded-default border border-border-strong bg-white px-3.5 text-ink focus:border-gold"
        >
          <option value="">Mọi trạng thái</option>
          <option value="Draft">Bản nháp</option>
          <option value="Pending">Chờ duyệt</option>
          <option value="Approved">Đã duyệt</option>
          <option value="Rejected">Bị từ chối</option>
        </select>
        <select 
          aria-label="Lọc theo trạng thái hoạt động" 
          value={filters.isActive === undefined ? "" : String(filters.isActive)} 
          onChange={(event) => setFilter("isActive", event.target.value === "" ? undefined : event.target.value === "true")}
          className="h-11 rounded-default border border-border-strong bg-white px-3.5 text-ink focus:border-gold"
        >
          <option value="">Đang mở và đã đóng</option>
          <option value="true">Đang mở</option>
          <option value="false">Đã đóng</option>
        </select>
      </div>

      <QueryBoundary 
        isLoading={jobsQuery.isLoading} 
        error={jobsQuery.error} 
        onRetry={() => jobsQuery.refetch()} 
        skeleton={<JobsSkeleton />}
      >
        {jobs.length === 0 ? (
          <EmptyState 
            icon={<IconBriefcase size={42} aria-hidden="true" />} 
            title="Không tìm thấy tin tuyển dụng" 
            description="Thử thay đổi điều kiện tìm kiếm." 
          />
        ) : (
          <>
            <div className="hidden overflow-x-auto rounded-default border border-border-subtle bg-surface shadow-surface lg:block">
              <table className="w-full text-left">
                <thead className="bg-surface-low text-label-sm uppercase tracking-wider text-ink-muted">
                  <tr>
                    <th className="px-4 py-3">Vị trí & Công ty</th>
                    <th className="px-4 py-3">Địa điểm</th>
                    <th className="px-4 py-3">Lương</th>
                    <th className="px-4 py-3">Trạng thái</th>
                    <th className="px-4 py-3">Ngày đăng</th>
                    <th className="px-4 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {jobs.map((job) => (
                    <tr key={job.id} className="hover:bg-surface-low">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-default bg-navy/10 text-navy">
                            {job.companyLogoUrl ? (
                              <img src={job.companyLogoUrl} alt={`Logo ${job.companyName}`} className="h-full w-full object-cover" />
                            ) : (
                              <IconBriefcase size={20} aria-hidden="true" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <span className="block font-semibold text-navy">{job.title}</span>
                            <span className="mt-1 block text-label text-ink-muted">{job.companyName}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-label text-ink-variant">{job.locationName || "Chưa cập nhật"}</td>
                      <td className="px-4 py-4 text-label font-medium tabular-nums text-ink">{formatSalary(job)}</td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          <StatusBadge status={job.approvalStatus} />
                          <Badge variant={job.isActive ? "navy" : "neutral"}>
                            {job.isActive ? "Đang mở" : "Đã đóng"}
                          </Badge>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-label tabular-nums text-ink-variant">
                        {new Date(job.createdAt).toLocaleDateString("vi-VN")}
                      </td>
                      <td className="px-4 py-4">
                        <JobActions 
                          job={job} 
                          busy={approveJob.isPending || rejectJob.isPending}
                          onApprove={() => void handleApprove(job)}
                          onReject={() => setRejectDialogJob(job)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-4 lg:hidden">
              {jobs.map((job) => (
                <article key={job.id} className="rounded-default border border-border-subtle bg-surface p-4 shadow-surface">
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge status={job.approvalStatus} />
                    <Badge variant={job.isActive ? "navy" : "neutral"}>
                      {job.isActive ? "Đang mở" : "Đã đóng"}
                    </Badge>
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-default bg-navy/10 text-navy">
                      {job.companyLogoUrl ? (
                        <img src={job.companyLogoUrl} alt={`Logo ${job.companyName}`} className="h-full w-full object-cover" />
                      ) : (
                        <IconBriefcase size={24} aria-hidden="true" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-body-lg font-semibold text-navy">{job.title}</h3>
                      <p className="mt-1 text-label text-ink-muted">{job.companyName}</p>
                    </div>
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-3 text-label">
                    <div>
                      <dt className="text-ink-muted">Địa điểm</dt>
                      <dd className="mt-1 text-ink">{job.locationName || "Chưa cập nhật"}</dd>
                    </div>
                    <div>
                      <dt className="text-ink-muted">Mức lương</dt>
                      <dd className="mt-1 break-words text-ink">{formatSalary(job)}</dd>
                    </div>
                    <div>
                      <dt className="text-ink-muted">Ngày đăng</dt>
                      <dd className="mt-1 tabular-nums text-ink">{new Date(job.createdAt).toLocaleDateString("vi-VN")}</dd>
                    </div>
                    <div>
                      <dt className="text-ink-muted">Lượt xem</dt>
                      <dd className="mt-1 text-ink">{job.viewCount}</dd>
                    </div>
                  </dl>
                  <div className="mt-4 border-t border-border-subtle pt-3">
                    <JobActions 
                      job={job} 
                      busy={approveJob.isPending || rejectJob.isPending}
                      onApprove={() => void handleApprove(job)}
                      onReject={() => setRejectDialogJob(job)}
                    />
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-label text-ink-muted">
                {jobsQuery.data?.totalCount ?? 0} tin · Trang {jobsQuery.data?.pageIndex ?? 1}/
                {Math.max(jobsQuery.data?.totalPages ?? 1, 1)}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={(jobsQuery.data?.pageIndex ?? 1) <= 1}
                  onClick={() => setFilters((current) => ({ ...current, pageIndex: Math.max(1, (current.pageIndex ?? 1) - 1) }))}
                >
                  <IconChevronLeft size={17} aria-hidden="true" />
                  Trước
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={(jobsQuery.data?.pageIndex ?? 1) >= (jobsQuery.data?.totalPages ?? 1)}
                  onClick={() => setFilters((current) => ({ ...current, pageIndex: (current.pageIndex ?? 1) + 1 }))}
                >
                  Sau
                  <IconChevronRight size={17} aria-hidden="true" />
                </Button>
              </div>
            </div>
          </>
        )}
      </QueryBoundary>

      {/* Reject Dialog */}
      {rejectDialogJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/80 p-4">
          <div className="w-full max-w-md rounded-default border border-border-subtle bg-surface p-6 shadow-lg">
            <h2 className="text-body-lg font-semibold text-navy">Từ chối tin tuyển dụng</h2>
            <p className="mt-2 text-label text-ink-variant">
              Tin: <strong className="text-navy">{rejectDialogJob.title}</strong>
            </p>
            <p className="mt-1 text-label text-ink-variant">
              Công ty: <strong className="text-navy">{rejectDialogJob.companyName}</strong>
            </p>
            <div className="mt-4">
              <label htmlFor="reject-reason" className="block text-label font-medium text-navy">
                Lý do từ chối *
              </label>
              <textarea
                id="reject-reason"
                rows={4}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Nhập lý do từ chối tin tuyển dụng..."
                className="mt-2 w-full rounded-default border border-border-strong bg-white px-3.5 py-2.5 text-ink focus:border-gold"
              />
            </div>
            <div className="mt-5 flex gap-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setRejectDialogJob(null);
                  setRejectReason("");
                }}
                className="flex-1"
              >
                Hủy
              </Button>
              <Button
                onClick={() => void handleReject()}
                disabled={!rejectReason.trim() || rejectJob.isPending}
                className="flex-1"
              >
                Xác nhận từ chối
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function JobActions({ job, busy, onApprove, onReject }: { 
  job: JobListItem; 
  busy: boolean; 
  onApprove: () => void; 
  onReject: () => void;
}) {
  if (job.approvalStatus !== "Pending") {
    return (
      <div className="flex justify-end gap-1">
        <span className="text-label text-ink-muted">Đã xử lý</span>
      </div>
    );
  }

  return (
    <div className="flex justify-end gap-1">
      <button
        type="button"
        aria-label={`Phê duyệt ${job.title}`}
        onClick={onApprove}
        disabled={busy}
        className="flex h-10 w-10 items-center justify-center rounded-default text-success hover:bg-success/10 disabled:opacity-50"
      >
        <IconCircleCheck size={18} aria-hidden="true" />
      </button>
      <button
        type="button"
        aria-label={`Từ chối ${job.title}`}
        onClick={onReject}
        disabled={busy}
        className="flex h-10 w-10 items-center justify-center rounded-default text-danger hover:bg-danger/10 disabled:opacity-50"
      >
        <IconX size={18} aria-hidden="true" />
      </button>
    </div>
  );
}

function JobsSkeleton() {
  return (
    <div className="space-y-3 rounded-default border border-border-subtle bg-surface p-4">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="grid grid-cols-[2fr_1fr_1fr] gap-4 border-b border-border-subtle py-3 last:border-0">
          <Skeleton className="h-6" />
          <Skeleton className="h-6" />
          <Skeleton className="h-6" />
        </div>
      ))}
    </div>
  );
}
