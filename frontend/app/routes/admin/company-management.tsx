import { useState } from "react";
import { IconSearch, IconCheck, IconX, IconEye } from "@tabler/icons-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "~/components/ui/Card";
import { Badge } from "~/components/ui/Badge";
import { Table, THead, TBody, TR, TH, TD } from "~/components/ui/Table";
import { Input } from "~/components/ui/Input";
import { Button } from "~/components/ui/Button";
import { Modal } from "~/components/ui/Modal";
import { adminService } from "~/features/admin/services/adminService";
import type { CompanyProfileResponse } from "~/features/admin/types";

export default function CompanyManagementPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [pageIndex, setPageIndex] = useState(1);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<CompanyProfileResponse | null>(null);
  const [newStatus, setNewStatus] = useState<string>("");
  const [statusNote, setStatusNote] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-companies", searchQuery, selectedStatus, pageIndex],
    queryFn: () =>
      adminService().getCompanies({
        search: searchQuery || undefined,
        status: selectedStatus === "all" ? undefined : selectedStatus,
        pageIndex,
        pageSize: 10,
      }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: (params: { companyId: string; status: string; note?: string }) =>
      adminService().updateCompanyStatus(params.companyId, {
        status: params.status,
        note: params.note,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-companies"] });
      setStatusModalOpen(false);
      setStatusNote("");
      setSelectedCompany(null);
      setNewStatus("");
    },
  });

  const handleUpdateStatus = (company: CompanyProfileResponse, status: string) => {
    setSelectedCompany(company);
    setNewStatus(status);
    setStatusModalOpen(true);
  };

  const confirmUpdateStatus = () => {
    if (!selectedCompany || !newStatus) return;
    updateStatusMutation.mutate({
      companyId: selectedCompany.id,
      status: newStatus,
      note: statusNote || undefined,
    });
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: "success" | "gold" | "danger" | "neutral"; label: string }> = {
      Active: { variant: "success", label: "Đã xác thực" },
      Pending: { variant: "gold", label: "Chờ duyệt" },
      Rejected: { variant: "danger", label: "Từ chối" },
      Inactive: { variant: "neutral", label: "Không hoạt động" },
    };
    const { variant, label } = config[status] || { variant: "neutral" as const, label: status };
    return <Badge variant={variant}>{label}</Badge>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("vi-VN");
  };

  if (error) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <p className="text-body-lg font-semibold text-danger">Lỗi tải dữ liệu</p>
          <p className="mt-2 text-body-sm text-ink-muted">
            {error instanceof Error ? error.message : "Đã xảy ra lỗi"}
          </p>
        </div>
      </div>
    );
  }

  const companies = data?.items || [];
  const totalCount = data?.totalCount || 0;
  const totalPages = data?.totalPages || 1;

  const getStatusActionLabel = (status: string) => {
    const labels: Record<string, string> = {
      Active: "Đã xác thực",
      Rejected: "Từ chối",
      Inactive: "Vô hiệu hóa",
    };
    return labels[status] || status;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-headline-xl font-bold text-ink">Quản lý công ty</h1>
          <p className="mt-2 text-body-md text-ink-muted">
            Xác thực và quản lý thông tin các công ty trên hệ thống
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1 md:max-w-md">
              <IconSearch
                size={20}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
              />
              <Input
                type="text"
                placeholder="Tìm kiếm theo tên công ty..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedStatus("all")}
                className={`rounded-full px-4 py-2 text-label-sm font-semibold transition-colors ${
                  selectedStatus === "all"
                    ? "bg-navy text-white"
                    : "bg-surface-high text-ink-muted hover:bg-surface-low"
                }`}
              >
                Tất cả
              </button>
              <button
                onClick={() => setSelectedStatus("Pending")}
                className={`rounded-full px-4 py-2 text-label-sm font-semibold transition-colors ${
                  selectedStatus === "Pending"
                    ? "bg-navy text-white"
                    : "bg-surface-high text-ink-muted hover:bg-surface-low"
                }`}
              >
                Chờ duyệt
              </button>
              <button
                onClick={() => setSelectedStatus("Active")}
                className={`rounded-full px-4 py-2 text-label-sm font-semibold transition-colors ${
                  selectedStatus === "Active"
                    ? "bg-navy text-white"
                    : "bg-surface-high text-ink-muted hover:bg-surface-low"
                }`}
              >
                Đã xác thực
              </button>
              <button
                onClick={() => setSelectedStatus("Rejected")}
                className={`rounded-full px-4 py-2 text-label-sm font-semibold transition-colors ${
                  selectedStatus === "Rejected"
                    ? "bg-navy text-white"
                    : "bg-surface-high text-ink-muted hover:bg-surface-low"
                }`}
              >
                Từ chối
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-12 text-center">
              <p className="text-body-md text-ink-muted">Đang tải dữ liệu...</p>
            </div>
          ) : (
            <>
              <Table className="border-0 shadow-none">
                <THead>
                  <TR>
                    <TH>Công ty</TH>
                    <TH>Email</TH>
                    <TH>Ngành</TH>
                    <TH>Trạng thái</TH>
                    <TH>Ngày tạo</TH>
                    <TH className="text-right">Thao tác</TH>
                  </TR>
                </THead>
                <TBody>
                  {companies.map((company) => (
                    <TR key={company.id}>
                      <TD>
                        <div className="flex items-center gap-3">
                          {company.logoUrl ? (
                            <img
                              src={company.logoUrl}
                              alt={company.companyName}
                              className="h-10 w-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-navy/10 text-label-sm font-semibold text-navy">
                              {company.companyName?.charAt(0).toUpperCase() || "C"}
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-ink">{company.companyName || "Chưa đặt tên"}</p>
                            {company.companySize && (
                              <p className="text-label-sm text-ink-muted">{company.companySize}</p>
                            )}
                          </div>
                        </div>
                      </TD>
                      <TD className="text-ink-muted">{company.email}</TD>
                      <TD className="text-ink-muted">{company.industry || "Chưa cập nhật"}</TD>
                      <TD>{getStatusBadge(company.status)}</TD>
                      <TD className="text-ink-muted">{formatDate(company.createdAt)}</TD>
                      <TD>
                        <div className="flex items-center justify-end gap-2">
                          {company.status === "Pending" && (
                            <>
                              <button
                                onClick={() => handleUpdateStatus(company, "Active")}
                                disabled={updateStatusMutation.isPending}
                                className="rounded-default p-2 text-ink-muted transition-colors hover:bg-surface-low hover:text-success disabled:opacity-50"
                                title="Xác thực công ty"
                              >
                                <IconCheck size={18} />
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(company, "Rejected")}
                                disabled={updateStatusMutation.isPending}
                                className="rounded-default p-2 text-ink-muted transition-colors hover:bg-surface-low hover:text-danger disabled:opacity-50"
                                title="Từ chối công ty"
                              >
                                <IconX size={18} />
                              </button>
                            </>
                          )}
                          <button
                            className="rounded-default p-2 text-ink-muted transition-colors hover:bg-surface-low hover:text-ink"
                            title="Xem chi tiết"
                          >
                            <IconEye size={18} />
                          </button>
                        </div>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
              {companies.length === 0 && (
                <div className="py-12 text-center">
                  <p className="text-body-md text-ink-muted">Không tìm thấy công ty nào</p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between text-body-sm text-ink-muted">
        <p>
          Hiển thị {companies.length} trong tổng số {totalCount} công ty
        </p>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setPageIndex((p) => Math.max(1, p - 1))}
            disabled={pageIndex === 1 || isLoading}
          >
            Trang trước
          </Button>
          <span className="flex items-center px-3 text-body-sm font-medium">
            {pageIndex} / {totalPages}
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setPageIndex((p) => Math.min(totalPages, p + 1))}
            disabled={pageIndex === totalPages || isLoading}
          >
            Trang sau
          </Button>
        </div>
      </div>

      <Modal
        open={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        title={`Cập nhật trạng thái công ty`}
      >
        <div className="space-y-4">
          <p className="text-body-md text-ink-muted">
            Bạn có chắc chắn muốn cập nhật trạng thái công ty{" "}
            <strong>{selectedCompany?.companyName}</strong> thành{" "}
            <strong>{getStatusActionLabel(newStatus)}</strong>?
          </p>
          <div>
            <label htmlFor="statusNote" className="mb-2 block text-label-sm font-semibold text-ink">
              Ghi chú {newStatus === "Rejected" && <span className="text-danger">*</span>}
            </label>
            <textarea
              id="statusNote"
              value={statusNote}
              onChange={(e) => setStatusNote(e.target.value)}
              placeholder={
                newStatus === "Rejected"
                  ? "Nhập lý do từ chối..."
                  : "Nhập ghi chú (tùy chọn)..."
              }
              className="min-h-24 w-full rounded-default border border-stroke bg-white px-3 py-2 text-body-md text-ink transition-colors focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20"
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              size="md"
              onClick={() => setStatusModalOpen(false)}
              disabled={updateStatusMutation.isPending}
            >
              Hủy
            </Button>
            <Button
              variant={newStatus === "Active" ? "primary" : "danger"}
              size="md"
              onClick={confirmUpdateStatus}
              disabled={
                (newStatus === "Rejected" && !statusNote.trim()) ||
                updateStatusMutation.isPending
              }
            >
              {updateStatusMutation.isPending ? "Đang xử lý..." : "Xác nhận"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
