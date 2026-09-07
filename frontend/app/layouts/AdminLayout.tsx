import { Link, Outlet } from "react-router";
import { requireRole } from "~/guards/requireRole";
import { useAuthStore } from "~/stores/useAuthStore";
import { Avatar } from "~/components/ui/Avatar";

export const clientLoader = () => {
  return requireRole(["admin"]);
};

/** Layout cho khu vực Admin */
export default function AdminLayout() {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-navy text-white shadow-sm">
        <div className="container-page mx-auto flex h-[72px] items-center justify-between px-margin-mobile md:px-margin-desktop">
          <div className="flex items-center gap-8">
            <Link to="/" className="text-headline-md font-bold tracking-tight">
              FutureCV
            </Link>
            <span className="rounded-full bg-white/10 px-3 py-1 text-label-sm">Quản trị hệ thống</span>
          </div>
          <div className="flex items-center gap-3">
            <Avatar name={user?.fullName || user?.email || "Admin"} size="md" />
          </div>
        </div>
      </header>
      <main className="container-page mx-auto px-margin-mobile py-10 md:px-margin-desktop">
        <Outlet />
      </main>
    </div>
  );
}
