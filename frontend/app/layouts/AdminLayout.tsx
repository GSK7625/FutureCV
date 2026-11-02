import { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router";
import { IconLayoutDashboard, IconUsers, IconBuildingSkyscraper, IconBriefcase, IconFileText, IconSettings, IconLogout } from "@tabler/icons-react";
import { requireRole } from "~/guards/requireRole";
import { useAuthStore } from "~/stores/useAuthStore";
import { Avatar } from "~/components/ui/Avatar";
import { useQueryClient } from "@tanstack/react-query";
import { authService } from "~/features/auth/services/authService";
import { useUIStore } from "~/stores/useUIStore";

export const clientLoader = () => {
  return requireRole(["admin"]);
};

const menuItems = [
  { path: "/admin", label: "Tổng quan", icon: IconLayoutDashboard },
  { path: "/admin/users", label: "Người dùng", icon: IconUsers },
  { path: "/admin/companies", label: "Công ty", icon: IconBuildingSkyscraper },
  { path: "/admin/jobs", label: "Tin tuyển dụng", icon: IconBriefcase },
  { path: "/admin/audit-logs", label: "Nhật ký", icon: IconFileText },
  { path: "/admin/config", label: "Cấu hình", icon: IconSettings },
];

/** Layout cho khu vực Admin */
export default function AdminLayout() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const showToast = useUIStore((state) => state.showToast);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await authService().logout(useAuthStore.getState().refreshToken);
      logout();
      queryClient.clear();
      navigate("/login-admin", { replace: true });
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Không thể đăng xuất. Vui lòng thử lại.", "error");
      if (!useAuthStore.getState().user) navigate("/login-admin", { replace: true });
    } finally {
      setLoggingOut(false);
    }
  };

  const isActive = (path: string) => {
    if (path === "/admin") {
      return location.pathname === "/admin";
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-border-subtle bg-surface">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-[72px] items-center border-b border-border-subtle px-6">
            <Link to="/" className="text-headline-md font-bold text-navy">
              FutureCV
            </Link>
            <span className="ml-2 rounded-full bg-navy/10 px-2 py-1 text-label-xs text-navy">
              Admin
            </span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 overflow-y-auto p-4">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 rounded-default px-4 py-3 text-body-sm font-medium transition-colors ${
                    active
                      ? "bg-navy text-white"
                      : "text-ink-muted hover:bg-surface-high hover:text-ink"
                  }`}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User Profile */}
          <div className="border-t border-border-subtle p-4">
            <div className="flex items-center gap-3">
              <Avatar name={user?.fullName || user?.email || "Admin"} size="sm" />
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-body-sm font-medium text-ink">
                  {user?.fullName || "Admin"}
                </p>
                <p className="truncate text-label-sm text-ink-muted">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="mt-3 flex w-full items-center gap-2 rounded-default px-4 py-2 text-body-sm font-medium text-danger transition-colors hover:bg-danger/10 disabled:opacity-50"
            >
              <IconLogout size={18} />
              <span>{loggingOut ? "Đang đăng xuất..." : "Đăng xuất"}</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="ml-64 flex-1">
        <main className="container-page mx-auto px-margin-mobile py-10 md:px-margin-desktop">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
