import { useState, useMemo } from "react";
import { Link, useParams } from "react-router";
import {
  IconMapPin,
  IconCalendar,
  IconBriefcase,
  IconClock,
  IconCircleCheck,
  IconHeart,
  IconHeartFilled,
  IconShare,
  IconSparkles,
  IconUpload,
  IconBuilding,
  IconUsers,
  IconChevronRight,
  IconBolt,
  IconAward,
  IconCheck,
  IconExternalLink,
} from "@tabler/icons-react";
import { DEMO_JOBS } from "~/features/candidate/services/jobService";
import { formatSalary, timeAgo } from "~/utils";
import { useUIStore } from "~/stores/useUIStore";

export default function JobDetailPage() {
  const { jobId = "1" } = useParams();
  const showToast = useUIStore((s) => s.showToast);
  const [saved, setSaved] = useState(false);

  const job = useMemo(() => {
    return DEMO_JOBS.find((j) => String(j.id) === String(jobId)) ?? DEMO_JOBS[0];
  }, [jobId]);

  const similarJobs = useMemo(() => {
    return DEMO_JOBS.filter((j) => String(j.id) !== String(job.id)).slice(0, 3);
  }, [job.id]);

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      showToast("Đã sao chép liên kết việc làm vào bộ nhớ tạm!", "success");
    } else {
      showToast("Chia sẻ liên kết: " + window.location.href, "info");
    }
  };

  const handleToggleSave = () => {
    setSaved((prev) => {
      const next = !prev;
      showToast(next ? "Đã lưu việc làm vào danh sách quan tâm!" : "Đã bỏ lưu việc làm.", "info");
      return next;
    });
  };

  return (
    <div className="mx-auto w-full max-w-6xl pb-16 pt-2">
      {/* ── Breadcrumbs ───────────────────────────────────── */}
      <nav className="mb-6 flex flex-wrap items-center gap-2 text-label-sm text-ink-muted" aria-label="Breadcrumb">
        <Link to="/" className="transition-colors hover:text-navy">
          Trang chủ
        </Link>
        <IconChevronRight size={14} className="text-ink-muted" />
        <Link to="/jobs" className="transition-colors hover:text-navy">
          Việc làm
        </Link>
        {job.categories?.[0] && (
          <>
            <IconChevronRight size={14} className="text-ink-muted" />
            <Link to={`/jobs?q=${encodeURIComponent(job.categories[0])}`} className="transition-colors hover:text-navy">
              {job.categories[0]}
            </Link>
          </>
        )}
        <IconChevronRight size={14} className="text-ink-muted" />
        <span className="line-clamp-1 font-semibold text-navy">{job.title}</span>
      </nav>

      <div className="flex flex-col gap-6">
        {/* ── Job Header Banner (Midnight & Gold Premium) ─── */}
        <div className="relative overflow-hidden rounded-xl border border-border-subtle bg-surface p-6 shadow-sm sm:p-8">
          {/* Decorative gold ambient accent */}
          <div
            aria-hidden
            className="pointer-events-none absolute -right-12 -top-12 h-64 w-64 rounded-full bg-gold/5 blur-2xl"
          />

          <div className="relative z-10 flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
            {/* Left: Logo & Job Info */}
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border-subtle bg-surface-low p-2">
                {job.companyLogo ? (
                  <img src={job.companyLogo} alt={job.company} className="h-full w-full object-contain" />
                ) : (
                  <span className="text-2xl font-bold text-navy">
                    {job.company.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              <div className="flex flex-col">
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-label-sm font-semibold uppercase tracking-wider text-ink-muted">
                    {job.company}
                  </span>
                  {job.verified && (
                    <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                      <IconCheck size={12} stroke={2.5} /> Đã xác thực
                    </span>
                  )}
                </div>

                <h1 className="text-xl font-bold leading-snug text-navy sm:text-2xl lg:text-3xl">
                  {job.title}
                </h1>

                {/* Metadata Pills */}
                <div className="mt-4 flex flex-wrap items-center gap-2.5">
                  <span className="flex items-center gap-1.5 rounded-lg border border-gold/40 bg-gold/10 px-3 py-1.5 text-label-sm font-bold text-gold">
                    {formatSalary(job.salaryMin, job.salaryMax)}
                  </span>
                  <span className="flex items-center gap-1.5 rounded-lg border border-border-subtle bg-surface-low px-3 py-1.5 text-label-sm font-medium text-ink-variant">
                    <IconMapPin size={15} stroke={1.8} className="text-ink-muted" />
                    {job.location}
                  </span>
                  <span className="flex items-center gap-1.5 rounded-lg border border-border-subtle bg-surface-low px-3 py-1.5 text-label-sm font-medium text-ink-variant">
                    <IconBriefcase size={15} stroke={1.8} className="text-ink-muted" />
                    {job.experience}
                  </span>
                  <span className="flex items-center gap-1.5 rounded-lg border border-border-subtle bg-surface-low px-3 py-1.5 text-label-sm font-medium text-ink-variant">
                    <IconCalendar size={15} stroke={1.8} className="text-ink-muted" />
                    Hạn nộp: {job.deadline ?? "30/10/2026"}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-3 self-stretch sm:self-auto lg:shrink-0">
              <Link
                to={`/jobs/${job.id}/apply`}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gold px-6 py-3 font-label text-label font-bold text-white shadow-sm transition-all hover:bg-[#b08233] active:scale-[0.98] sm:flex-initial"
              >
                Ứng tuyển ngay
              </Link>
              <button
                type="button"
                onClick={handleToggleSave}
                aria-label={saved ? "Bỏ lưu việc làm" : "Lưu việc làm"}
                className={`flex h-11 w-11 items-center justify-center rounded-xl border transition-all ${
                  saved
                    ? "border-danger bg-danger/10 text-danger"
                    : "border-border-strong bg-surface text-ink-muted hover:border-navy hover:text-navy"
                }`}
              >
                {saved ? <IconHeartFilled size={20} /> : <IconHeart size={20} />}
              </button>
              <button
                type="button"
                onClick={handleShare}
                aria-label="Chia sẻ việc làm"
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-border-strong bg-surface text-ink-muted transition-all hover:border-navy hover:text-navy"
              >
                <IconShare size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* ── Two Columns Main Layout (8 cols + 4 cols) ─────── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* ── Left Column: Job Content & AI Quick Apply (8 cols) ── */}
          <div className="flex flex-col gap-6 lg:col-span-8">
            {/* Chi tiết công việc card */}
            <div className="rounded-xl border border-border-subtle bg-surface p-6 shadow-sm sm:p-8">
              <h2 className="mb-6 border-b border-border-subtle pb-3 text-xl font-bold text-navy">
                Chi tiết tin tuyển dụng
              </h2>

              {/* 1. Mô tả công việc */}
              <div className="mb-8">
                <h3 className="mb-3 flex items-center gap-2 text-label font-bold text-navy">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-navy/5 text-navy">
                    📋
                  </span>
                  Mô tả công việc
                </h3>
                {job.descriptionList && job.descriptionList.length > 0 ? (
                  <ul className="flex flex-col gap-2.5 pl-2 text-body text-ink-variant">
                    {job.descriptionList.map((desc, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-navy" />
                        <span>{desc}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="whitespace-pre-line text-body text-ink-variant">
                    {job.description ?? "Chưa có mô tả chi tiết cho vị trí này."}
                  </p>
                )}
              </div>

              {/* 2. Yêu cầu ứng viên */}
              <div className="mb-8">
                <h3 className="mb-3 flex items-center gap-2 text-label font-bold text-navy">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                    🎯
                  </span>
                  Yêu cầu ứng viên
                </h3>
                <ul className="flex flex-col gap-2.5 pl-2 text-body text-ink-variant">
                  {(job.requirements && job.requirements.length > 0
                    ? job.requirements
                    : ["Có tinh thần trách nhiệm cao trong công việc", "Kỹ năng giao tiếp và làm việc nhóm tốt"]
                  ).map((req, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <IconCircleCheck size={18} className="mt-0.5 shrink-0 text-emerald-600" />
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* 3. Quyền lợi được hưởng */}
              <div className="mb-8">
                <h3 className="mb-3 flex items-center gap-2 text-label font-bold text-navy">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gold/10 text-gold">
                    🎁
                  </span>
                  Quyền lợi được hưởng
                </h3>
                <ul className="flex flex-col gap-2.5 pl-2 text-body text-ink-variant">
                  {(job.benefits && job.benefits.length > 0
                    ? job.benefits
                    : [
                        "Mức lương cạnh tranh theo năng lực",
                        "Đầy đủ chế độ BHXH, BHYT theo luật định",
                        "Thưởng lễ tết, tháng lương 13",
                      ]
                  ).map((benefit, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <IconCircleCheck size={18} className="mt-0.5 shrink-0 text-gold" />
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* 4. Địa điểm làm việc */}
              <div>
                <h3 className="mb-3 flex items-center gap-2 text-label font-bold text-navy">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-navy/5 text-navy">
                    📍
                  </span>
                  Địa điểm làm việc
                </h3>
                <p className="text-body font-medium text-ink-variant">
                  {job.workAddress ?? `${job.location} (Chi tiết sẽ trao đổi khi phỏng vấn)`}
                </p>
                <div className="mt-4 flex h-36 w-full items-center justify-center rounded-xl border border-border-subtle bg-surface-low p-4 text-center">
                  <div className="flex flex-col items-center gap-1.5 text-ink-muted">
                    <IconMapPin size={28} className="text-gold" />
                    <span className="text-label-sm font-semibold text-navy">{job.company}</span>
                    <span className="text-[12px]">{job.workAddress ?? job.location}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── AI ATS Quick Application Card ─────────────────── */}
            <div className="relative overflow-hidden rounded-xl border-2 border-dashed border-border-strong bg-surface p-8 text-center shadow-sm transition-all hover:border-gold">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-gold/5 opacity-0 transition-opacity hover:opacity-100"
              />
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gold/10 text-gold">
                <IconSparkles size={28} />
              </div>
              <h3 className="text-xl font-bold text-navy">Ứng tuyển nhanh qua FutureAI ATS</h3>
              <p className="mx-auto mb-6 mt-1 max-w-lg text-label text-ink-muted">
                Sử dụng CV có sẵn trên FutureCV hoặc tải lên tệp PDF để AI tự động phân tích độ tương thích với vị trí này.
              </p>
              <div className="flex flex-col justify-center gap-3 sm:flex-row">
                <Link
                  to={`/jobs/${job.id}/apply`}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-navy px-6 py-2.5 font-label text-label font-bold text-white shadow-sm transition-all hover:bg-navy-secondary active:scale-[0.98]"
                >
                  <IconBriefcase size={18} />
                  Dùng Profile FutureCV
                </Link>
                <Link
                  to={`/jobs/${job.id}/apply`}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-border-strong bg-surface px-6 py-2.5 font-label text-label font-bold text-navy transition-all hover:border-navy hover:bg-surface-low active:scale-[0.98]"
                >
                  <IconUpload size={18} />
                  Tải lên CV (PDF)
                </Link>
              </div>
              <div className="mt-4 flex items-center justify-center gap-1.5 text-label-sm font-semibold text-gold">
                <IconBolt size={16} />
                <span>Hệ thống phân tích tương thích CV thời gian thực</span>
              </div>
            </div>
          </div>

          {/* ── Right Column: Sidebar Information (4 cols) ────── */}
          <div className="flex flex-col gap-6 lg:col-span-4">
            {/* 1. Thông tin doanh nghiệp */}
            <div className="rounded-xl border border-border-subtle bg-surface p-6 shadow-sm">
              <h3 className="mb-4 border-b border-border-subtle pb-2.5 text-label font-bold text-navy">
                Thông tin doanh nghiệp
              </h3>
              <div className="mb-4 flex items-center gap-3.5">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border-subtle bg-surface-low p-1">
                  {job.companyLogo ? (
                    <img src={job.companyLogo} alt={job.company} className="h-full w-full object-contain" />
                  ) : (
                    <span className="text-xl font-bold text-navy">
                      {job.company.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-navy">{job.company}</h4>
                  {job.companyWebsite ? (
                    <a
                      href={`https://${job.companyWebsite}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-label-sm text-gold hover:underline"
                    >
                      {job.companyWebsite} <IconExternalLink size={12} />
                    </a>
                  ) : (
                    <span className="text-label-sm text-ink-muted">Doanh nghiệp đã xác thực</span>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-3 text-label-sm text-ink-variant">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-ink-muted">
                    <IconUsers size={16} /> Quy mô:
                  </span>
                  <span className="font-semibold text-navy">{job.companySize ?? "100 - 500 nhân viên"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-ink-muted">
                    <IconBuilding size={16} /> Lĩnh vực:
                  </span>
                  <span className="font-semibold text-navy">{job.companyIndustry ?? job.categories?.[0] ?? "Doanh nghiệp"}</span>
                </div>
              </div>
            </div>

            {/* 2. Tổng quan tin tuyển dụng */}
            <div className="rounded-xl border border-border-subtle bg-surface p-6 shadow-sm">
              <h3 className="mb-4 border-b border-border-subtle pb-2.5 text-label font-bold text-navy">
                Tổng quan tin tuyển dụng
              </h3>
              <div className="flex flex-col gap-4 text-label-sm">
                <div className="flex items-start gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-low text-ink-muted">
                    <IconAward size={16} />
                  </span>
                  <div>
                    <span className="text-ink-muted">Cấp bậc:</span>
                    <div className="font-semibold text-navy">{job.level ?? "Nhân viên / Chuyên viên"}</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-low text-ink-muted">
                    <IconBriefcase size={16} />
                  </span>
                  <div>
                    <span className="text-ink-muted">Hình thức làm việc:</span>
                    <div className="font-semibold text-navy">{job.jobType}</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-low text-ink-muted">
                    <IconUsers size={16} />
                  </span>
                  <div>
                    <span className="text-ink-muted">Số lượng tuyển:</span>
                    <div className="font-semibold text-navy">{job.quantity ?? "02 người"}</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-low text-ink-muted">
                    <IconClock size={16} />
                  </span>
                  <div>
                    <span className="text-ink-muted">Kinh nghiệm:</span>
                    <div className="font-semibold text-navy">{job.experience}</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-low text-ink-muted">
                    <IconCalendar size={16} />
                  </span>
                  <div>
                    <span className="text-ink-muted">Ngày đăng:</span>
                    <div className="font-semibold text-navy">{timeAgo(job.postedAt)}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Việc làm tương tự (AI Matching) */}
            {similarJobs.length > 0 && (
              <div className="rounded-xl border border-border-subtle bg-surface p-6 shadow-sm">
                <h3 className="mb-4 flex items-center gap-2 border-b border-border-subtle pb-2.5 text-label font-bold text-navy">
                  <IconSparkles size={18} className="text-gold" />
                  Việc làm tương tự
                </h3>
                <div className="flex flex-col gap-3">
                  {similarJobs.map((simJob, idx) => (
                    <Link
                      key={simJob.id}
                      to={`/jobs/${simJob.id}`}
                      className="group block rounded-lg border border-border-subtle bg-surface p-3 transition-all hover:border-gold hover:shadow-sm"
                    >
                      <div className="mb-1.5 flex items-start justify-between gap-2">
                        <h4 className="line-clamp-1 text-label font-bold text-navy group-hover:text-gold">
                          {simJob.title}
                        </h4>
                        <span className="shrink-0 rounded bg-gold/15 px-1.5 py-0.5 text-[10px] font-bold text-gold">
                          {simJob.matchRate ?? 85 + idx * 4}% Match
                        </span>
                      </div>
                      <p className="line-clamp-1 text-label-sm text-ink-muted">{simJob.company}</p>
                      <div className="mt-2 flex items-center justify-between text-label-sm font-semibold">
                        <span className="text-gold">{formatSalary(simJob.salaryMin, simJob.salaryMax)}</span>
                        <span className="text-ink-muted">{simJob.location}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
