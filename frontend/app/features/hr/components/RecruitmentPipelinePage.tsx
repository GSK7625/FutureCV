import { useEffect, useMemo, useState } from "react";
import { IconColumns, IconList, IconSearch, IconUsers } from "@tabler/icons-react";
import { Avatar, Button, Card, CardContent, EmptyState, Input, Skeleton } from "~/components/ui";
import { QueryBoundary } from "~/components/shared/QueryBoundary";
import { useDebounce } from "~/hooks/useDebounce";
import { useEmployerJobs } from "../hooks/useEmployerJobs";
import { useRecruiterApplications, useRecruitmentPipeline } from "../hooks/useRecruiterApplications";
import type { ApplicationStatus, RecruiterApplicationFilters } from "../types";
import { ApplicationDetailsModal } from "./ApplicationDetailsModal";
import { ApplicationStatusBadge, applicationStatusLabels, updatableApplicationStatuses } from "./ApplicationStatusBadge";

type ViewMode = "pipeline" | "list";

export function RecruitmentPipelinePage() {
  const jobsQuery = useEmployerJobs({ pageIndex: 1, pageSize: 100 });
  const [jobId, setJobId] = useState("");
  const [view, setView] = useState<ViewMode>("pipeline");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [filters, setFilters] = useState<RecruiterApplicationFilters>({ pageIndex: 1, pageSize: 10 });
  const [applicationId, setApplicationId] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId && jobsQuery.data?.items[0]) setJobId(jobsQuery.data.items[0].id);
  }, [jobId, jobsQuery.data]);

  const effectiveFilters = useMemo(() => ({ ...filters, keyword: debouncedSearch }), [filters, debouncedSearch]);
  const pipelineQuery = useRecruitmentPipeline(view === "pipeline" ? jobId : "");
  const applicationsQuery = useRecruiterApplications(view === "list" ? jobId : "", effectiveFilters);
  const jobs = jobsQuery.data?.items ?? [];

  return (
    <section aria-labelledby="pipeline-title">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-label font-semibold text-gold">ỨNG VIÊN</p><h1 id="pipeline-title" className="mt-1 text-headline text-navy">Recruitment Pipeline</h1><p className="mt-2 text-ink-variant">Theo dõi, đánh giá và cập nhật ứng viên theo từng tin tuyển dụng.</p></div><div className="flex rounded-default border border-border-strong bg-surface p-1"><ViewButton active={view === "pipeline"} onClick={() => setView("pipeline")} icon={<IconColumns size={18} aria-hidden="true" />}>Pipeline</ViewButton><ViewButton active={view === "list"} onClick={() => setView("list")} icon={<IconList size={18} aria-hidden="true" />}>Danh sách</ViewButton></div></div>

      <QueryBoundary isLoading={jobsQuery.isLoading} error={jobsQuery.error} onRetry={() => jobsQuery.refetch()} skeleton={<Skeleton className="mt-6 h-20" />}>
        {jobs.length === 0 ? <EmptyState className="mt-6" icon={<IconUsers size={42} aria-hidden="true" />} title="Chưa có tin tuyển dụng" description="Tạo tin tuyển dụng trước khi quản lý ứng viên." /> : <>
          <div className="mt-6 rounded-default border border-border-subtle bg-surface p-4 shadow-surface"><label htmlFor="pipeline-job" className="mb-2 block text-label font-semibold text-ink">Tin tuyển dụng</label><select id="pipeline-job" value={jobId} onChange={(event) => { setJobId(event.target.value); setFilters((current) => ({ ...current, pageIndex: 1 })); }} className="h-11 w-full rounded-default border border-border-strong bg-white px-3.5 text-ink focus:border-gold">{jobs.map((job) => <option key={job.id} value={job.id}>{job.title}</option>)}</select></div>
          {view === "pipeline" ? <PipelineView query={pipelineQuery} onOpen={setApplicationId} /> : <ApplicationListView search={search} setSearch={setSearch} filters={filters} setFilters={setFilters} query={applicationsQuery} onOpen={setApplicationId} />}
        </>}
      </QueryBoundary>
      <ApplicationDetailsModal applicationId={applicationId} onClose={() => setApplicationId(null)} />
    </section>
  );
}

function ViewButton({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return <button type="button" aria-pressed={active} onClick={onClick} className={active ? "flex min-h-11 items-center gap-2 rounded-default bg-navy px-3 py-2 text-label font-semibold text-white" : "flex min-h-11 items-center gap-2 rounded-default px-3 py-2 text-label font-semibold text-ink-variant hover:bg-surface-low"}>{icon}{children}</button>;
}

function PipelineView({ query, onOpen }: { query: ReturnType<typeof useRecruitmentPipeline>; onOpen: (id: string) => void }) {
  return <QueryBoundary isLoading={query.isLoading} error={query.error} onRetry={() => query.refetch()} skeleton={<div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-56" />)}</div>}>
    {query.data && <><p className="mt-5 text-label text-ink-muted">{query.data.totalCandidates} ứng viên trong pipeline</p><div className="mt-3 grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">{query.data.stages.map((stage) => <Card key={stage.stage}><CardContent className="p-4"><div className="flex items-center justify-between"><h2 className="font-semibold text-navy">{applicationStatusLabels[stage.stage]}</h2><span className="rounded-full bg-navy/10 px-2.5 py-1 text-label-sm font-semibold text-navy">{stage.count}</span></div><div className="mt-4 space-y-3">{stage.candidates.length ? stage.candidates.map((candidate) => <button key={candidate.applicationId} type="button" onClick={() => onOpen(candidate.applicationId)} className="flex min-h-16 w-full items-center gap-3 rounded-default border border-border-subtle bg-surface-low p-3 text-left hover:border-gold focus-visible:ring-2 focus-visible:ring-gold"><Avatar src={candidate.candidateAvatarUrl ?? undefined} name={candidate.candidateFullName} /><span className="min-w-0 flex-1"><span className="block truncate font-semibold text-ink">{candidate.candidateFullName}</span><span className="mt-1 block text-label text-ink-muted">{candidate.rating ? `${candidate.rating}/5 sao` : "Chưa đánh giá"} · Match {candidate.matchScore ?? "—"}%</span></span></button>) : <p className="rounded-default border border-dashed border-border-subtle p-4 text-center text-label text-ink-muted">Chưa có ứng viên</p>}</div></CardContent></Card>)}</div></>}
  </QueryBoundary>;
}

function ApplicationListView({ search, setSearch, filters, setFilters, query, onOpen }: { search: string; setSearch: (value: string) => void; filters: RecruiterApplicationFilters; setFilters: React.Dispatch<React.SetStateAction<RecruiterApplicationFilters>>; query: ReturnType<typeof useRecruiterApplications>; onOpen: (id: string) => void }) {
  const applications = query.data?.items ?? [];
  return <div className="mt-5"><div className="grid gap-3 rounded-default border border-border-subtle bg-surface p-4 md:grid-cols-[minmax(0,1fr)_12rem_10rem]"><Input aria-label="Tìm ứng viên" icon={<IconSearch size={18} aria-hidden="true" />} placeholder="Tên hoặc email ứng viên" value={search} onChange={(event) => setSearch(event.target.value)} /><select aria-label="Lọc trạng thái" value={filters.status ?? ""} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value as ApplicationStatus | "", pageIndex: 1 }))} className="h-11 rounded-default border border-border-strong bg-white px-3.5"><option value="">Mọi trạng thái</option>{[...updatableApplicationStatuses, "Withdrawn" as const].map((status) => <option key={status} value={status}>{applicationStatusLabels[status]}</option>)}</select><select aria-label="Lọc đánh giá" value={filters.minRating ?? ""} onChange={(event) => setFilters((current) => ({ ...current, minRating: event.target.value ? Number(event.target.value) : undefined, pageIndex: 1 }))} className="h-11 rounded-default border border-border-strong bg-white px-3.5"><option value="">Mọi đánh giá</option>{[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>Từ {rating} sao</option>)}</select></div><QueryBoundary isLoading={query.isLoading} error={query.error} onRetry={() => query.refetch()} skeleton={<Skeleton className="mt-4 h-72" />}>{applications.length ? <><div className="mt-4 grid gap-3">{applications.map((application) => <button key={application.id} type="button" onClick={() => onOpen(application.id)} className="grid min-h-20 w-full gap-3 rounded-default border border-border-subtle bg-surface p-4 text-left shadow-surface hover:border-gold sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center"><span className="flex min-w-0 items-center gap-3"><Avatar src={application.candidateAvatarUrl ?? undefined} name={application.candidateFullName} /><span className="min-w-0"><span className="block truncate font-semibold text-navy">{application.candidateFullName}</span><span className="block truncate text-label text-ink-muted">{application.candidateEmail ?? application.cvTitle ?? "Chưa có thông tin liên hệ"}</span></span></span><ApplicationStatusBadge status={application.status} /><span className="text-label tabular-nums text-ink-variant">{application.rating ? `${application.rating}/5 sao` : "Chưa đánh giá"} · Match {application.matchScore ?? "—"}%</span></button>)}</div><div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-label text-ink-muted">{query.data?.totalCount ?? 0} ứng viên · Trang {query.data?.pageIndex ?? 1}/{Math.max(query.data?.totalPages ?? 1, 1)}</p><div className="flex gap-2"><Button variant="secondary" size="sm" disabled={!query.data?.hasPreviousPage} onClick={() => setFilters((current) => ({ ...current, pageIndex: Math.max(1, (current.pageIndex ?? 1) - 1) }))}>Trang trước</Button><Button variant="secondary" size="sm" disabled={!query.data?.hasNextPage} onClick={() => setFilters((current) => ({ ...current, pageIndex: (current.pageIndex ?? 1) + 1 }))}>Trang sau</Button></div></div></> : <EmptyState className="mt-4" icon={<IconUsers size={40} aria-hidden="true" />} title="Chưa có ứng viên" description="Không tìm thấy Application phù hợp với bộ lọc hiện tại." />}</QueryBoundary></div>;
}
