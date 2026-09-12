import { useState } from "react";
import { IconSearch, IconCheck, IconX, IconBuilding, IconAlertCircle } from "@tabler/icons-react";
import { useCompanies, useVerifyCompany, useRejectCompany } from "~/features/admin/hooks/useAdminQueries";
import type { CompanyFilters } from "~/features/admin/types";
import { QueryBoundary } from "~/components/shared/QueryBoundary";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import { Badge } from "~/components/ui/Badge";
import { Modal } from "~/components/ui/Modal";
import { EmptyState } from "~/components/ui/EmptyState";
import { Avatar } from "~/components/ui/Avatar";
import { cn } from "~/lib/cn";

export default function CompaniesPage() {
  const [filters, setFilters] = useState<CompanyFilters>({
    search: "",
    verificationStatus: "",
    page: 1,
    pageSize: 20,
  });

  const handleSearch = (value: string) => {
    setFilters((prev) => ({ ...prev, search: value, page: 1 }));
  };

  const handleFilterChange = (key: keyof CompanyFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-headline-lg font-bold text-navy">Xác minh công ty</h1>
        <p className="mt-2 text-body text-ink-muted">
          Quản lý và xác minh thông tin các công ty đã đăng ký
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 rounded-default border border-border-subtle bg-surface p-4 shadow-sm sm:flex-row">
        <div className="flex-1">
          <Input
            placeholder="Tìm theo tên công ty hoặc mã số thuế..."
            value={filters.search}
            onChange={(e) => handleSearch(e.target.value)}
            icon={<IconSearch size={18} />}
          />
        </div>
        <select
          className="rounded-default border border-border-strong bg-surface px-4 py-2 text-body text-navy focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20"
          value={filters.verificationStatus}
          onChange={(e) => handleFilterChange("verificationStatus", e.target.value)}
        >
          <option value="">Tất cả trạng thái</option>
          <option value="Pending">Chờ xác minh</option>
          <option value="Verified">Đã xác minh</option>
          <option value="Rejected">Từ chối</option>
        </select>
      </div>

      <QueryBoundary
        isLoading={false}
        skeleton={<CompanyTableSkeleton />}
      >
        <CompanyTable filters={filters} onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))} />
      </QueryBoundary>
    </div>
  );
}

interface CompanyTableProps {
  filters: CompanyFilters;
  onPageChange: (page: number) => void;
}

function CompanyTable({ filters, onPageChange }: CompanyTableProps) {
  const { data } = useCompanies(filters);
  const verifyCompany = useVerifyCompany();
  const rejectCompany = useRejectCompany();
  const [rejectModal, setRejectModal] = useState<{ isOpen: boolean; companyId: string; companyName: string }>({
    isOpen: false,
    companyId: "",
    companyName: "",
  });
  const [rejectReason, setRejectReason] = useState("");

  if (!data || data.items.length === 0) {
    return (
      <EmptyState
        icon={<IconBuilding size={48} />}
        title="Không tìm thấy công ty"
        description="Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm"
      />
    );
  }

  const handleVerify = async (companyId: string) => {
    if (confirm("Bạn có chắc muốn xác minh công ty này?")) {
      await verifyCompany.mutateAsync(companyId);
    }
  };

  const handleRejectClick = (companyId: string, companyName: string) => {
    setRejectModal({ isOpen: true, companyId, companyName });
    setRejectReason("");
  };

  const handleRejectSubmit = async () => {
    if (!rejectReason.trim()) {
      alert("Vui lòng nhập lý do từ chối");
      return;
    }
    await rejectCompany.mutateAsync({ companyId: rejectModal.companyId, reason: rejectReason });
    setRejectModal({ isOpen: false, companyId: "", companyName: "" });
  };

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-default border border-border-subtle bg-surface shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-border-subtle bg-surface-high">
              <tr>
                <th className="px-6 py-4 text-left text-label-sm font-semibold text-navy">Công ty</th>
                <th className="px-6 py-4 text-left text-label-sm font-semibold text-navy">Mã số thuế</th>
                <th className="px-6 py-4 text-left text-label-sm font-semibold text-navy">Ngành nghề</th>
                <th className="px-6 py-4 text-left text-label-sm font-semibold text-navy">Quy mô</th>
                <th className="px-6 py-4 text-left text-label-sm font-semibold text-navy">Trạng thái</th>
                <th className="px-6 py-4 text-left text-label-sm font-semibold text-navy">Thống kê</th>
                <th className="px-6 py-4 text-right text-label-sm font-semibold text-navy">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {data.items.map((company) => (
                <tr key={company.id} className="hover:bg-surface-high">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar name={company.name} size="md" src={company.logoUrl || undefined} />
                      <div>
                        <p className="font-medium text-navy">{company.name}</p>
                        <p className="text-label-sm text-ink-muted">
                          {new Date(company.createdAt).toLocaleDateString("vi-VN")}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono text-body text-navy">{company.taxCode}</td>
                  <td className="px-6 py-4 text-body text-ink-muted">{company.industry || "—"}</td>
                  <td className="px-6 py-4 text-body text-ink-muted">{company.scale || "—"}</td>
                  <td className="px-6 py-4">
                    <VerificationBadge status={company.verifiedStatus} />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-3 text-label-sm text-ink-muted">
                      <span>{company.employerCount} HR</span>
                      <span>•</span>
                      <span>{company.jobCount} việc làm</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      {company.verifiedStatus === "Pending" && (
                        <>
                          <Button
                            size="sm"
                            variant="success"
                            onClick={() => handleVerify(company.id)}
                            disabled={verifyCompany.isPending}
                          >
                            <IconCheck size={16} />
                            Duyệt
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => handleRejectClick(company.id, company.name)}
                            disabled={rejectCompany.isPending}
                          >
                            <IconX size={16} />
                            Từ chối
                          </Button>
                        </>
                      )}
                      {company.verifiedStatus === "Verified" && (
                        <Badge variant="success">Đã xác minh</Badge>
                      )}
                      {company.verifiedStatus === "Rejected" && (
                        <Badge variant="danger">Đã từ chối</Badge>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between rounded-default border border-border-subtle bg-surface px-6 py-4 shadow-sm">
        <p className="text-body text-ink-muted">
          Hiển thị {(data.pageIndex - 1) * data.pageSize + 1} -{" "}
          {Math.min(data.pageIndex * data.pageSize, data.totalCount)} trong tổng {data.totalCount} công ty
        </p>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onPageChange(data.pageIndex - 1)}
            disabled={!data.hasPreviousPage}
          >
            Trước
          </Button>
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, data.totalPages) }, (_, i) => {
              const page = i + 1;
              return (
                <button
                  key={page}
                  onClick={() => onPageChange(page)}
                  className={cn(
                    "rounded-default px-3 py-1.5 text-label font-medium transition-colors",
                    page === data.pageIndex
                      ? "bg-gold text-white"
                      : "text-navy hover:bg-surface-high"
                  )}
                >
                  {page}
                </button>
              );
            })}
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onPageChange(data.pageIndex + 1)}
            disabled={!data.hasNextPage}
          >
            Sau
          </Button>
        </div>
      </div>

      {/* Reject Modal */}
      <Modal
        isOpen={rejectModal.isOpen}
        onClose={() => setRejectModal({ isOpen: false, companyId: "", companyName: "" })}
        title="Từ chối xác minh công ty"
      >
        <div className="space-y-4">
          <p className="text-body text-ink-muted">
            Bạn đang từ chối xác minh công ty <strong className="text-navy">{rejectModal.companyName}</strong>
          </p>
          <div>
            <label className="mb-2 block text-label font-medium text-navy">
              Lý do từ chối <span className="text-danger">*</span>
            </label>
            <textarea
              className="w-full rounded-default border border-border-strong bg-surface px-4 py-3 text-body text-navy placeholder-ink-muted focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20"
              rows={4}
              placeholder="Nhập lý do từ chối..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </div>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => setRejectModal({ isOpen: false, companyId: "", companyName: "" })}
              className="flex-1"
            >
              Hủy
            </Button>
            <Button
              variant="danger"
              onClick={handleRejectSubmit}
              disabled={rejectCompany.isPending || !rejectReason.trim()}
              className="flex-1"
            >
              Xác nhận từ chối
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function VerificationBadge({ status }: { status: string }) {
  const variants = {
    Verified: { variant: "success" as const, label: "Đã xác minh" },
    Pending: { variant: "warning" as const, label: "Chờ xác minh" },
    Rejected: { variant: "danger" as const, label: "Từ chối" },
  };

  const config = variants[status as keyof typeof variants] || { variant: "default" as const, label: status };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

function CompanyTableSkeleton() {
  return (
    <div className="rounded-default border border-border-subtle bg-surface p-6 shadow-sm">
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="h-12 w-12 animate-pulse rounded-full bg-surface-high" />
            <div className="h-10 flex-1 animate-pulse rounded bg-surface-high" />
            <div className="h-10 w-32 animate-pulse rounded bg-surface-high" />
            <div className="h-10 w-24 animate-pulse rounded bg-surface-high" />
          </div>
        ))}
      </div>
    </div>
  );
}
