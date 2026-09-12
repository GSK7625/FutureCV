import { useMemo, useState } from "react";
import { IconBuilding, IconChevronLeft, IconChevronRight, IconCircleCheck, IconSearch, IconX } from "@tabler/icons-react";
import { Badge, Button, EmptyState, Input, Skeleton } from "~/components/ui";
import { QueryBoundary } from "~/components/shared/QueryBoundary";
import { useDebounce } from "~/hooks/useDebounce";
import { useUIStore } from "~/stores/useUIStore";
import { useCompanies, useVerifyCompany, useRejectCompany } from "~/features/admin/hooks/useAdminQueries";
import type { CompanyFilters, CompanyListItem } from "~/features/admin/types";

const statusLabels: Record<string, string> = { 
  Pending: "Chờ xác minh", 
  Verified: "Đã xác minh", 
  Rejected: "Bị từ chối" 
};

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={status === "Verified" ? "success" : status === "Rejected" ? "danger" : "gold"}>
      {statusLabels[status] || status}
    </Badge>
  );
}

export default function Page() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [filters, setFilters] = useState<CompanyFilters>({ pageIndex: 1, pageSize: 10 });
  const [rejectDialogCompany, setRejectDialogCompany] = useState<CompanyListItem | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const showToast = useUIStore((state) => state.showToast);
  
  const effectiveFilters = useMemo(
    () => ({ ...filters, keyword: debouncedSearch }),
    [filters, debouncedSearch]
  );
  
  const companiesQuery = useCompanies(effectiveFilters);
  const verifyCompany = useVerifyCompany();
  const rejectCompany = useRejectCompany();

  const setFilter = <K extends keyof CompanyFilters>(key: K, value: CompanyFilters[K]) => {
    setFilters((current) => ({ ...current, [key]: value, pageIndex: 1 }));
  };

  const handleVerify = async (company: CompanyListItem) => {
    if (!window.confirm(`Xác minh công ty "${company.name}"?`)) return;
    try {
      await verifyCompany.mutateAsync(company.id);
      showToast("Đã xác minh công ty", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Không thể xác minh công ty", "error");
    }
  };

  const handleReject = async () => {
    if (!rejectDialogCompany || !rejectReason.trim()) {
      showToast("Vui lòng nhập lý do từ chối", "error");
      return;
    }
    try {
      await rejectCompany.mutateAsync({ 
        companyId: rejectDialogCompany.id, 
        reason: rejectReason 
      });
      showToast("Đã từ chối công ty", "success");
      setRejectDialogCompany(null);
      setRejectReason("");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Không thể từ chối công ty", "error");
    }
  };

  const companies = companiesQuery.data?.items ?? [];

  return (
    <section aria-labelledby="companies-title">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-label font-semibold text-gold">QUẢN TRỊ</p>
          <h1 id="companies-title" className="mt-1 text-headline text-navy">Xác minh công ty</h1>
          <p className="mt-2 text-ink-variant">Duyệt và xác minh các công ty đăng ký trên hệ thống.</p>
        </div>
      </div>

      <div className="mb-5 grid gap-3 rounded-default border border-border-subtle bg-surface p-4 shadow-surface md:grid-cols-[minmax(0,1fr)_13rem]">
        <Input 
          aria-label="Tìm kiếm công ty" 
          icon={<IconSearch size={18} aria-hidden="true" />} 
          placeholder="Tìm theo tên hoặc mã số thuế" 
          value={search} 
          onChange={(event) => setSearch(event.target.value)} 
        />
        <select 
          aria-label="Lọc theo trạng thái" 
          value={filters.verifiedStatus ?? ""} 
          onChange={(event) => setFilter("verifiedStatus", event.target.value as CompanyFilters["verifiedStatus"])}
          className="h-11 rounded-default border border-border-strong bg-white px-3.5 text-ink focus:border-gold"
        >
          <option value="">Mọi trạng thái</option>
          <option value="Pending">Chờ xác minh</option>
          <option value="Verified">Đã xác minh</option>
          <option value="Rejected">Bị từ chối</option>
        </select>
      </div>

      <QueryBoundary 
        isLoading={companiesQuery.isLoading} 
        error={companiesQuery.error} 
        onRetry={() => companiesQuery.refetch()} 
        skeleton={<CompaniesSkeleton />}
      >
        {companies.length === 0 ? (
          <EmptyState 
            icon={<IconBuilding size={42} aria-hidden="true" />} 
            title="Không tìm thấy công ty" 
            description="Thử thay đổi điều kiện tìm kiếm." 
          />
        ) : (
          <>
            <div className="hidden overflow-x-auto rounded-default border border-border-subtle bg-surface shadow-surface lg:block">
              <table className="w-full text-left">
                <thead className="bg-surface-low text-label-sm uppercase tracking-wider text-ink-muted">
                  <tr>
                    <th className="px-4 py-3">Công ty</th>
                    <th className="px-4 py-3">Mã số thuế</th>
                    <th className="px-4 py-3">Ngành nghề</th>
                    <th className="px-4 py-3">Trạng thái</th>
                    <th className="px-4 py-3">Số nhân sự</th>
                    <th className="px-4 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {companies.map((company) => (
                    <tr key={company.id} className="hover:bg-surface-low">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-default bg-navy/10 text-navy">
                            {company.logoUrl ? (
                              <img src={company.logoUrl} alt={`Logo ${company.name}`} className="h-full w-full object-cover" />
                            ) : (
                              <IconBuilding size={20} aria-hidden="true" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <span className="block font-semibold text-navy">{company.name}</span>
                            <span className="mt-1 block text-label text-ink-muted">{company.scale || "Chưa cập nhật"}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-label font-medium tabular-nums text-ink">{company.taxCode}</td>
                      <td className="px-4 py-4 text-label text-ink-variant">{company.industry || "Chưa cập nhật"}</td>
                      <td className="px-4 py-4">
                        <StatusBadge status={company.verifiedStatus} />
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-label text-ink-variant">
                          {company.employerCount} HR · {company.jobCount} tin
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <CompanyActions 
                          company={company} 
                          busy={verifyCompany.isPending || rejectCompany.isPending}
                          onVerify={() => void handleVerify(company)}
                          onReject={() => setRejectDialogCompany(company)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-4 lg:hidden">
              {companies.map((company) => (
                <article key={company.id} className="rounded-default border border-border-subtle bg-surface p-4 shadow-surface">
                  <StatusBadge status={company.verifiedStatus} />
                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-default bg-navy/10 text-navy">
                      {company.logoUrl ? (
                        <img src={company.logoUrl} alt={`Logo ${company.name}`} className="h-full w-full object-cover" />
                      ) : (
                        <IconBuilding size={24} aria-hidden="true" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-body-lg font-semibold text-navy">{company.name}</h3>
                      <p className="mt-1 text-label text-ink-muted">{company.scale || "Chưa cập nhật"}</p>
                    </div>
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-3 text-label">
                    <div>
                      <dt className="text-ink-muted">Mã số thuế</dt>
                      <dd className="mt-1 font-medium tabular-nums text-ink">{company.taxCode}</dd>
                    </div>
                    <div>
                      <dt className="text-ink-muted">Ngành nghề</dt>
                      <dd className="mt-1 text-ink">{company.industry || "Chưa cập nhật"}</dd>
                    </div>
                    <div>
                      <dt className="text-ink-muted">Nhân sự</dt>
                      <dd className="mt-1 text-ink">{company.employerCount} HR</dd>
                    </div>
                    <div>
                      <dt className="text-ink-muted">Tin tuyển dụng</dt>
                      <dd className="mt-1 text-ink">{company.jobCount} tin</dd>
                    </div>
                  </dl>
                  <div className="mt-4 border-t border-border-subtle pt-3">
                    <CompanyActions 
                      company={company} 
                      busy={verifyCompany.isPending || rejectCompany.isPending}
                      onVerify={() => void handleVerify(company)}
                      onReject={() => setRejectDialogCompany(company)}
                    />
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-label text-ink-muted">
                {companiesQuery.data?.totalCount ?? 0} công ty · Trang {companiesQuery.data?.pageIndex ?? 1}/
                {Math.max(companiesQuery.data?.totalPages ?? 1, 1)}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={(companiesQuery.data?.pageIndex ?? 1) <= 1}
                  onClick={() => setFilters((current) => ({ ...current, pageIndex: Math.max(1, (current.pageIndex ?? 1) - 1) }))}
                >
                  <IconChevronLeft size={17} aria-hidden="true" />
                  Trước
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={(companiesQuery.data?.pageIndex ?? 1) >= (companiesQuery.data?.totalPages ?? 1)}
                  onClick={() => setFilters((current) => ({ ...current, pageIndex: (current.pageIndex ?? 1) + 1 }))}
                >
                  Sau
                  <IconChevronRight size={17} aria-hidden="true" />
                </Button>
              </div>
            </div>
          </>
        )}
      </QueryBoundary>

      {/* Reject Dialog */}
      {rejectDialogCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/80 p-4">
          <div className="w-full max-w-md rounded-default border border-border-subtle bg-surface p-6 shadow-lg">
            <h2 className="text-body-lg font-semibold text-navy">Từ chối xác minh công ty</h2>
            <p className="mt-2 text-label text-ink-variant">
              Công ty: <strong className="text-navy">{rejectDialogCompany.name}</strong>
            </p>
            <div className="mt-4">
              <label htmlFor="reject-reason" className="block text-label font-medium text-navy">
                Lý do từ chối *
              </label>
              <textarea
                id="reject-reason"
                rows={4}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Nhập lý do từ chối xác minh..."
                className="mt-2 w-full rounded-default border border-border-strong bg-white px-3.5 py-2.5 text-ink focus:border-gold"
              />
            </div>
            <div className="mt-5 flex gap-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setRejectDialogCompany(null);
                  setRejectReason("");
                }}
                className="flex-1"
              >
                Hủy
              </Button>
              <Button
                onClick={() => void handleReject()}
                disabled={!rejectReason.trim() || rejectCompany.isPending}
                className="flex-1"
              >
                Xác nhận từ chối
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function CompanyActions({ company, busy, onVerify, onReject }: { 
  company: CompanyListItem; 
  busy: boolean; 
  onVerify: () => void; 
  onReject: () => void;
}) {
  if (company.verifiedStatus !== "Pending") {
    return (
      <div className="flex justify-end gap-1">
        <span className="text-label text-ink-muted">Đã xử lý</span>
      </div>
    );
  }

  return (
    <div className="flex justify-end gap-1">
      <button
        type="button"
        aria-label={`Xác minh ${company.name}`}
        onClick={onVerify}
        disabled={busy}
        className="flex h-10 w-10 items-center justify-center rounded-default text-success hover:bg-success/10 disabled:opacity-50"
      >
        <IconCircleCheck size={18} aria-hidden="true" />
      </button>
      <button
        type="button"
        aria-label={`Từ chối ${company.name}`}
        onClick={onReject}
        disabled={busy}
        className="flex h-10 w-10 items-center justify-center rounded-default text-danger hover:bg-danger/10 disabled:opacity-50"
      >
        <IconX size={18} aria-hidden="true" />
      </button>
    </div>
  );
}

function CompaniesSkeleton() {
  return (
    <div className="space-y-3 rounded-default border border-border-subtle bg-surface p-4">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="grid grid-cols-[2fr_1fr_1fr] gap-4 border-b border-border-subtle py-3 last:border-0">
          <Skeleton className="h-6" />
          <Skeleton className="h-6" />
          <Skeleton className="h-6" />
        </div>
      ))}
    </div>
  );
}
