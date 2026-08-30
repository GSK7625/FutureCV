import { useEffect, useRef, useState } from "react";
import { Link, Outlet, useLoaderData, useNavigate } from "react-router";
import {
  IconSearch,
  IconBell,
  IconLogout,
  IconUserCircle,
  IconChevronDown,
  IconFileText,
} from "@tabler/icons-react";
import type { Route } from "./+types/CandidateLayout";
import { requireRole } from "~/guards/requireRole";
import { useAuthStore } from "~/stores/useAuthStore";
import { Avatar } from "~/components/ui/Avatar";
import { cn } from "~/lib/cn";

export const clientLoader = (args: Route.ClientLoaderArgs) => {
  const { user } = requireRole(["candidate"]);
  const url = new URL(args.request.url);
  return { keyword: url.searchParams.get("q") ?? "" };
};

export default function CandidateLayout() {
  const { keyword: initialKeyword } = useLoaderData<typeof clientLoader>();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const [keyword, setKeyword] = useState(initialKeyword);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/candidate${keyword.trim() ? `?q=${encodeURIComponent(keyword.trim())}` : ""}`);
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Topbar navy */}
      <header className="sticky top-0 z-nav bg-navy text-white shadow-sm">
        <div className="container-page mx-auto flex h-[72px] items-center justify-between px-margin-mobile md:px-margin-desktop">
          <div className="flex items-center gap-8">
            <Link to="/" className="text-headline-md font-bold tracking-tight">
              FutureCV
            </Link>
            <form onSubmit={handleSearch} className="hidden items-center md:flex">
              <div className="flex items-center rounded-default bg-white/10 px-4 ring-1 ring-white/20 transition-all focus-within:ring-gold">
                <IconSearch size={18} stroke={1.6} className="mr-2 text-white/60" />
                <input
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Tìm việc làm, công ty..."
                  aria-label="Tìm kiếm việc làm"
                  className="h-10 w-72 bg-transparent text-body text-white outline-none placeholder:text-white/50"
                />
              </div>
            </form>
          </div>

          <div className="flex items-center gap-5">
            <button
              type="button"
              aria-label="Thông báo"
              className="relative text-white/80 transition-colors hover:text-gold"
            >
              <IconBell size={22} stroke={1.6} />
            </button>
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                className="flex items-center gap-2"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((v) => !v)}
              >
                <Avatar name={user?.fullName || user?.email || "U"} size="md" />
                <IconChevronDown
                  size={16}
                  stroke={2}
                  className={cn("text-white/60 transition-transform", menuOpen && "rotate-180")}
                />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full z-dropdown mt-2 w-56 overflow-hidden rounded-default border border-border-subtle bg-surface shadow-overlay">
                  <div className="border-b border-border-subtle px-4 py-3">
                    <p className="truncate font-semibold text-navy">
                      {user?.fullName || "Ứng viên FutureCV"}
                    </p>
                    <p className="truncate text-label-sm text-ink-muted">{user?.email}</p>
                  </div>
                  <Link
                    to="/candidate/profile"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 text-ink-variant transition-colors hover:bg-surface-low hover:text-navy"
                  >
                    <IconUserCircle size={18} stroke={1.6} /> Hồ sơ của tôi
                  </Link>
                  <Link
                    to="/candidate"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 text-ink-variant transition-colors hover:bg-surface-low hover:text-navy"
                  >
                    <IconFileText size={18} stroke={1.6} /> Việc đã ứng tuyển
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-danger transition-colors hover:bg-surface-low"
                  >
                    <IconLogout size={18} stroke={1.6} /> Đăng xuất
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container-page mx-auto px-margin-mobile py-8 md:px-margin-desktop">
        <Outlet />
      </main>
    </div>
  );
}
