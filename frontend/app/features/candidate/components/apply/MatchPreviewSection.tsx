import { IconSparkles, IconLoader2, IconRefresh } from "@tabler/icons-react";
import type { JobMatchPreviewResponse } from "../../types";
import { Skeleton } from "~/components/ui";

interface MatchPreviewSectionProps {
  preview: JobMatchPreviewResponse | null | undefined;
  isLoading: boolean;
  hasAnalyzed: boolean;
  onAnalyze: () => void;
  selectedCvTitle?: string | null;
  isCvChangedAfterAnalysis?: boolean;
}

export function MatchPreviewSection({
  preview,
  isLoading,
  hasAnalyzed,
  onAnalyze,
  selectedCvTitle,
  isCvChangedAfterAnalysis,
}: MatchPreviewSectionProps) {
  return (
    <div className="p-1.5 rounded-[2rem] bg-amber-500/10 border border-amber-400/20 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]">
      <div className="p-6 sm:p-8 bg-white rounded-[calc(2rem-0.375rem)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)]">
        {/* Card Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-navy/5 pb-4 mb-4 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-100/80 border border-amber-300/40 flex items-center justify-center text-amber-700 shrink-0">
              <IconSparkles size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-navy">
                Độ phù hợp hồ sơ (AI Match Preview)
              </h3>
              <p className="text-xs text-ink-variant">
                Phân tích mức độ tương thích giữa CV đã chọn và yêu cầu công việc
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800 bg-amber-50 px-3.5 py-1 rounded-full border border-amber-200 self-start sm:self-auto">
              <IconLoader2 size={14} className="animate-spin text-amber-700" />
              <span>Đang phân tích...</span>
            </div>
          ) : hasAnalyzed && preview ? (
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <div className="px-3.5 py-1 rounded-full bg-navy text-white text-xs font-bold shadow-xs">
                {preview.matchScore}% Phù hợp
              </div>
              <button
                type="button"
                onClick={onAnalyze}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium text-navy hover:text-gold hover:bg-navy/5 transition-colors cursor-pointer"
                title="Phân tích lại"
              >
                <IconRefresh size={13} />
                <span>Phân tích lại</span>
              </button>
            </div>
          ) : null}
        </div>

        {/* State 1: Scanning / Loading */}
        {isLoading ? (
          <div className="py-2 space-y-3">
            <div className="flex items-center gap-2 text-xs font-medium text-amber-800 animate-pulse">
              <IconSparkles size={15} className="text-gold shrink-0" />
              <span>AI đang trích xuất dữ liệu, đối chiếu kỹ năng và tính toán điểm tương thích...</span>
            </div>
            <div className="w-full bg-navy/5 h-2 rounded-full overflow-hidden relative">
              <div className="h-full bg-gradient-to-r from-amber-500 to-gold rounded-full w-2/3 animate-pulse" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
            </div>
          </div>
        ) : !hasAnalyzed ? (
          /* State 2: Ready / Prompt to Scan */
          <div className="py-1">
            <p className="text-xs text-ink-variant leading-relaxed">
              Bạn có thể sử dụng AI để kiểm tra nhanh mức độ phù hợp của bản CV{" "}
              {selectedCvTitle ? (
                <strong className="text-navy font-semibold">"{selectedCvTitle}"</strong>
              ) : (
                "đang chọn"
              )}{" "}
              với các tiêu chí tuyển dụng trước khi nộp hồ sơ.
            </p>
            <div className="mt-4 flex items-center justify-start">
              <button
                type="button"
                onClick={onAnalyze}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-navy text-white text-xs font-semibold hover:bg-navy-secondary transition-all shadow-xs cursor-pointer active:scale-[0.98]"
              >
                <IconSparkles size={15} className="text-gold" />
                <span>Phân tích độ phù hợp với AI</span>
              </button>
            </div>
          </div>
        ) : preview ? (
          /* State 3: Analysis Result */
          <div className="space-y-4">
            {/* Banner cảnh báo nếu ứng viên vừa đổi CV khác sau khi đã phân tích */}
            {isCvChangedAfterAnalysis && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200/70 text-xs">
                <span className="text-amber-900 font-medium">
                  Bạn vừa tích chọn một bản CV khác. Hãy phân tích lại để xem độ phù hợp với bản CV mới.
                </span>
                <button
                  type="button"
                  onClick={onAnalyze}
                  className="px-3 py-1 rounded-lg bg-navy text-white font-semibold hover:bg-navy-secondary transition-colors shrink-0 inline-flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
                >
                  <IconRefresh size={13} />
                  <span>Cập nhật phân tích</span>
                </button>
              </div>
            )}

            {/* Tiến độ Match Score Bar */}
            <div className="w-full bg-navy/5 h-2 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full transition-all duration-1000 ease-[cubic-bezier(0.32,0.72,0,1)]"
                style={{ width: `${Math.min(100, Math.max(0, preview.matchScore))}%` }}
              />
            </div>

            {/* Matched & Missing Skills */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              {/* Matched Skills */}
              <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200/50">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-emerald-800 block mb-2">
                  Kỹ năng tương thích ({preview.matchedSkills?.length || 0})
                </span>
                {preview.matchedSkills && preview.matchedSkills.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {preview.matchedSkills.map((sk) => (
                      <span
                        key={sk}
                        className="px-2 py-0.5 rounded-md bg-white border border-emerald-300/60 text-emerald-800 text-xs font-medium shadow-2xs"
                      >
                        {sk}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-ink-muted italic">Chưa ghi nhận kỹ năng khớp trực tiếp</span>
                )}
              </div>

              {/* Missing Skills */}
              <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200/50">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-amber-800 block mb-2">
                  Kỹ năng cần bổ sung ({preview.missingSkills?.length || 0})
                </span>
                {preview.missingSkills && preview.missingSkills.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {preview.missingSkills.map((sk) => (
                      <span
                        key={sk}
                        className="px-2 py-0.5 rounded-md bg-white border border-amber-300/60 text-amber-800 text-xs font-medium shadow-2xs"
                      >
                        {sk}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-ink-muted italic">Đầy đủ kỹ năng chính</span>
                )}
              </div>
            </div>

            {/* Explanation */}
            {preview.explanation && (
              <p className="text-xs text-ink-variant bg-surface-low/80 p-3.5 rounded-xl border border-navy/5 leading-relaxed">
                <strong className="text-navy font-semibold">Nhận xét: </strong>
                {preview.explanation}
              </p>
            )}
          </div>
        ) : (
          <p className="text-xs text-ink-muted italic py-1">
            Không thể tải thông tin phân tích độ phù hợp. Bạn vẫn có thể nộp hồ sơ bình thường.
          </p>
        )}
      </div>
    </div>
  );
}
