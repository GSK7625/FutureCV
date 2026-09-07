import { memo, useState } from "react";
import { useNavigate } from "react-router";
import { IconHeart, IconHeartFilled } from "@tabler/icons-react";
import { formatSalary } from "~/utils";
import type { Job } from "~/features/candidate/types";
import { cn } from "~/lib/cn";

export const JobCard = memo(function JobCard({ job, className }: { job: Job; className?: string }) {
  const [saved, setSaved] = useState(false);
  const navigate = useNavigate();

  const handleCardClick = () => {
    navigate(`/jobs/${job.id}`);
  };

  return (
    <article
      onClick={handleCardClick}
      className={cn(
        "group relative flex h-[116px] w-full cursor-pointer items-center gap-3 rounded-xl border border-border-subtle bg-surface p-3 shadow-sm transition-all duration-200 hover:border-gold/60 hover:shadow-md",
        className,
      )}
    >
      {/* Company Logo Avatar */}
      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border-subtle bg-surface-low p-1">
        {job.companyLogo ? (
          <img src={job.companyLogo} alt={job.company} className="h-full w-full object-contain" />
        ) : (
          <span className="text-base font-bold text-navy">
            {job.company.charAt(0).toUpperCase()}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex h-full min-w-0 flex-grow flex-col justify-between py-0.5">
        {/* Top: Badges, Title & Company */}
        <div className="min-w-0">
          <div className="flex min-h-[16px] items-center gap-1.5 flex-wrap">
            {job.hot && (
              <span className="rounded bg-danger/10 px-1.5 py-0.2 text-[10px] font-bold text-danger">
                HOT
              </span>
            )}
            {job.salaryMin && job.salaryMin >= 20 ? (
              <span className="rounded bg-success/15 px-1.5 py-0.2 text-[10px] font-bold text-success">
                TOP
              </span>
            ) : null}
          </div>

          <h3 className="line-clamp-1 text-label font-semibold text-navy transition-colors group-hover:text-gold mt-0.5">
            {job.title}
          </h3>

          <p className="line-clamp-1 text-[12px] text-ink-muted">
            {job.company}
          </p>
        </div>

        {/* Bottom: Tags & Save Button */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded bg-surface-low px-2 py-0.5 text-[11px] font-semibold text-ink">
              {formatSalary(job.salaryMin, job.salaryMax)}
            </span>
            <span className="rounded bg-surface-low px-2 py-0.5 text-[11px] text-ink-muted">
              {job.location}
            </span>
          </div>

          <button
            type="button"
            aria-label={saved ? "Bỏ lưu việc làm" : "Lưu việc làm"}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setSaved(!saved);
            }}
            className="text-ink-muted transition-colors hover:text-danger p-0.5"
          >
            {saved ? (
              <IconHeartFilled size={16} className="text-danger" />
            ) : (
              <IconHeart size={16} stroke={1.6} />
            )}
          </button>
        </div>
      </div>
    </article>
  );
});
