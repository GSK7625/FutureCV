import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { motion, useReducedMotion } from "motion/react";
import {
  IconSearch,
  IconMapPin,
  IconArrowRight,
  IconBriefcase,
  IconDeviceDesktop,
  IconCode,
  IconCalculator,
  IconTool,
  IconSpeakerphone,
  IconUsers,
  IconHeartbeat,
  IconPalette,
  IconPhone,
  IconMail,
  IconSparkles,
  IconChevronLeft,
  IconChevronRight,
  IconX,
} from "@tabler/icons-react";
import { Badge } from "~/components/ui/Badge";
import { Button } from "~/components/ui/Button";
import { JobCard } from "~/components/shared/JobCard";
import { useJobList } from "~/features/candidate/hooks/useJobList";
import { formatNumber } from "~/utils";

const industries = [
  { icon: IconCode, label: "IT / Phần mềm", count: 1245 },
  { icon: IconSpeakerphone, label: "Marketing / PR", count: 856 },
  { icon: IconCalculator, label: "Tài chính / Kế toán", count: 642 },
  { icon: IconBriefcase, label: "Kinh doanh / Bán hàng", count: 1890 },
  { icon: IconUsers, label: "Nhân sự (HR)", count: 420 },
  { icon: IconTool, label: "Kỹ thuật", count: 512 },
  { icon: IconHeartbeat, label: "Y tế / Sức khỏe", count: 325 },
  { icon: IconPalette, label: "Thiết kế / Nghệ thuật", count: 280 },
];

const popularCategories = [
  { icon: IconBriefcase, label: "Kinh doanh / Bán hàng" },
  { icon: IconSpeakerphone, label: "Marketing / PR" },
  { icon: IconCode, label: "IT Phần mềm" },
  { icon: IconCalculator, label: "Kế toán / Kiểm toán" },
  { icon: IconTool, label: "Kỹ thuật" },
  { icon: IconUsers, label: "Nhân sự (HR)" },
];

const locationChips = ["Hà Nội", "TP. HCM", "Đà Nẵng", "Từ xa"];

const featuredCompanies = [
  { name: "Techcom Solutions VN", industry: "Công nghệ thông tin / Phần mềm", jobs: 15 },
  { name: "Global Commerce", industry: "Thương mại điện tử / Bán lẻ", jobs: 8 },
  { name: "Vietnam Healthcare", industry: "Y tế / Chăm sóc sức khỏe", jobs: 24 },
  { name: "EduTech VN", industry: "Giáo dục / Đào tạo", jobs: 12 },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

export default function HomePage() {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("");
  const [activeTab, setActiveTab] = useState(0);
  const [activeChip, setActiveChip] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [showHint, setShowHint] = useState(true);
  const hotlineRef = useRef<HTMLDivElement>(null);

  const { data: featuredJobs } = useJobList({
    keyword: activeTab === 1 ? "phổ thông" : undefined,
    location: activeChip ? [activeChip] : undefined,
    page,
    pageSize: 8,
  });

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (keyword.trim()) params.set("q", keyword.trim());
    if (location) params.set("location", location);
    navigate(`/jobs${params.size ? `?${params}` : ""}`);
  };

  const motionProps = (i: number) =>
    reduceMotion
      ? {}
      : {
        variants: fadeUp,
        custom: i,
        initial: "hidden" as const,
        whileInView: "visible" as const,
        viewport: { once: true, margin: "-64px" },
      };

  return (
    <div>
      {/* ── Hero: navy, search-centric ─────────────────────── */}
      <section className="w-full bg-navy px-margin-mobile pb-14 pt-16 text-white md:px-margin-desktop">
        <div className="container-page mx-auto flex flex-col items-center">
          <motion.h1
            {...(reduceMotion ? {} : { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const } })}
            className="max-w-4xl text-center text-display leading-tight md:text-display"
          >
            Tạo CV, Tìm việc làm, Tuyển dụng hiệu quả
          </motion.h1>
          <p className="mt-4 text-body-lg text-white/70">
            Hàng nghìn cơ hội việc làm từ các doanh nghiệp uy tín trên toàn quốc.
          </p>

          {/* Search bar */}
          <div className="mt-10 flex w-full max-w-4xl flex-col gap-3 rounded-xl bg-white p-3 shadow-overlay md:flex-row">
            <div className="flex flex-grow items-center rounded-default border border-border-strong bg-surface-low px-4 transition-all focus-within:border-gold focus-within:bg-white focus-within:ring-2 focus-within:ring-gold/20">
              <IconSearch size={20} stroke={1.6} className="mr-3 text-ink-muted" />
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Tìm kiếm việc làm, công ty..."
                className="w-full border-none bg-transparent py-3 text-body text-ink outline-none ring-0 placeholder:text-ink-muted/70 focus:outline-none focus:ring-0"
                aria-label="Từ khóa tìm kiếm"
              />
            </div>
            <div className="flex items-center rounded-default border border-border-strong bg-surface-low px-4 transition-all focus-within:border-gold focus-within:bg-white focus-within:ring-2 focus-within:ring-gold/20 md:w-52">
              <IconMapPin size={20} stroke={1.6} className="mr-3 text-ink-muted" />
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full border-none bg-transparent py-3 text-body text-ink outline-none ring-0 focus:outline-none focus:ring-0"
                aria-label="Địa điểm"
              >
                <option value="">Tất cả địa điểm</option>
                <option value="Hà Nội">Hà Nội</option>
                <option value="TP. HCM">TP. HCM</option>
                <option value="Đà Nẵng">Đà Nẵng</option>
                <option value="Từ xa">Từ xa</option>
              </select>
            </div>
            <Button variant="accent" size="lg" className="md:px-8" onClick={handleSearch}>
              Tìm kiếm
            </Button>
          </div>

          {/* Categories + Banner 1 */}
          <div className="mt-10 grid w-full max-w-4xl grid-cols-1 gap-6 md:grid-cols-3">
            <div className="flex flex-col justify-between rounded-xl border border-white/20 bg-white/10 p-6 backdrop-blur-md">
              <h3 className="mb-4 font-semibold text-white">Ngành nghề phổ biến</h3>
              <ul className="flex flex-col gap-3">
                {popularCategories.map((cat) => (
                  <li key={cat.label}>
                    <Link
                      to={`/candidate?q=${encodeURIComponent(cat.label)}`}
                      className="flex items-center gap-3 text-white/90 transition-all hover:translate-x-1 hover:text-white"
                    >
                      <cat.icon size={18} stroke={1.6} />
                      {cat.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <Link
              to="/candidate"
              className="relative flex max-h-[290px] w-full items-center justify-center overflow-hidden rounded-xl bg-surface shadow-overlay md:col-span-2"
            >
              <img
                src="/banner1.png"
                alt="Cơ hội việc làm phổ thông - Thu nhập hấp dẫn"
                className="h-full w-full object-cover"
              />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Việc làm hấp dẫn (Thiết kế compact + Banner 2) ─── */}
      <section className="w-full bg-surface py-14">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          {/* Header row */}
          <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-headline-md font-bold text-navy">
                Việc làm hấp dẫn
              </h2>
              <span className="flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-label-sm font-semibold text-gold">
                <IconSparkles size={14} /> Đề xuất bởi FutureAI
              </span>
            </div>

            <div className="flex items-center gap-4">
              <Link
                to="/jobs"
                className="text-label font-semibold text-navy transition-colors hover:text-gold"
              >
                Xem tất cả
              </Link>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  aria-label="Trang trước"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-border-strong bg-surface text-ink-variant transition-colors hover:border-navy hover:text-navy disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <IconChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  aria-label="Trang sau"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= Math.ceil((featuredJobs?.total ?? 8) / 8)}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-border-strong bg-surface text-ink-variant transition-colors hover:border-navy hover:text-navy disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <IconChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Filter row */}
          <div className="mb-4 flex items-center gap-2 overflow-x-auto pb-1">
            <div className="flex shrink-0 items-center gap-1 rounded-full border border-border-strong bg-surface px-3 py-1.5 text-label-sm text-ink-variant">
              <span className="text-ink-muted">Lọc theo:</span>
              <span className="font-semibold text-ink">Địa điểm</span>
            </div>
            {["Tất cả", "Hà Nội", "TP. HCM", "Đà Nẵng", "Từ xa"].map((chip) => {
              const isSelected = activeChip === chip || (chip === "Tất cả" && !activeChip);
              return (
                <button
                  key={chip}
                  type="button"
                  onClick={() => {
                    setActiveChip(chip === "Tất cả" ? null : chip);
                    setPage(1);
                  }}
                  className={`whitespace-nowrap rounded-full border px-4 py-1.5 text-label-sm transition-all ${
                    isSelected
                      ? "border-navy bg-navy font-semibold text-white shadow-sm"
                      : "border-border-subtle bg-surface text-ink-variant hover:border-border-strong hover:bg-surface-low"
                  }`}
                >
                  {chip}
                </button>
              );
            })}
          </div>

          {/* Hint bar */}
          {showHint && (
            <div className="mb-6 flex items-center justify-between rounded-lg border border-blue-100 bg-blue-50/70 px-4 py-2.5 text-label-sm text-navy">
              <div className="flex items-center gap-2">
                <span className="text-base">💡</span>
                <span>Gợi ý: Di chuột vào tiêu đề việc làm để xem thêm thông tin chi tiết</span>
              </div>
              <button
                type="button"
                onClick={() => setShowHint(false)}
                className="p-1 text-ink-muted transition-colors hover:text-navy"
                aria-label="Đóng gợi ý"
              >
                <IconX size={14} />
              </button>
            </div>
          )}

          {/* Main Content: Centered Flex Layout with Compact Banner */}
          <div className="flex flex-col items-start gap-5 lg:flex-row">
            {/* Job Cards (2 columns, flex-1) */}
            <div className="flex w-full flex-1 flex-col justify-between">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {(featuredJobs?.items ?? []).map((job, i) => (
                  <motion.div key={job.id} {...motionProps(i)}>
                    <JobCard job={job} />
                  </motion.div>
                ))}
              </div>

              {/* Pagination */}
              <div className="mt-8 flex items-center justify-center gap-3">
                <button
                  type="button"
                  aria-label="Trang trước"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-border-strong bg-surface text-ink-variant transition-colors hover:border-navy hover:text-navy disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <IconChevronLeft size={16} />
                </button>
                <span className="text-label-sm font-medium text-ink-muted">
                  {page} / {Math.max(1, Math.ceil((featuredJobs?.total ?? 8) / 8))} trang
                </span>
                <button
                  type="button"
                  aria-label="Trang sau"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= Math.max(1, Math.ceil((featuredJobs?.total ?? 8) / 8))}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-border-strong bg-surface text-ink-variant transition-colors hover:border-navy hover:text-navy disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <IconChevronRight size={16} />
                </button>
              </div>
            </div>

            {/* Shrunk Vertical Banner */}
            <div className="w-full shrink-0 self-start lg:w-[250px]">
              <Link
                to="/candidate"
                className="group relative block overflow-hidden rounded-xl bg-surface shadow-sm transition-all duration-300 hover:shadow-md"
              >
                <img
                  src="/banner2.png"
                  alt="2000+ Việc làm phổ thông thu nhập hấp dẫn"
                  className="h-auto w-full object-contain rounded-xl"
                />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Công ty nổi bật ────────────────────────────────── */}
      <section className="w-full bg-background py-14">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <motion.div {...motionProps(0)}>
            <h2 className="mb-8 text-center text-headline text-navy">Công ty nổi bật</h2>
          </motion.div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featuredCompanies.map((company, i) => (
              <motion.article
                key={company.name}
                {...motionProps(i + 1)}
                className="group flex h-[210px] flex-col justify-between rounded-xl border border-border-subtle bg-surface p-4 text-center shadow-sm transition-all hover:border-gold/60 hover:shadow-md"
              >
                <div className="flex flex-col items-center">
                  <div className="mb-2.5 flex h-14 w-14 items-center justify-center rounded-xl border border-border-subtle bg-surface-low">
                    <IconDeviceDesktop size={26} stroke={1.4} className="text-ink-muted" />
                  </div>
                  <h3 className="mb-1 line-clamp-1 text-label font-bold text-navy">{company.name}</h3>
                  <p className="line-clamp-1 text-label-sm text-ink-muted">{company.industry}</p>
                </div>
                <Link
                  to={`/candidate?q=${encodeURIComponent(company.name)}`}
                  className="w-full rounded-lg bg-navy-secondary/10 px-3 py-2 text-label-sm font-semibold text-navy transition-colors hover:bg-navy-secondary/20"
                >
                  {company.jobs} Việc làm đang tuyển
                </Link>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Top ngành nghề nổi bật ──────────────────────────── */}
      <section className="w-full bg-surface py-14">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <motion.div {...motionProps(0)}>
            <h2 className="mb-8 text-center text-headline text-navy">Top ngành nghề nổi bật</h2>
          </motion.div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-4">
            {industries.map((ind, i) => (
              <motion.div key={ind.label} {...motionProps(i + 1)}>
                <Link
                  to={`/candidate?q=${encodeURIComponent(ind.label)}`}
                  className="group flex h-[116px] flex-col items-center justify-center rounded-xl border border-border-subtle bg-surface p-3 text-center shadow-sm transition-all hover:border-gold/60 hover:shadow-md"
                >
                  <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-navy-secondary/5 transition-colors group-hover:bg-gold/10">
                    <ind.icon
                      size={22}
                      stroke={1.6}
                      className="text-navy transition-colors group-hover:text-gold"
                    />
                  </div>
                  <h3 className="line-clamp-1 text-label font-bold text-navy">{ind.label}</h3>
                  <p className="mt-0.5 text-[11px] text-ink-muted">
                    {formatNumber(ind.count)} việc làm
                  </p>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Hotline ────────────────────────────────────────── */}
      <section
        ref={hotlineRef}
        className="relative w-full overflow-hidden bg-gradient-to-r from-navy to-slate-800 py-16 text-white"
      >
        <div
          aria-hidden
          className="absolute inset-0 opacity-10"
          style={{
            background:
              "radial-gradient(circle at center, white, transparent 70%)",
          }}
        />
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 relative z-10">
          <h2 className="mb-8 text-headline font-bold">Hotline Tư Vấn</h2>
          <div className="flex flex-col overflow-hidden rounded-xl bg-surface md:flex-row">
            <div className="w-full bg-white p-8 md:w-3/5 md:p-12">
              <h3 className="mb-8 text-3xl font-bold text-navy">
                Tìm việc khó đã có <span className="text-gold">FutureCV</span>
              </h3>
              <div className="mb-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                <div className="flex items-center rounded-full bg-navy p-1 pr-6">
                  <span className="px-4 font-semibold text-white">1900 068 889 | Nhánh 2</span>
                  <a
                    href="tel:1900068889"
                    className="ml-2 flex items-center gap-2 rounded-full bg-white px-6 py-2 font-bold text-navy transition-colors hover:bg-surface-low"
                  >
                    <IconPhone size={16} stroke={2} /> GỌI NGAY
                  </a>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-body text-ink-variant">
                <span>Email hỗ trợ Ứng viên:</span>
                <a
                  href="mailto:hotro@futurecv.vn"
                  className="flex items-center gap-1 font-bold text-navy underline decoration-gold hover:text-gold"
                >
                  <IconMail size={16} stroke={1.8} /> hotro@futurecv.vn
                </a>
              </div>
            </div>
            <div className="relative flex min-h-[240px] w-full items-end justify-center bg-[#f0f4f8] md:w-2/5">
              <div className="absolute right-10 top-1/4 z-30 flex items-center gap-2 rounded-full bg-navy px-4 py-2 text-label-sm shadow-lg">
                <span className="h-2 w-2 rounded-full bg-emerald-400" aria-hidden />
                Xin chào
              </div>
              <div className="absolute bottom-1/4 left-10 z-30 flex items-center gap-2 rounded-full bg-gold px-4 py-2 text-label-sm shadow-lg">
                FutureCV có thể giúp bạn điều gì?
              </div>
              <IconSparkles
                size={96}
                stroke={1}
                className="absolute bottom-6 text-navy/10"
                aria-hidden
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
