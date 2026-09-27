/**
 * @file JobListView.tsx
 * @description Giao diện chính danh sách việc làm ứng viên (Search, Filters, Job cards, Pagination).
 * @architecture Feature UI container kết nối URL params với Custom Hooks và dumb components.
 */

import { useState, useMemo } from "react";
import { useSearchParams } from "react-router";
import {
  IconFilter,
  IconFileText,
  IconSortDescending,
} from "@tabler/icons-react";
import { useJobList } from "../../hooks/useJobList";
import { QueryBoundary, SkeletonCard } from "~/components/shared";
import { EmptyState } from "~/components/ui/EmptyState";
import { Button } from "~/components/ui/Button";
import { JobListFilters } from "./JobListFilters";
import { JobListItemRow } from "./JobListItemRow";
import { JobListPagination } from "./JobListPagination";
import { MobileFilterSheet } from "./MobileFilterSheet";
import { JobSearchBar } from "./JobSearchBar";
import { useJobMasterData } from "../../hooks/useJobMasterData";

export function JobListView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const { data: masterData, isLoading: loadingMasterData } = useJobMasterData();

  // Đọc filters từ URL search params (Single Source of Truth)
  const urlKeyword = searchParams.get("q") ?? "";
  const rawCategoryId = searchParams.get("categoryId") || undefined;
  const urlCategoryText = searchParams.get("category") || undefined;
  const rawLocationId = searchParams.get("locationId") || undefined;
  const urlLocationText = searchParams.get("location") || undefined;
  const employmentTypeId = searchParams.get("employmentTypeId") || undefined;
  const salaryMinStr = searchParams.get("salaryMin");
  const salaryMaxStr = searchParams.get("salaryMax");
  const sortBy = searchParams.get("sortBy") ?? "newest";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);

  // Resolve một master-data option từ id trực tiếp HOẶC text (label từ link trang chủ)
  const resolveOptionId = (
    opts: { id: string; name: string }[] | undefined,
    directId: string | undefined,
    text: string | undefined,
  ) => {
    if (directId) return directId;
    if (!text || !opts) return undefined;
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");
    const nt = norm(text);
    return opts.find((o) => {
      const on = norm(o.name);
      return on === nt || on.includes(nt) || nt.includes(on);
    })?.id;
  };

  const categoryId = useMemo(
    () => resolveOptionId(masterData?.categories, rawCategoryId, urlCategoryText),
    [rawCategoryId, urlCategoryText, masterData],
  );

  const locationId = useMemo(
    () => resolveOptionId(masterData?.locations, rawLocationId, urlLocationText),
    [rawLocationId, urlLocationText, masterData],
  );

  const salaryMin = salaryMinStr ? parseInt(salaryMinStr, 10) : undefined;
  const salaryMax = salaryMaxStr ? parseInt(salaryMaxStr, 10) : undefined;

  // Chuẩn bị filter object gửi tới useJobList hook
  const filters = useMemo(
    () => ({
      keyword: urlKeyword || undefined,
      categoryId,
      locationId,
      employmentTypeId,
      salaryMin,
      salaryMax,
      sortBy,
      page,
      pageSize: 10,
    }),
    [urlKeyword, categoryId, locationId, employmentTypeId, salaryMin, salaryMax, sortBy, page],
  );

  const query = useJobList(filters);

  // Đếm số lượng bộ lọc đang active (ngoại trừ q và page)
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (categoryId) count++;
    if (locationId) count++;
    if (employmentTypeId) count++;
    if (salaryMin != null || salaryMax != null) count++;
    return count;
  }, [categoryId, locationId, employmentTypeId, salaryMin, salaryMax]);

  const hasActiveFilters = activeFilterCount > 0 || Boolean(urlKeyword);

  // Hàm cập nhật filter lên URL
  const handleFilterChange = (updates: {
    categoryId?: string;
    locationId?: string;
    employmentTypeId?: string;
    salaryMin?: number;
    salaryMax?: number;
  }) => {
    const next = new URLSearchParams(searchParams);

    if ("categoryId" in updates) {
      if (updates.categoryId) next.set("categoryId", updates.categoryId);
      else next.delete("categoryId");
    }
    if ("locationId" in updates) {
      if (updates.locationId) next.set("locationId", updates.locationId);
      else next.delete("locationId");
    }
    if ("employmentTypeId" in updates) {
      if (updates.employmentTypeId) next.set("employmentTypeId", updates.employmentTypeId);
      else next.delete("employmentTypeId");
    }
    if ("salaryMin" in updates) {
      if (updates.salaryMin != null) next.set("salaryMin", String(updates.salaryMin));
      else next.delete("salaryMin");
    }
    if ("salaryMax" in updates) {
      if (updates.salaryMax != null) next.set("salaryMax", String(updates.salaryMax));
      else next.delete("salaryMax");
    }

    next.delete("page"); // Reset về trang 1
    setSearchParams(next);
  };

  const handleClearAll = () => {
    const next = new URLSearchParams();
    if (sortBy !== "newest") next.set("sortBy", sortBy);
    setSearchParams(next);
  };

  const handleSortChange = (newSort: string) => {
    const next = new URLSearchParams(searchParams);
    if (newSort === "newest") next.delete("sortBy");
    else next.set("sortBy", newSort);
    next.delete("page");
    setSearchParams(next);
  };

  const handlePageChange = (newPage: number) => {
    const next = new URLSearchParams(searchParams);
    if (newPage <= 1) next.delete("page");
    else next.set("page", String(newPage));
    setSearchParams(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="container-page mx-auto">
      {/* Search Header Banner */}
      <div className="rounded-2xl bg-navy p-6 text-white shadow-xl md:p-8">
        <h1 className="text-display-sm font-bold md:text-headline-lg">
          Khám phá cơ hội nghề nghiệp
        </h1>
        <p className="mt-2 text-body text-white/75">
          Tìm kiếm công việc lý tưởng theo chuyên môn, mức lương và địa điểm của bạn.
        </p>

        <JobSearchBar
          keyword={urlKeyword}
          locationId={rawLocationId || locationId || ""}
          locations={masterData?.locations ?? []}
          loadingLocations={loadingMasterData}
          className="mt-6"
          onSubmit={(v) => {
            const next = new URLSearchParams(searchParams);
            if (v.keyword) next.set("q", v.keyword);
            else next.delete("q");

            if (v.locationId) next.set("locationId", v.locationId);
            else next.delete("locationId");
            next.delete("location"); // Xóa text param cũ nếu có

            next.delete("page");
            setSearchParams(next, { replace: true });
          }}
        />
      </div>

      {/* Control Bar (Total Count, Mobile Filter Button, Sort Dropdown) */}
      <div className="mt-8 flex flex-col justify-between gap-4 border-b border-border-subtle pb-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-title font-bold text-navy">
            {query.data ? `${query.data.total} việc làm phù hợp` : "Đang tìm kiếm việc làm..."}
          </span>
          {urlKeyword && (
            <span className="text-body-sm text-ink-muted">
              với từ khóa &ldquo;<strong className="text-navy">{urlKeyword}</strong>&rdquo;
            </span>
          )}
          {import.meta.env.DEV && query.data?.isDemoFallback && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-label-sm font-semibold text-amber-700">
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              Chế độ Demo (Backend offline)
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Mobile Filter Toggle Button */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setMobileFilterOpen(true)}
            className="flex items-center gap-2 lg:hidden"
          >
            <IconFilter size={16} stroke={1.8} />
            <span>Bộ lọc {activeFilterCount > 0 && `(${activeFilterCount})`}</span>
          </Button>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2 text-body-sm">
            <IconSortDescending size={18} stroke={1.6} className="text-ink-muted" />
            <label htmlFor="sort-select" className="hidden sm:inline text-ink-variant">
              Sắp xếp:
            </label>
            <select
              id="sort-select"
              value={sortBy}
              onChange={(e) => handleSortChange(e.target.value)}
              className="h-9 rounded-default border border-border-strong bg-surface px-3 py-1 text-label text-ink outline-none transition-colors hover:border-navy focus:border-navy"
            >
              <option value="newest">Mới nhất</option>
              <option value="salary_desc">Lương cao nhất</option>
              <option value="deadline">Hạn nộp gần nhất</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Layout: Filters Sidebar + Job Rows */}
      <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block lg:w-72 lg:shrink-0 self-start">
          <JobListFilters
            categoryId={categoryId}
            locationId={locationId}
            employmentTypeId={employmentTypeId}
            salaryMin={salaryMin}
            salaryMax={salaryMax}
            onFilterChange={handleFilterChange}
            onClearAll={handleClearAll}
            hasActiveFilters={hasActiveFilters}
          />
        </div>

        {/* Mobile Sheet */}
        <MobileFilterSheet
          isOpen={mobileFilterOpen}
          onClose={() => setMobileFilterOpen(false)}
          categoryId={categoryId}
          locationId={locationId}
          employmentTypeId={employmentTypeId}
          salaryMin={salaryMin}
          salaryMax={salaryMax}
          onFilterChange={handleFilterChange}
          onClearAll={handleClearAll}
          hasActiveFilters={hasActiveFilters}
          activeCount={activeFilterCount}
        />

        {/* Job Cards List */}
        <div className="flex min-w-0 flex-1 flex-col gap-4 min-h-[480px]" aria-label="Danh sách việc làm">
          <QueryBoundary
            isLoading={query.isLoading}
            error={query.error}
            onRetry={query.refetch}
            skeleton={
              <div className="flex flex-col gap-4">
                <SkeletonCard lines={2} />
                <SkeletonCard lines={2} />
                <SkeletonCard lines={2} />
              </div>
            }
          >
            {query.data && query.data.items.length > 0 ? (
              <>
                <div className="flex flex-col gap-4">
                  {query.data.items.map((job) => (
                    <JobListItemRow key={job.id} job={job} />
                  ))}
                </div>

                {/* Phân trang số trang chuẩn */}
                <JobListPagination
                  currentPage={query.data.page}
                  totalPages={query.data.totalPages}
                  hasPreviousPage={query.data.hasPreviousPage}
                  hasNextPage={query.data.hasNextPage}
                  onPageChange={handlePageChange}
                />
              </>
            ) : (
              <EmptyState
                icon={<IconFileText size={48} stroke={1.2} />}
                title="Không tìm thấy việc làm phù hợp"
                description="Thử điều chỉnh từ khóa tìm kiếm hoặc xóa bớt các bộ lọc để tiếp tục xem việc làm."
                action={
                  hasActiveFilters ? (
                    <Button variant="primary" onClick={handleClearAll}>
                      Xóa bộ lọc
                    </Button>
                  ) : undefined
                }
              />
            )}
          </QueryBoundary>
        </div>
      </div>
    </div>
  );
}
