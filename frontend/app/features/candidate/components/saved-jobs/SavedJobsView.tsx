/**
 * @file SavedJobsView.tsx
 * @description Giao diện danh sách việc làm đã lưu của ứng viên (P3-UC04).
 * @architecture Dùng QueryBoundary, reuse JobListPagination, Modal xác nhận bỏ lưu, EmptyState.
 */

import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import {
  IconBookmarkFilled,
  IconBookmarkOff,
  IconCalendar,
  IconClock,
  IconMapPin,
  IconSearch,
} from "@tabler/icons-react";
import { Badge } from "~/components/ui/Badge";
import { Button } from "~/components/ui/Button";
import { EmptyState } from "~/components/ui/EmptyState";
import { Modal } from "~/components/ui/Modal";
import { Skeleton } from "~/components/ui/Skeleton";
import { QueryBoundary } from "~/components/shared/QueryBoundary";
import { JobListPagination } from "../job-list/JobListPagination";
import { useSavedJobs } from "../../hooks/useSavedJobs";
import { useToggleSaveJob } from "../../hooks/useToggleSaveJob";
import { formatSalary, timeAgo } from "~/utils";
import type { SavedJob } from "../../types";

/**
 * Chuyển đổi mốc thời gian lưu thành chuỗi tương đối thân thiện (ví dụ: "2 ngày trước", "Vừa xong").
 * @param savedAt Chuỗi thời gian ISO khi ứng viên lưu việc làm
 */
function formatSavedTime(savedAt: string): string {
  const relative = timeAgo(savedAt);
  return relative.replace("Đăng ", "").replace("Vừa đăng", "Vừa xong");
}

/**
 * Skeleton tải dữ liệu giả lập layout các card việc làm đã lưu.
 */
function SavedJobsSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col gap-4 rounded-default border border-border-subtle bg-surface p-5 shadow-surface sm:flex-row"
        >
          <Skeleton className="h-16 w-16 shrink-0 rounded-default sm:h-20 sm:w-20" />
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-col justify-between gap-2 sm:flex-row">
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-6 w-28" />
            </div>
            <Skeleton className="h-4 w-1/3" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-28" />
            </div>
            <div className="flex justify-between border-t border-border-subtle pt-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-8 w-20" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Giao diện chính hiển thị danh sách các công việc ứng viên đã lưu.
 * Cho phép phân trang số trang, điều hướng xem chi tiết, và bỏ lưu có hộp thoại xác nhận.
 */
export function SavedJobsView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, Number(searchParams.get("page") || "1"));

  // Lấy danh sách việc làm đã lưu từ backend
  const { data, isLoading, error, refetch } = useSavedJobs(page);
  // Mutation chuyển đổi trạng thái lưu
  const { toggleSave, isPending } = useToggleSaveJob();
  // State lưu trữ công việc đang được chọn để xác nhận bỏ lưu
  const [jobToUnsave, setJobToUnsave] = useState<SavedJob | null>(null);

  /**
   * Cập nhật số trang lên search params trên URL.
   */
  const handlePageChange = (newPage: number) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (newPage <= 1) {
        next.delete("page");
      } else {
        next.set("page", String(newPage));
      }
      return next;
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /**
   * Xác nhận hủy lưu công việc và đóng hộp thoại modal.
   */
  const handleConfirmUnsave = () => {
    if (!jobToUnsave) return;
    toggleSave(jobToUnsave.jobId, {
      onSuccess: () => {
        setJobToUnsave(null);
      },
    });
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 py-4">
      {/* Header */}
      <div className="flex flex-col gap-1 border-b border-border-subtle pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-display-xs font-bold text-navy sm:text-display-sm">
            Việc làm đã lưu {data?.total != null ? `(${data.total})` : ""}
          </h1>
          <p className="mt-1 text-body-sm text-ink-muted">
            Quản lý danh sách các cơ hội nghề nghiệp bạn đã lưu để ứng tuyển.
          </p>
        </div>
        <Link to="/jobs">
          <Button variant="secondary" size="sm" className="mt-2 sm:mt-0">
            <IconSearch size={16} />
            Tìm thêm việc làm
          </Button>
        </Link>
      </div>

      {/* Main Content with QueryBoundary */}
      <QueryBoundary
        isLoading={isLoading}
        error={error}
        onRetry={refetch}
        skeleton={<SavedJobsSkeleton />}
      >
        {data && data.items.length === 0 ? (
          <EmptyState
            icon={<IconBookmarkOff size={48} className="text-ink-muted" stroke={1.5} />}
            title="Chưa có việc làm nào được lưu"
            description="Bạn chưa lưu việc làm nào. Hãy khám phá các tin tuyển dụng hấp dẫn và nhấn Lưu để xem lại tại đây!"
            action={
              <Link to="/jobs">
                <Button variant="primary">
                  <IconSearch size={18} />
                  Tìm việc làm
                </Button>
              </Link>
            }
            className="my-10"
          />
        ) : (
          <div className="space-y-4">
            {data?.items.map((job) => {
              const companyInitial = job.company ? job.company.charAt(0).toUpperCase() : "C";

              return (
                <article
                  key={job.jobId}
                  className="group relative rounded-default border border-border-subtle bg-surface p-5 shadow-surface transition-all duration-200 hover:-translate-y-0.5 hover:border-navy hover:shadow-card"
                >
                  <div className="flex flex-col gap-4 sm:flex-row">
                    {/* Company Logo */}
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-default border border-border-subtle bg-surface-low sm:h-20 sm:w-20">
                      {job.companyLogo ? (
                        <img
                          src={job.companyLogo}
                          alt={job.company}
                          className="h-full w-full object-contain p-2"
                          loading="lazy"
                        />
                      ) : (
                        <span className="text-headline-md font-bold text-navy">
                          {companyInitial}
                        </span>
                      )}
                    </div>

                    {/* Info Column */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col-reverse items-start justify-between gap-2 sm:flex-row sm:items-center">
                        <h2 className="line-clamp-2 text-title font-semibold leading-snug text-navy">
                          <Link
                            to={`/jobs/${job.jobId}`}
                            className="transition-colors hover:text-gold"
                          >
                            {job.title}
                          </Link>
                        </h2>
                        <Badge variant="gold" className="shrink-0 font-bold text-label">
                          {formatSalary(job.salaryMin, job.salaryMax)}
                        </Badge>
                      </div>

                      <p className="mt-1 text-label font-medium uppercase tracking-wide text-ink-variant">
                        {job.company}
                      </p>

                      {/* Badges / Meta */}
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Badge variant="neutral" className="gap-1">
                          <IconMapPin size={13} stroke={1.8} className="text-ink-muted" />
                          {job.location}
                        </Badge>

                        {job.deadline && (
                          <Badge variant="neutral" className="gap-1">
                            <IconCalendar size={13} stroke={1.8} className="text-ink-muted" />
                            Hạn nộp: {job.deadline}
                          </Badge>
                        )}

                        {job.isExpired ? (
                          <Badge variant="danger">Hết hạn</Badge>
                        ) : !job.isActive ? (
                          <Badge variant="neutral">Đã đóng</Badge>
                        ) : null}
                      </div>

                      {/* Footer */}
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle pt-3 text-label-sm text-ink-muted">
                        <span className="flex items-center gap-1">
                          <IconClock size={14} stroke={1.6} />
                          Lưu: {formatSavedTime(job.savedAt)}
                        </span>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1 text-ink-muted hover:bg-danger/10 hover:text-danger"
                            onClick={() => setJobToUnsave(job)}
                          >
                            <IconBookmarkFilled size={15} className="text-gold" />
                            Bỏ lưu
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}

            {/* Pagination */}
            {data && data.totalPages > 1 && (
              <div className="mt-6 flex justify-center">
                <JobListPagination
                  currentPage={data.page}
                  totalPages={data.totalPages}
                  hasPreviousPage={data.hasPreviousPage}
                  hasNextPage={data.hasNextPage}
                  onPageChange={handlePageChange}
                />
              </div>
            )}
          </div>
        )}
      </QueryBoundary>

      {/* Confirmation Modal */}
      <Modal
        open={!!jobToUnsave}
        onClose={() => setJobToUnsave(null)}
        title="Bỏ lưu việc làm"
        footer={
          <div className="flex justify-end gap-3">
            <Button
              variant="ghost"
              onClick={() => setJobToUnsave(null)}
              disabled={isPending}
            >
              Hủy
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmUnsave}
              disabled={isPending}
            >
              {isPending ? "Đang xử lý..." : "Xác nhận bỏ lưu"}
            </Button>
          </div>
        }
      >
        <p className="text-body text-ink">
          Bạn có chắc chắn muốn bỏ lưu việc làm{" "}
          <strong className="text-navy">{jobToUnsave?.title}</strong> tại{" "}
          <strong className="text-navy">{jobToUnsave?.company}</strong> không?
        </p>
      </Modal>
    </div>
  );
}
