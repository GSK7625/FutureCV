import { Link, useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import {
  IconMapPin,
  IconCalendar,
  IconBriefcase,
  IconClock,
  IconCircleCheck,
  IconArrowLeft,
} from "@tabler/icons-react";
import { jobService } from "~/features/candidate/services/jobService";
import { candidateQueryKeys } from "~/features/candidate/queries/candidateQueryKeys";
import { QueryBoundary, SkeletonCard, JobCard } from "~/components/shared";
import { Badge } from "~/components/ui/Badge";
import { Button } from "~/components/ui/Button";
import { Card, CardContent, CardHeader } from "~/components/ui/Card";
import { formatSalary, timeAgo } from "~/utils";

export default function JobDetailPage() {
  const { jobId = "" } = useParams();

  const jobQuery = useQuery({
    queryKey: candidateQueryKeys.jobs.detail(jobId),
    queryFn: () => jobService().detail(jobId),
  });

  const similarQuery = useQuery({
    queryKey: ["candidate", "jobs", "similar", jobId],
    queryFn: () => jobService().similar(jobId),
    enabled: jobQuery.isSuccess,
  });

  const job = jobQuery.data;

  return (
    <div>
      <Link
        to="/candidate"
        className="mb-6 inline-flex items-center gap-2 text-label font-semibold text-navy hover:underline"
      >
        <IconArrowLeft size={16} stroke={2} /> Quay lại danh sách việc làm
      </Link>

      <QueryBoundary
        isLoading={jobQuery.isLoading}
        error={jobQuery.error}
        onRetry={jobQuery.refetch}
        skeleton={
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="flex flex-col gap-4 lg:col-span-2">
              <SkeletonCard lines={4} />
              <SkeletonCard lines={6} />
            </div>
            <SkeletonCard lines={4} />
          </div>
        }
      >
        {job && (
          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
            {/* Cột chính */}
            <div className="flex flex-col gap-6 lg:col-span-2">
              <Card>
                <CardContent>
                  <div className="flex items-start gap-4">
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-default border border-border-subtle bg-surface-low">
                      {job.companyLogo ? (
                        <img src={job.companyLogo} alt={job.company} className="h-full w-full object-contain p-2" />
                      ) : (
                        <span className="text-headline font-bold text-navy">
                          {job.company.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h1 className="text-headline-md text-navy">{job.title}</h1>
                      <p className="mt-1 font-semibold uppercase tracking-wide text-ink-variant">
                        {job.company}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Badge variant="gold" className="font-bold">
                          {formatSalary(job.salaryMin, job.salaryMax)}
                        </Badge>
                        <Badge variant="neutral">
                          <IconMapPin size={12} stroke={1.8} /> {job.location}
                        </Badge>
                        <Badge variant="neutral">{job.jobType}</Badge>
                        <Badge variant="neutral">
                          <IconClock size={12} stroke={1.8} /> {job.experience}
                        </Badge>
                      </div>
                      <p className="mt-4 text-label-sm text-ink-muted">
                        <IconCalendar size={14} stroke={1.6} className="mr-1 inline align-[-2px]" />
                        {timeAgo(job.postedAt)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-4 border-t border-border-subtle pt-6">
                    <Button variant="accent" size="lg">
                      <Link to={`/candidate/jobs/${job.id}/apply`}>Ứng tuyển ngay</Link>
                    </Button>
                    <Button variant="secondary" size="lg">
                      Lưu việc làm
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <h2 className="font-semibold text-navy">Mô tả công việc</h2>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-line text-ink-variant">
                    {job.description ?? "Chưa có mô tả chi tiết cho vị trí này."}
                  </p>

                  {job.requirements && job.requirements.length > 0 && (
                    <>
                      <h3 className="mb-3 mt-8 font-semibold text-navy">Yêu cầu ứng viên</h3>
                      <ul className="flex flex-col gap-2">
                        {job.requirements.map((req) => (
                          <li key={req} className="flex items-start gap-2 text-ink-variant">
                            <IconCircleCheck size={18} stroke={1.6} className="mt-0.5 shrink-0 text-success" />
                            {req}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}

                  {job.benefits && job.benefits.length > 0 && (
                    <>
                      <h3 className="mb-3 mt-8 font-semibold text-navy">Quyền lợi</h3>
                      <ul className="flex flex-col gap-2">
                        {job.benefits.map((benefit) => (
                          <li key={benefit} className="flex items-start gap-2 text-ink-variant">
                            <IconCircleCheck size={18} stroke={1.6} className="mt-0.5 shrink-0 text-gold" />
                            {benefit}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}

                  <div className="mt-8 flex flex-wrap gap-2 border-t border-border-subtle pt-6">
                    {job.categories.map((cat) => (
                      <Badge key={cat} variant="navy">
                        <IconBriefcase size={12} stroke={1.8} /> {cat}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Cột phải: công ty */}
            <div className="flex flex-col gap-6">
              <Card>
                <CardContent className="text-center">
                  <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-lg border border-border-subtle bg-surface-low">
                    <span className="text-headline font-bold text-navy">
                      {job.company.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <h2 className="font-semibold text-navy">{job.company}</h2>
                  <p className="mt-2 text-label text-ink-variant">{job.location}</p>
                  <Button variant="ghost" className="mt-4 w-full border border-border-strong">
                    Xem trang công ty
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Việc làm tương tự */}
            {similarQuery.data && similarQuery.data.length > 0 && (
              <div className="lg:col-span-3">
                <h2 className="mb-6 text-headline-md text-navy">Việc làm tương tự</h2>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {similarQuery.data.map((similar) => (
                    <JobCard key={similar.id} job={similar} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </QueryBoundary>
    </div>
  );
}
