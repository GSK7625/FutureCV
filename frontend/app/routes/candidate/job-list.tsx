import { useMemo } from "react";
import { Link, useSearchParams } from "react-router";
import {
  IconSearch,
  IconMapPin,
  IconHeart,
  IconFilterOff,
  IconFileText,
  IconChevronRight,
} from "@tabler/icons-react";
import { useJobList } from "~/features/candidate/hooks/useJobList";
import { useCandidateFilterStore } from "~/features/candidate/stores/useCandidateFilterStore";
import { useDebounce } from "~/hooks/useDebounce";
import { QueryBoundary, SkeletonCard } from "~/components/shared";
import { EmptyState } from "~/components/ui/EmptyState";
import { Button } from "~/components/ui/Button";
import { Badge } from "~/components/ui/Badge";
import { formatSalary, timeAgo, formatNumber } from "~/utils";

const categoryOptions = [
  "IT / Phần mềm",
  "Kinh doanh / Bán hàng",
  "Marketing / PR",
  "Tài chính / Kế toán",
  "Nhân sự (HR)",
  "Thiết kế / Nghệ thuật",
];

const locationOptions = ["Hà Nội", "TP. HCM", "Đà Nẵng", "Từ xa"];

export default function JobListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlKeyword = searchParams.get("q") ?? "";
  const urlLocation = searchParams.get("location") ?? "";

  const {
    keyword: storeKeyword,
    categories,
    locations,
    jobTypes,
    toggleCategory,
    toggleLocation,
    toggleJobType,
    clearAll,
  } = useCandidateFilterStore();

  const keyword = useMemo(() => storeKeyword || urlKeyword, [storeKeyword, urlKeyword]);
  const effectiveLocations = useMemo(() => {
    const set = new Set(locations);
    if (urlLocation) set.add(urlLocation);
    return [...set];
  }, [locations, urlLocation]);

  const debouncedKeyword = useDebounce(keyword, 400);

  const filters = {
    keyword: debouncedKeyword,
    category: categories,
    location: effectiveLocations,
    jobType: jobTypes,
    page: 1,
    pageSize: 5,
  };
  const query = useJobList(filters);

  const onSearchChange = (value: string) => {
    useCandidateFilterStore.getState().setKeyword(value);
    const next = new URLSearchParams(searchParams);
    if (value.trim()) next.set("q", value.trim());
    else next.delete("q");
    setSearchParams(next, { replace: true });
  };

  const hasFilters =
    Boolean(debouncedKeyword) || categories.length > 0 || effectiveLocations.length > 0 || jobTypes.length > 0;

  return (
    <div>
      {/* Header + search */}
      <div className="border-b border-border-subtle bg-surface px-4 py-6 shadow-sm md:px-6">
        <nav className="mb-3 flex items-center gap-2 text-label text-ink-variant" aria-label="Breadcrumb">
          <Link to="/" className="hover:text-navy">Trang chủ</Link>
          <IconChevronRight size={14} stroke={2} aria-hidden />
          <span className="font-semibold text-navy">Việc làm</span>
        </nav>
        <h1 className="text-headline-md text-ink">
          Tuyển dụng{" "}
          <span className="font-bold text-navy">
            {query.data ? `${formatNumber(query.data.total)} việc làm` : "việc làm"}
          </span>
          {debouncedKeyword && (
            <span className="font-bold text-navy"> {debouncedKeyword}</span>
          )}
        </h1>

        <div className="mt-4 flex gap-2 rounded-default bg-navy p-2">
          <div className="flex flex-1 items-center overflow-hidden rounded-default bg-white">
            <IconSearch size={20} stroke={1.6} className="ml-3 shrink-0 text-ink-muted" />
            <input
              value={keyword}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Tìm theo vị trí, công ty, kỹ năng..."
              aria-label="Từ khóa tìm kiếm"
              className="h-11 w-full bg-transparent px-3 text-body text-ink outline-none placeholder:text-ink-muted/70"
            />
          </div>
          <Button variant="accent" className="px-8">
            Tìm kiếm
          </Button>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-6 lg:flex-row">
        {/* Sidebar filters */}
        <aside className="h-fit shrink-0 rounded-default border border-border-subtle bg-surface-low p-6 lg:sticky lg:top-24 lg:w-72">
          <h2 className="mb-4 font-semibold text-navy">Bộ lọc</h2>

          <div className="mb-6">
            <h3 className="mb-3 text-label font-bold text-navy">Danh mục nghề</h3>
            <div className="flex flex-col gap-2">
              {categoryOptions.map((cat) => (
                <label key={cat} className="group flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={categories.includes(cat)}
                    onChange={() => toggleCategory(cat)}
                    className="rounded-tag border-border-strong accent-[#0B132B]"
                  />
                  <span className="text-label text-ink-variant group-hover:text-navy">{cat}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="mb-6 border-t border-border-strong pt-5">
            <h3 className="mb-3 text-label font-bold text-navy">Địa điểm</h3>
            <div className="flex flex-col gap-2">
              {locationOptions.map((loc) => (
                <label key={loc} className="group flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={effectiveLocations.includes(loc)}
                    onChange={() => toggleLocation(loc)}
                    className="rounded-tag border-border-strong accent-[#0B132B]"
                  />
                  <span className="text-label text-ink-variant group-hover:text-navy">{loc}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="border-t border-border-strong pt-5">
            <h3 className="mb-3 text-label font-bold text-navy">Hình thức làm việc</h3>
            <div className="grid grid-cols-2 gap-2">
              {["Toàn thời gian", "Bán thời gian", "Thực tập", "Từ xa"].map((type) => (
                <label key={type} className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={jobTypes.includes(type)}
                    onChange={() => toggleJobType(type)}
                    className="rounded-tag border-border-strong accent-[#0B132B]"
                  />
                  <span className="text-label text-ink-variant">{type}</span>
                </label>
              ))}
            </div>
          </div>

          {hasFilters && (
            <div className="mt-6 border-t border-border-strong pt-5">
              <Button variant="ghost" size="sm" onClick={clearAll}>
                <IconFilterOff size={16} stroke={1.6} /> Xóa tất cả bộ lọc
              </Button>
            </div>
          )}
        </aside>

        {/* Job rows: layout family khác với card grid ở trang chủ */}
        <section className="flex flex-1 flex-col gap-4" aria-label="Danh sách việc làm">
          <QueryBoundary
            isLoading={query.isLoading}
            error={query.error}
            onRetry={query.refetch}
            skeleton={
              <>
                <SkeletonCard lines={2} />
                <SkeletonCard lines={2} />
                <SkeletonCard lines={2} />
              </>
            }
          >
            {query.data && query.data.items.length > 0 ? (
              <>
                {query.data.items.map((job) => (
                  <article
                    key={job.id}
                    className="group rounded-default border border-border-subtle bg-surface p-6 shadow-surface transition-colors hover:border-navy"
                  >
                    <div className="flex gap-4">
                      <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-default border border-border-subtle bg-surface-low">
                        {job.companyLogo ? (
                          <img src={job.companyLogo} alt={job.company} className="h-full w-full object-contain p-2" />
                        ) : (
                          <span className="text-headline-md font-bold text-navy">
                            {job.company.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-4">
                          <h3 className="line-clamp-2 font-semibold leading-snug text-navy">
                            <Link
                              to={`/candidate/jobs/${job.id}`}
                              className="transition-colors group-hover:text-gold"
                            >
                              {job.title}
                            </Link>
                          </h3>
                          <Badge variant="gold" className="shrink-0 font-bold">
                            {formatSalary(job.salaryMin, job.salaryMax)}
                          </Badge>
                        </div>
                        <p className="mt-1 text-label uppercase tracking-wide text-ink-variant">
                          {job.company}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Badge variant="neutral">
                            <IconMapPin size={12} stroke={1.8} /> {job.location}
                          </Badge>
                          <Badge variant="neutral">{job.experience}</Badge>
                          {job.hot && <Badge variant="gold" className="font-bold">HOT</Badge>}
                        </div>
                        <div className="mt-4 flex items-center justify-between border-t border-border-subtle pt-4">
                          <p className="line-clamp-1 text-label-sm text-ink-variant">
                            {job.jobType} | {job.categories.join(", ")}
                          </p>
                          <div className="flex shrink-0 items-center gap-4">
                            <span className="text-label-sm text-ink-muted">{timeAgo(job.postedAt)}</span>
                            <button
                              type="button"
                              aria-label="Lưu việc làm"
                              className="text-ink-muted transition-colors hover:text-navy"
                            >
                              <IconHeart size={20} stroke={1.6} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}

                {query.data.total > query.data.items.length && (
                  <div className="flex justify-center pt-2">
                    <Button variant="secondary">Xem thêm việc làm</Button>
                  </div>
                )}
              </>
            ) : (
              <EmptyState
                icon={<IconFileText size={48} stroke={1.2} />}
                title="Không tìm thấy việc làm phù hợp"
                description="Thử điều chỉnh từ khóa hoặc xóa bớt bộ lọc để xem thêm kết quả."
                action={hasFilters ? <Button variant="primary" onClick={clearAll}>Xóa bộ lọc</Button> : undefined}
              />
            )}
          </QueryBoundary>
        </section>
      </div>
    </div>
  );
}
