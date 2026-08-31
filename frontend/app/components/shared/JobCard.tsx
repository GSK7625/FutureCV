import { Link } from "react-router";
import { IconBookmark, IconMapPin } from "@tabler/icons-react";
import { Badge } from "~/components/ui/Badge";
import { formatSalary, timeAgo } from "~/utils";
import type { Job } from "~/features/candidate/types";
import { cn } from "~/lib/cn";

export function JobCard({ job, className }: { job: Job; className?: string }) {
  return (
    <article
      className={cn(
        "relative flex h-full flex-col rounded-default border border-border-subtle bg-surface p-6 shadow-surface transition-shadow hover:shadow-md",
        className,
      )}
    >
      <div className="mb-4 flex items-start gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-default border border-border-subtle bg-surface-low">
          {job.companyLogo ? (
            <img src={job.companyLogo} alt={job.company} className="h-full w-full object-contain p-2" />
          ) : (
            <span className="text-headline-md font-bold text-navy">
              {job.company.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-grow">
          <h3 className="line-clamp-2 text-body font-semibold leading-snug text-navy">
            <Link
              to={`/candidate/jobs/${job.id}`}
              className="transition-colors hover:text-gold"
            >
              {job.title}
            </Link>
          </h3>
          <p className="mt-1 line-clamp-1 text-label text-ink-variant">{job.company}</p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge variant="navy">{formatSalary(job.salaryMin, job.salaryMax)}</Badge>
        <Badge variant="neutral">
          <IconMapPin size={12} stroke={1.8} />
          {job.location}
        </Badge>
        {job.hot && <Badge variant="gold" className="font-bold">HOT</Badge>}
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-border-subtle pt-4 text-label-sm text-ink-muted">
        <span>{timeAgo(job.postedAt)}</span>
        <button
          type="button"
          aria-label="Lưu việc làm"
          className="text-ink-muted transition-colors hover:text-gold"
        >
          <IconBookmark size={20} stroke={1.6} />
        </button>
      </div>
    </article>
  );
}
