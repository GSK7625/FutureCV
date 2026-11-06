import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { IconCheck, IconColumns, IconExternalLink, IconList, IconRefresh, IconSearch, IconSparkles, IconTrophy, IconUsers } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { Avatar, Button, Card, CardContent, EmptyState, Input, Skeleton } from "~/components/ui";
import { QueryBoundary } from "~/components/shared/QueryBoundary";
import { useDebounce } from "~/hooks/useDebounce";
import { useEmployerJobs } from "../hooks/useEmployerJobs";
import {
  useRecruiterApplications,
  useRecruitmentPipeline,
  useJobCandidateRanking,
  useRefreshCandidateRanking,
  useUpdateApplicationStatus,
} from "../hooks/useRecruiterApplications";
import { hrQueryKeys } from "../queries/hrQueryKeys";
import { toSafeDocumentUrl } from "../contracts/hrContracts";
import type {
  ApplicationStatus,
  PipelineCandidate,
  RecruiterApplicationFilters,
  RecruitmentPipeline,
  UpdatableApplicationStatus,
} from "../types";
import { ApplicationDetailsModal } from "./ApplicationDetailsModal";
import {
  ApplicationStatusBadge,
  applicationStatusLabels,
  statusThemeConfig,
  updatableApplicationStatuses,
} from "./ApplicationStatusBadge";

type ViewMode = "pipeline" | "list" | "ranking";

export function RecruitmentPipelinePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const jobsQuery = useEmployerJobs({ pageIndex: 1, pageSize: 100 });

  const [jobId, setJobId] = useState<string>(() => {
    const urlId = searchParams.get("jobId");
    if (urlId) return urlId;
    try {
      return localStorage.getItem("futurecv_hr_pipeline_job_id") || "";
    } catch {
      return "";
    }
  });

  const [view, setView] = useState<ViewMode>(() => {
    const urlView = searchParams.get("view");
    if (urlView === "pipeline" || urlView === "list" || urlView === "ranking") return urlView;
    try {
      const savedView = localStorage.getItem("futurecv_hr_pipeline_view");
      if (savedView === "pipeline" || savedView === "list" || savedView === "ranking") return savedView;
    } catch {}
    return "pipeline";
  });

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [filters, setFilters] = useState<RecruiterApplicationFilters>({ pageIndex: 1, pageSize: 10 });
  const [applicationId, setApplicationId] = useState<string | null>(null);

  const handleSelectJob = (newJobId: string) => {
    setJobId(newJobId);
    setFilters((current) => ({ ...current, pageIndex: 1 }));
    try {
      localStorage.setItem("futurecv_hr_pipeline_job_id", newJobId);
    } catch {}
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("jobId", newJobId);
        return next;
      },
      { replace: true },
    );
  };

  const handleSelectView = (newView: ViewMode) => {
    setView(newView);
    try {
      localStorage.setItem("futurecv_hr_pipeline_view", newView);
    } catch {}
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("view", newView);
        return next;
      },
      { replace: true },
    );
  };

  useEffect(() => {
    if (!jobsQuery.data?.items.length) return;
    const items = jobsQuery.data.items;

    // If current jobId is valid among existing jobs, persist it and ensure URL reflects it
    if (jobId && items.some((j) => j.id === jobId)) {
      try {
        localStorage.setItem("futurecv_hr_pipeline_job_id", jobId);
      } catch {}
      if (searchParams.get("jobId") !== jobId) {
        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev);
            next.set("jobId", jobId);
            return next;
          },
          { replace: true },
        );
      }
      return;
    }

    // 1. Check if URL has a valid jobId
    const urlJobId = searchParams.get("jobId");
    if (urlJobId && items.some((j) => j.id === urlJobId)) {
      setJobId(urlJobId);
      try {
        localStorage.setItem("futurecv_hr_pipeline_job_id", urlJobId);
      } catch {}
      return;
    }

    // 2. Check if localStorage has a valid jobId
    try {
      const savedJobId = localStorage.getItem("futurecv_hr_pipeline_job_id");
      if (savedJobId && items.some((j) => j.id === savedJobId)) {
        setJobId(savedJobId);
        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev);
            next.set("jobId", savedJobId);
            return next;
          },
          { replace: true },
        );
        return;
      }
    } catch {}

    // 3. Fallback to first job
    const defaultJobId = items[0].id;
    setJobId(defaultJobId);
    try {
      localStorage.setItem("futurecv_hr_pipeline_job_id", defaultJobId);
    } catch {}
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("jobId", defaultJobId);
        return next;
      },
      { replace: true },
    );
  }, [jobsQuery.data, jobId, searchParams, setSearchParams]);

  const effectiveFilters = useMemo(() => ({ ...filters, keyword: debouncedSearch }), [filters, debouncedSearch]);
  const pipelineQuery = useRecruitmentPipeline(view === "pipeline" ? jobId : "");
  const applicationsQuery = useRecruiterApplications(view === "list" ? jobId : "", effectiveFilters);
  const rankingQuery = useJobCandidateRanking(view === "ranking" ? jobId : "");
  const jobs = jobsQuery.data?.items ?? [];

  return (
    <section aria-labelledby="pipeline-title">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-label font-semibold text-gold">ỨNG VIÊN</p>
          <h1 id="pipeline-title" className="mt-1 text-headline text-navy">Quy trình tuyển dụng</h1>
          <p className="mt-2 text-ink-variant">Theo dõi và cập nhật ứng viên theo từng tin tuyển dụng.</p>
        </div>
        <div className="flex rounded-default border border-border-strong bg-surface p-1">
          <ViewButton active={view === "pipeline"} onClick={() => handleSelectView("pipeline")} icon={<IconColumns size={18} aria-hidden="true" />}>Quy trình</ViewButton>
          <ViewButton active={view === "list"} onClick={() => handleSelectView("list")} icon={<IconList size={18} aria-hidden="true" />}>Danh sách</ViewButton>
          <ViewButton active={view === "ranking"} onClick={() => handleSelectView("ranking")} icon={<IconSparkles size={18} aria-hidden="true" />}>Xếp hạng AI</ViewButton>
        </div>
      </div>

      <QueryBoundary isLoading={jobsQuery.isLoading} error={jobsQuery.error} onRetry={() => jobsQuery.refetch()} skeleton={<Skeleton className="mt-6 h-20" />}>
        {jobs.length === 0 ? <EmptyState className="mt-6" icon={<IconUsers size={42} aria-hidden="true" />} title="Chưa có tin tuyển dụng" description="Tạo tin tuyển dụng trước khi quản lý ứng viên." /> : <>
          <div className="mt-6 rounded-default border border-border-subtle bg-surface p-4 shadow-surface">
            <label htmlFor="pipeline-job" className="mb-2 block text-label font-semibold text-ink">Tin tuyển dụng</label>
            <select
              id="pipeline-job"
              value={jobId}
              onChange={(event) => handleSelectJob(event.target.value)}
              className="h-11 w-full rounded-default border border-border-strong bg-white px-3.5 text-ink focus:border-gold"
            >
              {jobs.map((job) => <option key={job.id} value={job.id}>{job.title}</option>)}
            </select>
          </div>
          {view === "pipeline" ? (
            <PipelineView jobId={jobId} query={pipelineQuery} onOpen={setApplicationId} />
          ) : view === "list" ? (
            <ApplicationListView search={search} setSearch={(value) => { setSearch(value); setFilters((current) => ({ ...current, pageIndex: 1 })); }} filters={filters} setFilters={setFilters} query={applicationsQuery} onOpen={setApplicationId} />
          ) : (
            <CandidateRankingView jobId={jobId} query={rankingQuery} onOpen={setApplicationId} />
          )}
        </>}
      </QueryBoundary>
      <ApplicationDetailsModal applicationId={applicationId} onClose={() => setApplicationId(null)} />
    </section>
  );
}

function ViewButton({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return <button type="button" aria-pressed={active} onClick={onClick} className={active ? "flex min-h-11 items-center gap-2 rounded-default bg-navy px-3 py-2 text-label font-semibold text-white" : "flex min-h-11 items-center gap-2 rounded-default px-3 py-2 text-label font-semibold text-ink-variant hover:bg-surface-low"}>{icon}{children}</button>;
}

function PipelineView({
  jobId,
  query,
  onOpen,
}: {
  jobId: string;
  query: ReturnType<typeof useRecruitmentPipeline>;
  onOpen: (id: string) => void;
}) {
  const queryClient = useQueryClient();
  const updateStatus = useUpdateApplicationStatus();
  const [draggedItem, setDraggedItem] = useState<{
    applicationId: string;
    fromStage: UpdatableApplicationStatus;
    candidate: PipelineCandidate;
  } | null>(null);
  const [activeDropStage, setActiveDropStage] = useState<UpdatableApplicationStatus | null>(null);
  const [updatingApplicationId, setUpdatingApplicationId] = useState<string | null>(null);

  const handleDragStart = (
    e: React.DragEvent,
    candidate: PipelineCandidate,
    fromStage: UpdatableApplicationStatus,
  ) => {
    const payload = { applicationId: candidate.applicationId, fromStage };
    e.dataTransfer.setData("application/json", JSON.stringify(payload));
    e.dataTransfer.effectAllowed = "move";
    setDraggedItem({ applicationId: candidate.applicationId, fromStage, candidate });
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setActiveDropStage(null);
  };

  const handleDrop = async (
    e: React.DragEvent,
    targetStage: UpdatableApplicationStatus,
  ) => {
    e.preventDefault();
    setActiveDropStage(null);

    let candidate = draggedItem?.candidate;
    let applicationId = draggedItem?.applicationId;
    let fromStage = draggedItem?.fromStage;

    if (!applicationId || !fromStage) {
      try {
        const raw = e.dataTransfer.getData("application/json");
        if (raw) {
          const parsed = JSON.parse(raw);
          applicationId = parsed.applicationId;
          fromStage = parsed.fromStage;
        }
      } catch {
        // Ignore JSON parse error
      }
    }

    setDraggedItem(null);

    if (!applicationId || !fromStage || fromStage === targetStage) {
      return;
    }

    const queryKey = hrQueryKeys.applications.pipeline(jobId);
    const previousData = queryClient.getQueryData<RecruitmentPipeline>(queryKey);

    if (previousData) {
      if (!candidate) {
        for (const st of previousData.stages) {
          const found = st.candidates.find((c) => c.applicationId === applicationId);
          if (found) {
            candidate = found;
            break;
          }
        }
      }

      if (candidate) {
        const movingCandidate = candidate;
        queryClient.setQueryData<RecruitmentPipeline>(queryKey, {
          ...previousData,
          stages: previousData.stages.map((st) => {
            if (st.stage === fromStage) {
              return {
                ...st,
                count: Math.max(0, st.count - 1),
                candidates: st.candidates.filter((c) => c.applicationId !== applicationId),
              };
            }
            if (st.stage === targetStage) {
              return {
                ...st,
                count: st.count + 1,
                candidates: [movingCandidate, ...st.candidates],
              };
            }
            return st;
          }),
        });
      }
    }

    setUpdatingApplicationId(applicationId);
    try {
      await updateStatus.mutateAsync({
        id: applicationId,
        input: { newStatus: targetStage, reason: null },
      });
    } catch {
      if (previousData) {
        queryClient.setQueryData(queryKey, previousData);
      }
    } finally {
      setUpdatingApplicationId(null);
    }
  };

  return (
    <QueryBoundary
      isLoading={query.isLoading}
      error={query.error}
      onRetry={() => query.refetch()}
      skeleton={
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-56" />
          ))}
        </div>
      }
    >
      {query.data && (
        <>
          <p className="mt-5 text-label text-ink-muted">
            {query.data.totalCandidates} ứng viên trong quy trình
          </p>
          <div className="mt-3 grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
            {query.data.stages.map((stage) => {
              const theme = statusThemeConfig[stage.stage] ?? statusThemeConfig.Applied;
              const isDropTarget =
                activeDropStage === stage.stage && draggedItem?.fromStage !== stage.stage;
              const isCurrentSource = draggedItem?.fromStage === stage.stage;

              return (
                <Card
                  key={stage.stage}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (draggedItem && draggedItem.fromStage !== stage.stage) {
                      e.dataTransfer.dropEffect = "move";
                    }
                  }}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    if (draggedItem && draggedItem.fromStage !== stage.stage) {
                      setActiveDropStage(stage.stage);
                    }
                  }}
                  onDragLeave={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                      setActiveDropStage((current) => (current === stage.stage ? null : current));
                    }
                  }}
                  onDrop={(e) => handleDrop(e, stage.stage)}
                  className={`overflow-hidden border-t-4 transition-all duration-200 shadow-surface ${theme.topBorder} ${
                    isDropTarget
                      ? `${theme.cardActiveRing} ring-2 ${theme.cardActiveBg} shadow-md`
                      : isCurrentSource
                        ? "border-border-strong opacity-80"
                        : theme.cardBorder
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between pb-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`h-2.5 w-2.5 rounded-full shrink-0 ${theme.dotColor}`}
                          aria-hidden="true"
                        />
                        <h2 className="font-bold text-navy text-body">
                          {applicationStatusLabels[stage.stage]}
                        </h2>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-label-sm font-bold border transition-colors shadow-2xs ${
                          isDropTarget
                            ? "bg-navy text-white border-navy"
                            : theme.countPill
                        }`}
                      >
                        {stage.count}
                      </span>
                    </div>
                    <div className="mt-3.5 min-h-[5.5rem] space-y-2.5">
                      {isDropTarget && (
                        <div
                          className={`flex items-center justify-center rounded-default border-2 border-dashed p-3 text-center text-label-sm font-semibold animate-pulse ${theme.dropZoneBorder} ${theme.dropZoneBg} ${theme.dropZoneText}`}
                        >
                          Thả để chuyển sang {applicationStatusLabels[stage.stage]}
                        </div>
                      )}
                      {stage.candidates.length ? (
                        stage.candidates.map((candidate) => (
                          <PipelineCandidateCard
                            key={candidate.applicationId}
                            candidate={candidate}
                            isDragging={draggedItem?.applicationId === candidate.applicationId}
                            isUpdating={updatingApplicationId === candidate.applicationId}
                            onOpen={onOpen}
                            onDragStart={(e) => handleDragStart(e, candidate, stage.stage)}
                            onDragEnd={handleDragEnd}
                          />
                        ))
                      ) : (
                        !isDropTarget && (
                          <p className="rounded-default border border-dashed border-border-subtle p-4 text-center text-label text-ink-muted">
                            Chưa có ứng viên
                          </p>
                        )
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </QueryBoundary>
  );
}

function PipelineCandidateCard({
  candidate,
  isDragging,
  isUpdating,
  onOpen,
  onDragStart,
  onDragEnd,
}: {
  candidate: PipelineCandidate;
  isDragging: boolean;
  isUpdating: boolean;
  onOpen: (id: string) => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      draggable={!isUpdating}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={() => {
        if (!isUpdating) onOpen(candidate.applicationId);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (!isUpdating) onOpen(candidate.applicationId);
        }
      }}
      className={`group relative flex min-h-16 w-full cursor-grab items-start gap-3 rounded-default border bg-surface-low p-3 text-left transition-all select-none hover:border-gold hover:shadow-sm focus-visible:ring-2 focus-visible:ring-gold active:cursor-grabbing ${
        isDragging
          ? "opacity-30 scale-95 border-dashed border-gold"
          : isUpdating
            ? "opacity-50 pointer-events-none border-border-subtle"
            : "border-border-subtle"
      }`}
    >
      <Avatar src={candidate.candidateAvatarUrl ?? undefined} name={candidate.candidateFullName} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-1.5">
          <span className="block truncate font-semibold text-ink group-hover:text-navy">
            {candidate.candidateFullName}
          </span>
          {candidate.matchScore !== null && candidate.matchScore !== undefined && (
            <MatchScoreBadge score={candidate.matchScore} />
          )}
        </span>
        <span className="mt-1 block text-label text-ink-muted">
          Ứng tuyển {new Date(candidate.appliedAt).toLocaleDateString("vi-VN")}
        </span>
      </span>
    </div>
  );
}

function ApplicationListView({ search, setSearch, filters, setFilters, query, onOpen }: { search: string; setSearch: (value: string) => void; filters: RecruiterApplicationFilters; setFilters: React.Dispatch<React.SetStateAction<RecruiterApplicationFilters>>; query: ReturnType<typeof useRecruiterApplications>; onOpen: (id: string) => void }) {
  const applications = query.data?.items ?? [];
  return (
    <div className="mt-5">
      <div className="grid gap-3 rounded-default border border-border-subtle bg-surface p-4 md:grid-cols-[minmax(0,1fr)_12rem_13rem]">
        <Input aria-label="Tìm ứng viên" icon={<IconSearch size={18} aria-hidden="true" />} placeholder="Tên ứng viên" value={search} onChange={(event) => setSearch(event.target.value)} />
        <select aria-label="Lọc trạng thái" value={filters.status ?? ""} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value as ApplicationStatus | "", pageIndex: 1 }))} className="h-11 rounded-default border border-border-strong bg-white px-3.5 text-xs text-ink focus:border-gold">
          <option value="">Mọi trạng thái</option>
          {[...updatableApplicationStatuses, "Withdrawn" as const].map((status) => <option key={status} value={status}>{applicationStatusLabels[status]}</option>)}
        </select>
        <select aria-label="Sắp xếp" value={filters.sortBy ?? "applied_at"} onChange={(event) => setFilters((current) => ({ ...current, sortBy: event.target.value as "applied_at" | "match_score", pageIndex: 1 }))} className="h-11 rounded-default border border-border-strong bg-white px-3.5 text-xs text-ink focus:border-gold">
          <option value="applied_at">Mới ứng tuyển nhất</option>
          <option value="match_score">Độ phù hợp AI (Cao nhất)</option>
        </select>
      </div>
      <QueryBoundary isLoading={query.isLoading} error={query.error} onRetry={() => query.refetch()} skeleton={<Skeleton className="mt-4 h-72" />}>
        {applications.length ? (
          <>
            <div className="mt-4 grid gap-3">
              {applications.map((application) => (
                <button
                  key={application.id}
                  type="button"
                  onClick={() => onOpen(application.id)}
                  className="grid min-h-20 w-full gap-3 rounded-default border border-border-subtle bg-surface p-4 text-left shadow-surface hover:border-gold sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <Avatar src={application.candidateAvatarUrl ?? undefined} name={application.candidateFullName} />
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-navy">{application.candidateFullName}</span>
                      <span className="block truncate text-label text-ink-muted">
                        {application.candidatePhone ?? application.cvTitle ?? "CV ứng tuyển"}
                      </span>
                    </span>
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    {application.matchScore !== null && application.matchScore !== undefined && (
                      <MatchScoreBadge score={application.matchScore} />
                    )}
                    <ApplicationStatusBadge status={application.status} />
                  </div>
                </button>
              ))}
            </div>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-label text-ink-muted">
              {query.data?.totalCount ?? 0} ứng viên · Trang {query.data?.pageIndex ?? 1}/{Math.max(query.data?.totalPages ?? 1, 1)}
            </p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={!query.data?.hasPreviousPage}
                onClick={() => setFilters((current) => ({ ...current, pageIndex: Math.max(1, (current.pageIndex ?? 1) - 1) }))}
              >
                Trang trước
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={!query.data?.hasNextPage}
                onClick={() => setFilters((current) => ({ ...current, pageIndex: (current.pageIndex ?? 1) + 1 }))}
              >
                Trang sau
              </Button>
            </div>
          </div>
        </>
      ) : (
        <EmptyState
          className="mt-4"
          icon={<IconUsers size={40} aria-hidden="true" />}
          title="Chưa có ứng viên"
          description="Không tìm thấy ứng viên phù hợp với bộ lọc hiện tại."
        />
      )}
    </QueryBoundary>
    </div>
  );
}

export function MatchScoreBadge({ score }: { score: number | null | undefined }) {
  if (score === null || score === undefined) return null;
  const colorClass =
    score >= 80
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : score >= 60
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : "bg-slate-50 text-slate-600 border-slate-200";

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${colorClass}`}
      title={`Điểm phù hợp AI: ${score}%`}
    >
      <IconSparkles size={11} className="shrink-0 text-gold" aria-hidden="true" />
      <span>{score}%</span>
    </span>
  );
}

function CandidateRankingView({
  jobId,
  query,
  onOpen,
}: {
  jobId: string;
  query: ReturnType<typeof useJobCandidateRanking>;
  onOpen: (id: string) => void;
}) {
  const refreshMutation = useRefreshCandidateRanking(jobId);
  const data = query.data;
  const candidates = data?.rankedCandidates ?? [];

  return (
    <div className="mt-5 space-y-4">
      {/* AI Ranking Header Banner */}
      <div className="flex flex-col gap-3 rounded-default border border-gold/40 bg-gradient-to-r from-gold/[0.08] via-surface to-surface p-4 sm:flex-row sm:items-center sm:justify-between shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gold/20 text-gold">
              <IconSparkles size={16} aria-hidden="true" />
            </span>
            <h2 className="text-base font-bold text-navy">Bảng xếp hạng ứng viên bằng AI</h2>
            {data?.isAiEvaluated && (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                Đã phân tích AI
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-ink-muted">
            Hệ thống tự động so khớp kỹ năng, kinh nghiệm và hồ sơ với tiêu chuẩn của tin tuyển dụng để xếp hạng ứng viên từ cao xuống thấp.
          </p>
        </div>

        <div className="shrink-0">
          <Button
            variant="secondary"
            size="sm"
            disabled={refreshMutation.isPending || query.isLoading}
            onClick={() => refreshMutation.mutate()}
            className="flex items-center gap-1.5 border-gold text-navy hover:bg-gold/10"
          >
            <IconRefresh
              size={15}
              className={refreshMutation.isPending ? "animate-spin text-gold" : "text-gold"}
              aria-hidden="true"
            />
            <span>{refreshMutation.isPending ? "Đang phân tích..." : "Đánh giá lại bằng AI"}</span>
          </Button>
        </div>
      </div>

      <QueryBoundary
        isLoading={query.isLoading}
        error={query.error}
        onRetry={() => query.refetch()}
        skeleton={<Skeleton className="h-96" />}
      >
        {candidates.length === 0 ? (
          <EmptyState
            className="mt-4"
            icon={<IconUsers size={40} aria-hidden="true" />}
            title="Chưa có ứng viên nào"
            description="Tin tuyển dụng này chưa nhận được đơn ứng tuyển để AI xếp hạng."
          />
        ) : (
          <div className="space-y-3">
            {candidates.map((candidate) => {
              const isTop1 = candidate.rank === 1;
              const isTop2 = candidate.rank === 2;
              const isTop3 = candidate.rank === 3;

              return (
                <div
                  key={candidate.applicationId}
                  className={`relative rounded-default border bg-surface p-4 transition-all hover:border-gold hover:shadow-sm ${
                    isTop1
                      ? "border-amber-300 ring-1 ring-amber-300/40 bg-amber-50/[0.03]"
                      : isTop2
                        ? "border-slate-300"
                        : isTop3
                          ? "border-amber-200"
                          : "border-border-subtle"
                  }`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    {/* Left: Rank & Candidate Information */}
                    <div className="flex items-start gap-3 min-w-0">
                      {/* Rank Badge */}
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-default font-bold text-sm shadow-xs ${
                          isTop1
                            ? "bg-gradient-to-br from-amber-400 to-amber-600 text-white"
                            : isTop2
                              ? "bg-gradient-to-br from-slate-300 to-slate-500 text-white"
                              : isTop3
                                ? "bg-gradient-to-br from-amber-600 to-amber-800 text-white"
                                : "bg-surface-low border border-border-strong text-ink font-semibold"
                        }`}
                      >
                        {isTop1 ? (
                          <div className="flex flex-col items-center leading-none">
                            <IconTrophy size={14} className="mb-0.5" aria-hidden="true" />
                            <span className="text-xs">#1</span>
                          </div>
                        ) : (
                          `#${candidate.rank}`
                        )}
                      </div>

                      <Avatar
                        src={candidate.candidateAvatarUrl ?? undefined}
                        name={candidate.candidateFullName}
                        size="md"
                      />

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3
                            role="button"
                            tabIndex={0}
                            onClick={() => onOpen(candidate.applicationId)}
                            className="font-bold text-base text-navy hover:text-gold cursor-pointer truncate"
                          >
                            {candidate.candidateFullName}
                          </h3>
                          <ApplicationStatusBadge status={candidate.status} />
                        </div>

                        <div className="flex flex-wrap items-center gap-x-2 text-xs text-ink-muted mt-0.5">
                          <span>{candidate.candidatePhone ?? "Chưa có SĐT"}</span>
                          {candidate.candidateEmail && (
                            <>
                              <span>•</span>
                              <span className="truncate">{candidate.candidateEmail}</span>
                            </>
                          )}
                          <span>•</span>
                          <span>Ứng tuyển {new Date(candidate.appliedAt).toLocaleDateString("vi-VN")}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Match Score Progress & Action */}
                    <div className="flex items-center gap-4 sm:flex-col sm:items-end">
                      <div className="text-right">
                        <div className="flex items-center gap-1.5 justify-end">
                          <IconSparkles size={14} className="text-gold" aria-hidden="true" />
                          <span
                            className={`text-lg font-extrabold ${
                              candidate.matchScore >= 80
                                ? "text-emerald-700"
                                : candidate.matchScore >= 60
                                  ? "text-amber-700"
                                  : "text-ink"
                            }`}
                          >
                            {candidate.matchScore}%
                          </span>
                        </div>
                        <span className="text-[11px] text-ink-muted block">Độ phù hợp AI</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => onOpen(candidate.applicationId)}
                          className="text-xs"
                        >
                          Xem chi tiết
                        </Button>
                        {candidate.cvFileUrl && (
                          <a
                            href={toSafeDocumentUrl(candidate.cvFileUrl) ?? "#"}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex h-8 items-center gap-1 rounded-default border border-border-strong bg-white px-2.5 text-xs font-semibold text-navy hover:border-gold hover:text-gold"
                          >
                            <span>CV</span>
                            <IconExternalLink size={13} aria-hidden="true" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* AI Explanation & Skills Gap */}
                  {(candidate.matchExplanation ||
                    candidate.matchedSkills.length > 0 ||
                    candidate.missingSkills.length > 0) && (
                    <div className="mt-3 border-t border-border-subtle/70 pt-2.5 space-y-2">
                      {candidate.matchExplanation && (
                        <p className="text-xs text-ink-variant leading-relaxed bg-surface-low/70 rounded p-2 border border-border-subtle/50">
                          <strong className="text-navy font-semibold">Lý do phù hợp: </strong>
                          {candidate.matchExplanation}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
                        {candidate.matchedSkills.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1">
                            <span className="text-[11px] font-semibold text-emerald-700">Khớp ({candidate.matchedSkills.length}):</span>
                            {candidate.matchedSkills.slice(0, 5).map((skill) => (
                              <span
                                key={skill}
                                className="inline-flex items-center gap-0.5 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 border border-emerald-200"
                              >
                                <IconCheck size={10} aria-hidden="true" />
                                {skill}
                              </span>
                            ))}
                            {candidate.matchedSkills.length > 5 && (
                              <span className="text-[10px] text-ink-muted">
                                +{candidate.matchedSkills.length - 5}
                              </span>
                            )}
                          </div>
                        )}

                        {candidate.missingSkills.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1">
                            <span className="text-[11px] font-semibold text-amber-700">Thiếu ({candidate.missingSkills.length}):</span>
                            {candidate.missingSkills.slice(0, 5).map((skill) => (
                              <span
                                key={skill}
                                className="inline-flex items-center gap-0.5 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 border border-amber-200"
                              >
                                <span>-</span>
                                {skill}
                              </span>
                            ))}
                            {candidate.missingSkills.length > 5 && (
                              <span className="text-[10px] text-ink-muted">
                                +{candidate.missingSkills.length - 5}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </QueryBoundary>
    </div>
  );
}
