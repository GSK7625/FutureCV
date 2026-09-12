import { useMemo, useState } from "react";
import { IconChevronLeft, IconChevronRight, IconLock, IconLockOpen, IconSearch, IconUsers, IconUserCheck, IconUserX } from "@tabler/icons-react";
import { Badge, Button, EmptyState, Input, Skeleton } from "~/components/ui";
import { QueryBoundary } from "~/components/shared/QueryBoundary";
import { useDebounce } from "~/hooks/useDebounce";
import { useUIStore } from "~/stores/useUIStore";
import { useUsers, useLockUser, useUnlockUser } from "~/features/admin/hooks/useAdminQueries";
import type { UserFilters, UserListItem } from "~/features/admin/types";

const roleLabels: Record<string, string> = { 
  Admin: "Quản trị viên", 
  Employer: "Nhà tuyển dụng", 
  Candidate: "Ứng viên" 
};

function RoleBadge({ role }: { role: string }) {
  return (
    <Badge variant={role === "Admin" ? "solidNavy" : role === "Employer" ? "gold" : "navy"}>
      {roleLabels[role] || role}
    </Badge>
  );
}

export default function Page() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [filters, setFilters] = useState<UserFilters>({ pageIndex: 1, pageSize: 10 });
  const showToast = useUIStore((state) => state.showToast);
  
  const effectiveFilters = useMemo(
    () => ({ ...filters, keyword: debouncedSearch }),
    [filters, debouncedSearch]
  );
  
  const usersQuery = useUsers(effectiveFilters);
  const lockUser = useLockUser();
  const unlockUser = useUnlockUser();

  const setFilter = <K extends keyof UserFilters>(key: K, value: UserFilters[K]) => {
    setFilters((current) => ({ ...current, [key]: value, pageIndex: 1 }));
  };

  const handleLock = async (user: UserListItem) => {
    if (!window.confirm(`Khóa tài khoản "${user.email}"? Người dùng sẽ không thể đăng nhập.`)) return;
    try {
      await lockUser.mutateAsync(user.id);
      showToast("Đã khóa tài khoản", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Không thể khóa tài khoản", "error");
    }
  };

  const handleUnlock = async (user: UserListItem) => {
    try {
      await unlockUser.mutateAsync(user.id);
      showToast("Đã mở khóa tài khoản", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Không thể mở khóa tài khoản", "error");
    }
  };

  const users = usersQuery.data?.items ?? [];

  return (
    <section aria-labelledby="users-title">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-label font-semibold text-gold">QUẢN TRỊ</p>
          <h1 id="users-title" className="mt-1 text-headline text-navy">Quản lý người dùng</h1>
          <p className="mt-2 text-ink-variant">Xem danh sách người dùng và quản lý trạng thái tài khoản.</p>
        </div>
      </div>

      <div className="mb-5 grid gap-3 rounded-default border border-border-subtle bg-surface p-4 shadow-surface md:grid-cols-[minmax(0,1fr)_13rem_13rem_13rem]">
        <Input 
          aria-label="Tìm kiếm người dùng" 
          icon={<IconSearch size={18} aria-hidden="true" />} 
          placeholder="Tìm theo email hoặc tên" 
          value={search} 
          onChange={(event) => setSearch(event.target.value)} 
        />
        <select 
          aria-label="Lọc theo vai trò" 
          value={filters.role ?? ""} 
          onChange={(event) => setFilter("role", event.target.value as UserFilters["role"])}
          className="h-11 rounded-default border border-border-strong bg-white px-3.5 text-ink focus:border-gold"
        >
          <option value="">Tất cả vai trò</option>
          <option value="Admin">Quản trị viên</option>
          <option value="Employer">Nhà tuyển dụng</option>
          <option value="Candidate">Ứng viên</option>
        </select>
        <select 
          aria-label="Lọc theo xác thực email" 
          value={filters.emailConfirmed === undefined ? "" : String(filters.emailConfirmed)} 
          onChange={(event) => setFilter("emailConfirmed", event.target.value === "" ? undefined : event.target.value === "true")}
          className="h-11 rounded-default border border-border-strong bg-white px-3.5 text-ink focus:border-gold"
        >
          <option value="">Mọi trạng thái email</option>
          <option value="true">Đã xác thực</option>
          <option value="false">Chưa xác thực</option>
        </select>
        <select 
          aria-label="Lọc theo trạng thái khóa" 
          value={filters.isLocked === undefined ? "" : String(filters.isLocked)} 
          onChange={(event) => setFilter("isLocked", event.target.value === "" ? undefined : event.target.value === "true")}
          className="h-11 rounded-default border border-border-strong bg-white px-3.5 text-ink focus:border-gold"
        >
          <option value="">Tất cả tài khoản</option>
          <option value="false">Đang hoạt động</option>
          <option value="true">Đã khóa</option>
        </select>
      </div>

      <QueryBoundary 
        isLoading={usersQuery.isLoading} 
        error={usersQuery.error} 
        onRetry={() => usersQuery.refetch()} 
        skeleton={<UsersSkeleton />}
      >
        {users.length === 0 ? (
          <EmptyState 
            icon={<IconUsers size={42} aria-hidden="true" />} 
            title="Không tìm thấy người dùng" 
            description="Thử thay đổi điều kiện tìm kiếm." 
          />
        ) : (
          <>
            <div className="hidden overflow-x-auto rounded-default border border-border-subtle bg-surface shadow-surface lg:block">
              <table className="w-full text-left">
                <thead className="bg-surface-low text-label-sm uppercase tracking-wider text-ink-muted">
                  <tr>
                    <th className="px-4 py-3">Email & Tên</th>
                    <th className="px-4 py-3">Vai trò</th>
                    <th className="px-4 py-3">Trạng thái</th>
                    <th className="px-4 py-3">Ngày tạo</th>
                    <th className="px-4 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {users.map((user) => {
                    const isLocked = user.lockoutEnd && new Date(user.lockoutEnd) > new Date();
                    return (
                      <tr key={user.id} className="hover:bg-surface-low">
                        <td className="px-4 py-4">
                          <span className="block font-semibold text-navy">{user.email}</span>
                          <span className="mt-1 block text-label text-ink-muted">{user.fullName || "Chưa cập nhật"}</span>
                        </td>
                        <td className="px-4 py-4">
                          <RoleBadge role={user.roles[0] || "Candidate"} />
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-2">
                            {!user.isLockedOut ? (
                              <Badge variant="success">
                                <IconUserCheck size={14} aria-hidden="true" />
                                Hoạt động
                              </Badge>
                            ) : (
                              <Badge variant="neutral">
                                <IconUserX size={14} aria-hidden="true" />
                                Đã khóa
                              </Badge>
                            )}
                            {isLocked && <Badge variant="danger">Đã khóa</Badge>}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-label tabular-nums text-ink-variant">
                          {new Date(user.createdAt).toLocaleDateString("vi-VN")}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex justify-end gap-1">
                            {isLocked ? (
                              <button
                                type="button"
                                aria-label={`Mở khóa ${user.email}`}
                                onClick={() => void handleUnlock(user)}
                                disabled={lockUser.isPending || unlockUser.isPending}
                                className="flex h-10 w-10 items-center justify-center rounded-default text-success hover:bg-success/10 disabled:opacity-50"
                              >
                                <IconLockOpen size={18} aria-hidden="true" />
                              </button>
                            ) : (
                              <button
                                type="button"
                                aria-label={`Khóa ${user.email}`}
                                onClick={() => void handleLock(user)}
                                disabled={lockUser.isPending || unlockUser.isPending || user.roles.includes("Admin")}
                                className="flex h-10 w-10 items-center justify-center rounded-default text-danger hover:bg-danger/10 disabled:opacity-50"
                              >
                                <IconLock size={18} aria-hidden="true" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="grid gap-4 lg:hidden">
              {users.map((user) => {
                const isLocked = user.lockoutEnd && new Date(user.lockoutEnd) > new Date();
                return (
                  <article key={user.id} className="rounded-default border border-border-subtle bg-surface p-4 shadow-surface">
                    <div className="flex flex-wrap gap-2">
                      <RoleBadge role={user.roles[0] || "Candidate"} />
                      {!user.isLockedOut ? (
                        <Badge variant="success">
                          <IconUserCheck size={14} aria-hidden="true" />
                          Hoạt động
                        </Badge>
                      ) : (
                        <Badge variant="neutral">
                          <IconUserX size={14} aria-hidden="true" />
                          Đã khóa
                        </Badge>
                      )}
                      {isLocked && <Badge variant="danger">Đã khóa</Badge>}
                    </div>
                    <div className="mt-3">
                      <h3 className="text-body-lg font-semibold text-navy">{user.email}</h3>
                      <p className="mt-1 text-label text-ink-muted">{user.fullName || "Chưa cập nhật"}</p>
                    </div>
                    <dl className="mt-3 grid grid-cols-1 gap-2 text-label">
                      <div>
                        <dt className="text-ink-muted">Ngày tạo</dt>
                        <dd className="mt-1 text-ink tabular-nums">
                          {new Date(user.createdAt).toLocaleDateString("vi-VN")}
                        </dd>
                      </div>
                    </dl>
                    <div className="mt-4 border-t border-border-subtle pt-3 flex gap-2">
                      {isLocked ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => void handleUnlock(user)}
                          disabled={lockUser.isPending || unlockUser.isPending}
                        >
                          <IconLockOpen size={18} aria-hidden="true" />
                          Mở khóa
                        </Button>
                      ) : (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => void handleLock(user)}
                          disabled={lockUser.isPending || unlockUser.isPending || user.roles.includes("Admin")}
                        >
                          <IconLock size={18} aria-hidden="true" />
                          Khóa tài khoản
                        </Button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-label text-ink-muted">
                {usersQuery.data?.totalCount ?? 0} người dùng · Trang {usersQuery.data?.pageIndex ?? 1}/
                {Math.max(usersQuery.data?.totalPages ?? 1, 1)}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={(usersQuery.data?.pageIndex ?? 1) <= 1}
                  onClick={() => setFilters((current) => ({ ...current, pageIndex: Math.max(1, (current.pageIndex ?? 1) - 1) }))}
                >
                  <IconChevronLeft size={17} aria-hidden="true" />
                  Trước
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={(usersQuery.data?.pageIndex ?? 1) >= (usersQuery.data?.totalPages ?? 1)}
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
    </section>
  );
}

function UsersSkeleton() {
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
