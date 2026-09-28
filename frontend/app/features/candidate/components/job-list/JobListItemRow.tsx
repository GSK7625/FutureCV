/**
 * @file JobListItemRow.tsx
 * @description Card hiển thị một mục việc làm trong danh sách.
 * @architecture Pure presentation component (dumb UI).
 */

import { Link } from "react-router";
import { IconMapPin, IconClock, IconBriefcase } from "@tabler/icons-react";
import { Badge } from "~/components/ui/Badge";
import { formatSalary, timeAgo } from "~/utils";
import type { Job } from "../../types";

interface JobListItemRowProps {
  job: Job;
}

export function JobListItemRow({ job }: JobListItemRowProps) {
  const companyInitial = job.company ? job.company.charAt(0).toUpperCase() : "J";

  return (
    <article className="group relative rounded-default border border-border-subtle bg-surface p-5 shadow-surface transition-all duration-200 hover:-translate-y-0.5 hover:border-navy hover:shadow-card">
      <div className="flex flex-col gap-4 sm:flex-row">
        {/* Company Logo / Fallback */}
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
            <h3 className="line-clamp-2 text-title font-semibold leading-snug text-navy">
              <Link
                to={`/jobs/${job.id}`}
                className="transition-colors hover:text-gold"
              >
                {job.title}
              </Link>
            </h3>
            <Badge variant="gold" className="shrink-0 font-bold text-label">
              {formatSalary(job.salaryMin, job.salaryMax)}
            </Badge>
          </div>

          <p className="mt-1 text-label font-medium uppercase tracking-wide text-ink-variant">
            {job.company}
          </p>

          {/* Badges */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge variant="neutral" className="gap-1">
              <IconMapPin size={13} stroke={1.8} className="text-ink-muted" />
              {job.location}
            </Badge>

            {job.jobType && (
              <Badge variant="neutral" className="gap-1">
                <IconBriefcase size={13} stroke={1.8} className="text-ink-muted" />
                {job.jobType}
              </Badge>
            )}

            <Badge variant="neutral">
              {job.experience}
            </Badge>

            {job.level && (
              <Badge variant="neutral">
                {job.level}
              </Badge>
            )}

            {job.hot && (
              <Badge variant="gold" className="font-bold">
                HOT
              </Badge>
            )}
          </div>

          {/* Footer of Card */}
          <div className="mt-4 flex items-center justify-between border-t border-border-subtle pt-3 text-label-sm text-ink-muted">
            <span className="line-clamp-1">
              {job.categories.length > 0 ? job.categories.join(", ") : "Việc làm nổi bật"}
            </span>
            <span className="flex shrink-0 items-center gap-1">
              <IconClock size={13} stroke={1.6} />
              {timeAgo(job.postedAt)}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}
