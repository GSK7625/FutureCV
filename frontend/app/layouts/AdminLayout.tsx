import { Link, Outlet, useLocation } from "react-router";
import { IconLayoutDashboard, IconUsers, IconBuilding, IconBriefcase, IconSettings, IconLogout } from "@tabler/icons-react";
import { requireRole } from "~/guards/requireRole";
import { useAuthStore } from "~/stores/useAuthStore";
import { Avatar } from "~/components/ui/Avatar";
import { cn } from "~/lib/cn";

export const clientLoader = ({ request }: { request: Request }) => {
  const url = new URL(request.url);
  return requireRole(["admin"], url.pathname);
};

const navItems = [
  { to: "/admin/dashboard", label: "Tổng quan", icon: IconLayoutDashboard },
  { to: "/admin/users", label: "Người dùng", icon: IconUsers },
  { to: "/admin/companies", label: "Công ty", icon: IconBuilding },
  { to: "/admin/jobs", label: "Tin tuyển dụng", icon: IconBriefcase },
  { to: "/admin/config", label: "Cấu hình", icon: IconSettings },
];

/** Layout cho khu vực Admin */
export default function AdminLayout() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const location = useLocation();

  const handleLogout = () => {
    logout();
    window.location.href = "/login-admin";
  };

  return (
    <div className="flex min-h-screen bg-surface-low">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-border-subtle bg-surface shadow-surface lg:block">
        <div className="flex h-full flex-col">
          <div className="flex h-[72px] items-center gap-2 border-b border-border-subtle px-6">
            <Link to="/" className="text-headline-sm font-bold tracking-tight text-navy">
              FutureCV
            </Link>
            <span className="rounded-default bg-gold px-2 py-0.5 text-label-sm font-semibold text-white">
              Admin
            </span>
          </div>
          
          <nav className="flex-1 space-y-1 overflow-y-auto p-4">
            {navItems.map((item) => {
              const isActive = location.pathname === item.to;
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex items-center gap-3 rounded-default px-4 py-3 text-label font-medium transition-colors",
                    isActive
                      ? "bg-gold text-white"
                      : "text-ink-muted hover:bg-surface-high hover:text-navy"
                  )}
                >
                  <Icon size={20} aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-border-subtle p-4">
            <div className="flex items-center gap-3 rounded-default bg-surface-high p-3">
              <Avatar name={user?.fullName || user?.email || "Admin"} size="md" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-label font-semibold text-navy">
                  {user?.fullName || "Admin"}
                </p>
                <p className="truncate text-label-sm text-ink-muted">{user?.email}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="mt-2 flex w-full items-center gap-3 rounded-default px-4 py-3 text-label font-medium text-danger hover:bg-danger/10"
            >
              <IconLogout size={20} aria-hidden="true" />
              Đăng xuất
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 lg:ml-64">
        <header className="sticky top-0 z-30 border-b border-border-subtle bg-surface shadow-sm lg:hidden">
          <div className="flex h-[72px] items-center justify-between px-margin-mobile">
            <Link to="/" className="text-headline-sm font-bold tracking-tight text-navy">
              FutureCV
            </Link>
            <Avatar name={user?.fullName || user?.email || "Admin"} size="md" />
          </div>
        </header>
        
        <main className="container-page mx-auto px-margin-mobile py-8 md:px-margin-desktop md:py-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
