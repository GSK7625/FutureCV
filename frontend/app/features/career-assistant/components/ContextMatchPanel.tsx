import { useState } from "react";
import { Link } from "react-router";
import {
  IconAlertCircle,
  IconBriefcase,
  IconCheck,
  IconChevronDown,
  IconChevronUp,
  IconFileText,
  IconRefresh,
  IconSearch,
  IconSparkles,
  IconX,
} from "@tabler/icons-react";
import { Badge, Button, Skeleton } from "~/components/ui";
import type { CvResponse, Job, JobMatchPreviewResponse } from "~/features/candidate/types";

interface ContextMatchPanelProps {
  cvs: CvResponse[];
  cvsLoading: boolean;
  cvsError: Error | null;
  selectedCvId: string;
  selectedCvTitleFallback?: string | null;
  onSelectCv: (cvId: string) => void;
  onRetryCvs: () => void;

  selectedJobId: string;
  selectedJob?: Job | null;
  selectedJobTitleFallback?: string | null;
  jobLoading: boolean;
  onOpenJobPicker: () => void;
  onClearJob: () => void;

  matchPreview?: JobMatchPreviewResponse | null;
  matchLoading: boolean;
  matchError: Error | null;
  canShowMatch: boolean;
  onRetryMatch: () => void;

  busy: boolean;
}

function getScoreStyle(score: number) {
  if (score >= 80) {
    return {
      badge: "success" as const,
      bar: "bg-success",
      label: "Rất phù hợp",
    };
  }
  if (score >= 50) {
    return {
      badge: "gold" as const,
      bar: "bg-gold",
      label: "Khá tiềm năng",
    };
  }
  return {
    badge: "danger" as const,
    bar: "bg-danger",
    label: "Cần bổ sung thêm",
  };
}

export function ContextMatchPanel({
  cvs,
  cvsLoading,
  cvsError,
  selectedCvId,
  selectedCvTitleFallback,
  onSelectCv,
  onRetryCvs,
  selectedJobId,
  selectedJob,
  selectedJobTitleFallback,
  jobLoading,
  onOpenJobPicker,
  onClearJob,
  matchPreview,
  matchLoading,
  matchError,
  canShowMatch,
  onRetryMatch,
  busy,
}: ContextMatchPanelProps) {
  const [matchExpanded, setMatchExpanded] = useState(true);
  const parsedCvs = cvs.filter((cv) => cv.parseStatus === "Parsed");
  const hasAnyUnparsedOnly = cvs.length > 0 && parsedCvs.length === 0;
  const selectedCv = cvs.find((cv) => cv.id === selectedCvId);
  const scoreStyle = matchPreview ? getScoreStyle(matchPreview.matchScore) : null;

  return (
    <div className="border-b border-border-subtle bg-surface-low/60 p-4 space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        {/* CV Selector */}
        <div className="rounded-default border border-border-subtle bg-surface p-3 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <label htmlFor="career-cv-select" className="inline-flex items-center gap-1.5 text-label-sm font-bold text-navy">
              <IconFileText size={15} className="text-gold" />
              <span>CV đã phân tích</span>
            </label>
            <Link to="/candidate/cvs" className="text-[12px] font-medium text-navy underline decoration-gold/70 hover:text-gold">
              Quản lý CV
            </Link>
          </div>

          {cvsLoading ? (
            <Skeleton className="h-9.5 w-full" />
          ) : cvsError ? (
            <div className="flex items-center justify-between gap-2 rounded-default border border-danger/20 bg-danger/5 px-3 py-2 text-label-sm text-danger">
              <span>Không tải được CV</span>
              <button type="button" onClick={onRetryCvs} className="font-semibold underline cursor-pointer">
                Thử lại
              </button>
            </div>
          ) : (
            <select
              id="career-cv-select"
              value={selectedCvId}
              disabled={busy}
              onChange={(event) => onSelectCv(event.target.value)}
              className="h-9.5 w-full rounded-default border border-border-strong bg-white px-3 text-label text-ink transition-colors focus:border-gold disabled:opacity-50"
            >
              <option value="">Không dùng CV (tư vấn chung)</option>
              {selectedCvId && !selectedCv && (
                <option value={selectedCvId}>
                  {selectedCvTitleFallback || "CV của cuộc trò chuyện đã lưu"}
                </option>
              )}
              {cvs.map((cv) => {
                const isParsed = cv.parseStatus === "Parsed";
                const prefix = cv.isPrimary ? "★ " : "";
                const suffix = isParsed
                  ? cv.isPrimary
                    ? " (CV chính)"
                    : ""
                  : ` (${cv.parseStatus === "Pending" ? "Đang phân tích" : "Chưa phân tích xong"})`;
                return (
                  <option key={cv.id} value={cv.id} disabled={!isParsed}>
                    {`${prefix}${cv.title || "CV chưa đặt tên"}${suffix}`}
                  </option>
                );
              })}
            </select>
          )}

          {hasAnyUnparsedOnly && !cvsLoading && (
            <p className="text-[11px] text-warning">
              CV của bạn chưa hoàn tất phân tích. Vào Kho CV để phân tích trước khi dùng tư vấn chuyên sâu.
            </p>
          )}
          {!cvsLoading && !cvsError && cvs.length === 0 && (
            <p className="text-[11px] text-ink-muted">
              Bạn chưa có CV nào.{" "}
              <Link to="/candidate/cvs" className="font-semibold text-navy underline">
                Tải hoặc tạo CV ngay
              </Link>
              .
            </p>
          )}
        </div>

        {/* Job Selector */}
        <div className="rounded-default border border-border-subtle bg-surface p-3 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-label-sm font-bold text-navy">
              <IconBriefcase size={15} className="text-gold" />
              <span>Việc làm mục tiêu</span>
            </span>
            {selectedJobId && (
              <button
                type="button"
                disabled={busy}
                onClick={onClearJob}
                className="inline-flex items-center gap-1 text-[12px] font-medium text-ink-muted hover:text-danger disabled:opacity-50 cursor-pointer"
              >
                <IconX size={13} />
                <span>Bỏ chọn</span>
              </button>
            )}
          </div>

          <button
            type="button"
            disabled={busy}
            onClick={onOpenJobPicker}
            className="flex h-9.5 w-full items-center justify-between gap-2 rounded-default border border-border-strong bg-white px-3 text-left text-label transition-colors hover:border-gold disabled:opacity-50 cursor-pointer"
          >
            <span className={`truncate ${selectedJobId ? "font-medium text-ink" : "text-ink-muted"}`}>
              {jobLoading && selectedJobId
                ? "Đang tải thông tin việc làm..."
                : selectedJob
                  ? `${selectedJob.title}${selectedJob.company ? ` — ${selectedJob.company}` : ""}`
                  : selectedJobId
                    ? selectedJobTitleFallback || "Việc làm đã chọn"
                    : "Tìm và chọn việc làm tham khảo..."}
            </span>
            <span className="inline-flex shrink-0 items-center gap-1 text-label-sm font-semibold text-navy">
              <IconSearch size={15} />
              <span className="hidden sm:inline">{selectedJobId ? "Đổi" : "Tìm Job"}</span>
            </span>
          </button>

          <p className="text-[11px] text-ink-muted">
            {selectedJob
              ? `${selectedJob.location} • ${selectedJob.experience}`
              : "Chọn việc làm để trợ lý đối chiếu JD, đánh giá phù hợp và viết Cover Letter."}
          </p>
        </div>
      </div>

      {/* Real AI Match Result Panel */}
      {canShowMatch ? (
        <div className="rounded-default border border-border-subtle bg-surface p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <IconSparkles size={16} className="text-gold" />
              <span className="text-label font-bold text-navy">Điểm phù hợp thực tế</span>
              {matchLoading ? (
                <Skeleton className="h-5 w-24 rounded-full" />
              ) : matchPreview && scoreStyle ? (
                <>
                  <Badge variant={scoreStyle.badge} shape="pill">
                    {matchPreview.matchScore}% • {scoreStyle.label}
                  </Badge>
                  <Badge variant="neutral" shape="pill">
                    {matchPreview.isAiPreview ? "AI Matching" : "Hệ thống đối chiếu"}
                  </Badge>
                </>
              ) : matchError ? (
                <Badge variant="danger" shape="pill">
                  Chưa có điểm Match chính thức
                </Badge>
              ) : null}
            </div>

            {matchPreview && (
              <button
                type="button"
                onClick={() => setMatchExpanded((prev) => !prev)}
                className="inline-flex items-center gap-1 rounded-tag px-2 py-1 text-label-sm font-semibold text-navy hover:bg-navy/5 cursor-pointer"
              >
                <span>{matchExpanded ? "Thu gọn" : "Xem kỹ năng"}</span>
                {matchExpanded ? <IconChevronUp size={15} /> : <IconChevronDown size={15} />}
              </button>
            )}
          </div>

          {matchLoading && (
            <div className="mt-3 space-y-2" aria-label="Đang tính điểm phù hợp">
              <Skeleton className="h-2 w-full rounded-full" />
              <div className="flex flex-wrap gap-1.5">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-14" />
              </div>
            </div>
          )}

          {matchError && !matchLoading && (
            <div role="alert" className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-default border border-warning/30 bg-warning/8 px-3 py-2 text-label-sm text-ink-variant">
              <span className="inline-flex items-center gap-1.5">
                <IconAlertCircle size={15} className="shrink-0 text-warning" />
                Không tải được điểm Match chính thức ({matchError.message}). Bạn vẫn có thể trò chuyện bình thường.
              </span>
              <Button size="sm" variant="ghost" className="h-7 px-2.5" onClick={onRetryMatch}>
                <IconRefresh size={13} />
                Thử lại
              </Button>
            </div>
          )}

          {matchPreview && scoreStyle && matchExpanded && !matchLoading && (
            <div className="mt-3 space-y-3 border-t border-border-subtle pt-3">
              <div className="h-2 w-full overflow-hidden rounded-full bg-surface-high">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${scoreStyle.bar}`}
                  style={{ width: `${Math.min(100, Math.max(0, matchPreview.matchScore))}%` }}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-success">
                    Kỹ năng phù hợp ({matchPreview.matchedSkills.length})
                  </p>
                  {matchPreview.matchedSkills.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {matchPreview.matchedSkills.map((skill) => (
                        <Badge key={skill} variant="success">
                          <IconCheck size={12} />
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[12px] italic text-ink-muted">Chưa ghi nhận kỹ năng khớp trực tiếp.</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-warning">
                    Kỹ năng còn thiếu ({matchPreview.missingSkills.length})
                  </p>
                  {matchPreview.missingSkills.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {matchPreview.missingSkills.map((skill) => (
                        <Badge key={skill} variant="gold">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[12px] italic text-ink-muted">Chưa ghi nhận kỹ năng bắt buộc còn thiếu.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="text-[12px] text-ink-muted">
          Chọn đồng thời 1 CV đã phân tích và 1 việc làm mục tiêu để xem điểm Match thực tế cùng kỹ năng phù hợp / còn thiếu. Đổi CV hoặc việc làm sẽ bắt đầu phiên hội thoại mới.
        </p>
      )}
    </div>
  );
}
