import { useState } from "react";
import { IconSearch, IconLock, IconLockOpen, IconFilter, IconUser } from "@tabler/icons-react";
import { useUsers, useLockUser, useUnlockUser } from "~/features/admin/hooks/useAdminQueries";
import type { UserFilters } from "~/features/admin/types";
import { QueryBoundary } from "~/components/shared/QueryBoundary";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import { Badge } from "~/components/ui/Badge";
import { EmptyState } from "~/components/ui/EmptyState";
import { cn } from "~/lib/cn";

export default function UsersPage() {
  const [filters, setFilters] = useState<UserFilters>({
    search: "",
    role: "",
    status: "",
    page: 1,
    pageSize: 20,
  });

  const handleSearch = (value: string) => {
    setFilters((prev) => ({ ...prev, search: value, page: 1 }));
  };

  const handleFilterChange = (key: keyof UserFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-headline-lg font-bold text-navy">Quản lý người dùng</h1>
        <p className="mt-2 text-body text-ink-muted">
          Xem danh sách, tìm kiếm và khóa/mở khóa tài khoản người dùng
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 rounded-default border border-border-subtle bg-surface p-4 shadow-sm sm:flex-row">
        <div className="flex-1">
          <Input
            placeholder="Tìm theo email hoặc tên..."
            value={filters.search}
            onChange={(e) => handleSearch(e.target.value)}
            icon={<IconSearch size={18} />}
          />
        </div>
        <select
          className="rounded-default border border-border-strong bg-surface px-4 py-2 text-body text-navy focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20"
          value={filters.role}
          onChange={(e) => handleFilterChange("role", e.target.value)}
        >
          <option value="">Tất cả vai trò</option>
          <option value="Candidate">Ứng viên</option>
          <option value="Employer">Nhà tuyển dụng</option>
          <option value="Admin">Quản trị viên</option>
        </select>
        <select
          className="rounded-default border border-border-strong bg-surface px-4 py-2 text-body text-navy focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20"
          value={filters.status}
          onChange={(e) => handleFilterChange("status", e.target.value)}
        >
          <option value="">Tất cả trạng thái</option>
          <option value="active">Hoạt động</option>
          <option value="locked">Bị khóa</option>
        </select>
      </div>

      <QueryBoundary
        isLoading={false}
        skeleton={<UserTableSkeleton />}
      >
        <UserTable filters={filters} onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))} />
      </QueryBoundary>
    </div>
  );
}

interface UserTableProps {
  filters: UserFilters;
  onPageChange: (page: number) => void;
}

function UserTable({ filters, onPageChange }: UserTableProps) {
  const { data } = useUsers(filters);
  const lockUser = useLockUser();
  const unlockUser = useUnlockUser();

  if (!data || data.items.length === 0) {
    return (
      <EmptyState
        icon={<IconUser size={48} />}
        title="Không tìm thấy người dùng"
        description="Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm"
      />
    );
  }

  const handleLock = async (userId: string) => {
    if (confirm("Bạn có chắc muốn khóa tài khoản này?")) {
      await lockUser.mutateAsync(userId);
    }
  };

  const handleUnlock = async (userId: string) => {
    if (confirm("Bạn có chắc muốn mở khóa tài khoản này?")) {
      await unlockUser.mutateAsync(userId);
    }
  };

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-default border border-border-subtle bg-surface shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-border-subtle bg-surface-high">
              <tr>
                <th className="px-6 py-4 text-left text-label-sm font-semibold text-navy">Email</th>
                <th className="px-6 py-4 text-left text-label-sm font-semibold text-navy">Họ tên</th>
                <th className="px-6 py-4 text-left text-label-sm font-semibold text-navy">Vai trò</th>
                <th className="px-6 py-4 text-left text-label-sm font-semibold text-navy">Trạng thái</th>
                <th className="px-6 py-4 text-left text-label-sm font-semibold text-navy">Ngày tạo</th>
                <th className="px-6 py-4 text-right text-label-sm font-semibold text-navy">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {data.items.map((user) => {
                const isLocked = user.lockoutEnd && new Date(user.lockoutEnd) > new Date();
                return (
                  <tr key={user.id} className="hover:bg-surface-high">
                    <td className="px-6 py-4 text-body text-navy">{user.email}</td>
                    <td className="px-6 py-4 text-body text-navy">{user.fullName || "—"}</td>
                    <td className="px-6 py-4">
                      <RoleBadge role={user.roles[0] || "Candidate"} />
                    </td>
                    <td className="px-6 py-4">
                      {isLocked ? (
                        <Badge variant="danger">Bị khóa</Badge>
                      ) : (
                        <Badge variant="success">Hoạt động</Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 text-body text-ink-muted">
                      {new Date(user.createdAt).toLocaleDateString("vi-VN")}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {isLocked ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleUnlock(user.id)}
                          disabled={unlockUser.isPending}
                        >
                          <IconLockOpen size={16} />
                          Mở khóa
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleLock(user.id)}
                          disabled={lockUser.isPending}
                        >
                          <IconLock size={16} />
                          Khóa
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between rounded-default border border-border-subtle bg-surface px-6 py-4 shadow-sm">
        <p className="text-body text-ink-muted">
          Hiển thị {(data.pageIndex - 1) * data.pageSize + 1} -{" "}
          {Math.min(data.pageIndex * data.pageSize, data.totalCount)} trong tổng {data.totalCount} người dùng
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
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const variants = {
    Admin: { variant: "danger" as const, label: "Quản trị viên" },
    Employer: { variant: "info" as const, label: "Nhà tuyển dụng" },
    Candidate: { variant: "success" as const, label: "Ứng viên" },
  };

  const config = variants[role as keyof typeof variants] || { variant: "default" as const, label: role };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

function UserTableSkeleton() {
  return (
    <div className="rounded-default border border-border-subtle bg-surface p-6 shadow-sm">
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="h-10 w-1/4 animate-pulse rounded bg-surface-high" />
            <div className="h-10 w-1/4 animate-pulse rounded bg-surface-high" />
            <div className="h-10 w-1/4 animate-pulse rounded bg-surface-high" />
            <div className="h-10 flex-1 animate-pulse rounded bg-surface-high" />
          </div>
        ))}
      </div>
    </div>
  );
}
