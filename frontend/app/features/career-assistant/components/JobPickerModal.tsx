import { useEffect, useState } from "react";
import {
  IconBriefcase,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconMapPin,
  IconRefresh,
  IconSearch,
  IconX,
} from "@tabler/icons-react";
import { Badge, Button, EmptyState, Input, Modal, Skeleton } from "~/components/ui";
import { CompanyLogo } from "~/components/shared/CompanyLogo";
import { useDebounce } from "~/hooks/useDebounce";
import { useJobList } from "~/features/candidate/hooks/useJobList";
import type { Job } from "~/features/candidate/types";

interface JobPickerModalProps {
  open: boolean;
  selectedJobId: string;
  onClose: () => void;
  onSelectJob: (job: Job | null) => void;
}

const PAGE_SIZE = 6;

export function JobPickerModal({ open, selectedJobId, onClose, onSelectJob }: JobPickerModalProps) {
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);
  const debouncedKeyword = useDebounce(keyword, 350);

  useEffect(() => {
    setPage(1);
  }, [debouncedKeyword]);

  useEffect(() => {
    if (!open) return;
    setPage(1);
  }, [open]);

  const jobsQuery = useJobList({
    keyword: debouncedKeyword.trim() || undefined,
    page,
    pageSize: PAGE_SIZE,
    sortBy: "newest",
  });

  const data = jobsQuery.data;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Chọn việc làm tham khảo"
      className="max-w-2xl"
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          <div>
            {selectedJobId && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onSelectJob(null);
                  onClose();
                }}
              >
                Bỏ chọn việc làm hiện tại
              </Button>
            )}
          </div>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Đóng
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Tìm theo chức danh, kỹ năng hoặc từ khóa công việc..."
            icon={<IconSearch size={18} />}
            inputSize="sm"
            className="flex-1"
            aria-label="Tìm kiếm việc làm"
          />
          {keyword && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setKeyword("")}
              aria-label="Xóa từ khóa tìm kiếm"
            >
              <IconX size={16} />
              Xóa
            </Button>
          )}
        </div>

        {jobsQuery.isLoading ? (
          <div className="space-y-3" aria-label="Đang tải danh sách việc làm">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="rounded-default border border-border-subtle p-3.5 space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3.5 w-1/2" />
                <Skeleton className="h-5 w-1/3" />
              </div>
            ))}
          </div>
        ) : jobsQuery.isError ? (
          <div role="alert" className="rounded-default border border-danger/20 bg-danger/5 p-4 text-center space-y-3">
            <p className="text-label font-medium text-danger">
              Không tải được danh sách việc làm: {jobsQuery.error.message}
            </p>
            <Button size="sm" variant="secondary" onClick={() => void jobsQuery.refetch()}>
              <IconRefresh size={15} />
              Thử tải lại
            </Button>
          </div>
        ) : !data?.items.length ? (
          <EmptyState
            className="py-10"
            icon={<IconBriefcase size={32} />}
            title="Không tìm thấy việc làm phù hợp"
            description={
              debouncedKeyword
                ? `Không có việc làm đang tuyển nào khớp với từ khóa “${debouncedKeyword}”.`
                : "Hiện chưa có tin tuyển dụng phù hợp để chọn."
            }
            action={
              debouncedKeyword ? (
                <Button size="sm" variant="secondary" onClick={() => setKeyword("")}>
                  Xóa từ khóa
                </Button>
              ) : undefined
            }
          />
        ) : (
          <ul className="space-y-2.5" aria-label="Kết quả tìm kiếm việc làm">
            {data.items.map((job) => {
              const isSelected = job.id === selectedJobId;
              return (
                <li key={job.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelectJob(job);
                      onClose();
                    }}
                    className={`w-full rounded-default border p-3.5 text-left transition-all cursor-pointer ${
                      isSelected
                        ? "border-gold bg-gold/5 shadow-xs"
                        : "border-border-subtle bg-surface hover:border-navy/30 hover:bg-surface-low/60"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-default border border-border-subtle bg-surface-low flex items-center justify-center">
                        <CompanyLogo src={job.companyLogo} name={job.company} fallbackIconSize={20} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-label font-bold text-navy">{job.title}</p>
                            <p className="truncate text-label-sm font-medium text-ink-variant">{job.company}</p>
                          </div>
                          {isSelected && (
                            <Badge variant="gold" shape="pill" className="shrink-0">
                              <IconCheck size={12} />
                              Đang chọn
                            </Badge>
                          )}
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-label-sm text-ink-muted">
                          <span className="inline-flex items-center gap-1">
                            <IconMapPin size={13} />
                            {job.location}
                          </span>
                          {job.level && <span>• {job.level}</span>}
                          <span>• {job.experience}</span>
                        </div>
                        {!!job.skills?.length && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {job.skills.slice(0, 4).map((skill) => (
                              <Badge key={skill} variant="neutral">
                                {skill}
                              </Badge>
                            ))}
                            {job.skills.length > 4 && (
                              <Badge variant="neutral">+{job.skills.length - 4}</Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border-subtle pt-3 text-label-sm">
            <span className="text-ink-muted">
              Tổng {data.total} việc làm • Trang {data.page}/{data.totalPages}
            </span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                disabled={!data.hasPreviousPage || jobsQuery.isFetching}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <IconChevronLeft size={15} />
                Trước
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={!data.hasNextPage || jobsQuery.isFetching}
                onClick={() => setPage((p) => p + 1)}
              >
                Sau
                <IconChevronRight size={15} />
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
