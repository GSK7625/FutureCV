import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router";
import {
  IconMenu2,
  IconX,
  IconBell,
  IconBriefcase,
  IconFileText,
} from "@tabler/icons-react";
import { Button } from "~/components/ui/Button";
import { Avatar } from "~/components/ui/Avatar";
import { useAuthStore } from "~/stores/useAuthStore";

const navLinks = [
  { to: "/", label: "Việc làm", end: true },
  { to: "/candidate", label: "Tạo CV", end: false },
];

export default function PublicLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    setMobileOpen(false);
    navigate("/");
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-nav border-b border-border-subtle bg-surface shadow-sm">
        <div className="container-page mx-auto flex h-[72px] items-center justify-between px-margin-mobile md:px-margin-desktop">
          <div className="flex items-center gap-8">
            <Link to="/" className="text-headline-md font-bold tracking-tight text-navy">
              FutureCV
            </Link>
            <nav className="hidden items-center gap-2 md:flex" aria-label="Điều hướng chính">
              {navLinks.map((link) => (
                <NavLink
                  key={link.label}
                  to={link.to}
                  end={link.end}
                  className={({ isActive }) =>
                    `rounded-default px-3 py-2 text-label transition-all duration-200 ${
                      isActive
                        ? "border-b-2 border-navy font-bold text-navy"
                        : "text-ink-variant hover:bg-surface-low hover:text-navy"
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="hidden items-center gap-6 md:flex">
            {user ? (
              <>
                <button
                  type="button"
                  aria-label="Thông báo"
                  className="relative text-navy transition-colors hover:text-gold"
                >
                  <IconBell size={22} stroke={1.6} />
                </button>
                <div className="flex items-center gap-3">
                  <Avatar name={user.fullName || user.email || "U"} size="md" />
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="text-label text-ink-variant transition-colors hover:text-navy"
                  >
                    Đăng xuất
                  </button>
                </div>
                <div className="h-8 w-px bg-border-subtle" aria-hidden />
                <div className="flex flex-col items-start">
                  <span className="text-label-sm text-ink-variant">Bạn là nhà tuyển dụng?</span>
                  <Link
                    to="/hr"
                    className="text-label font-bold text-navy transition-colors hover:text-gold"
                  >
                    Đăng tuyển ngay »
                  </Link>
                </div>
              </>
            ) : (
              <>
                <div className="flex flex-col items-start">
                  <span className="text-label-sm text-ink-variant">Bạn là nhà tuyển dụng?</span>
                  <Link
                    to="/register"
                    className="text-label font-bold text-navy transition-colors hover:text-gold"
                  >
                    Đăng tuyển ngay »
                  </Link>
                </div>
                <div className="h-8 w-px bg-border-subtle" aria-hidden />
                <Button variant="ghost" onClick={() => navigate("/login")}>
                  Đăng nhập
                </Button>
                <Button variant="accent" onClick={() => navigate("/register")}>
                  Đăng ký ngay
                </Button>
              </>
            )}
          </div>

          <button
            type="button"
            className="text-navy md:hidden"
            aria-label={mobileOpen ? "Đóng menu" : "Mở menu"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <IconX size={24} /> : <IconMenu2 size={24} />}
          </button>
        </div>

        {mobileOpen && (
          <nav
            className="border-t border-border-subtle bg-surface px-margin-mobile py-4 md:hidden"
            aria-label="Điều hướng di động"
          >
            <div className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <NavLink
                  key={link.label}
                  to={link.to}
                  end={link.end}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-default px-3 py-3 text-body ${
                      isActive ? "bg-navy-secondary/10 font-semibold text-navy" : "text-ink-variant"
                    }`
                  }
                >
                  <IconBriefcase size={18} stroke={1.6} />
                  {link.label}
                </NavLink>
              ))}
              {user ? (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-default px-3 py-3 text-left text-body text-ink-variant"
                >
                  Đăng xuất
                </button>
              ) : (
                <div className="mt-3 flex flex-col gap-3 border-t border-border-subtle pt-4">
                  <Button variant="secondary" onClick={() => navigate("/login")}>
                    Đăng nhập
                  </Button>
                  <Button variant="accent" onClick={() => navigate("/register")}>
                    Đăng ký ngay
                  </Button>
                </div>
              )}
            </div>
          </nav>
        )}
      </header>

      <main className="flex-grow">
        <Outlet />
      </main>

      <footer className="border-t border-navy-secondary bg-navy text-white">
        <div className="container-page mx-auto grid grid-cols-1 gap-10 px-margin-mobile py-14 md:grid-cols-4 md:px-margin-desktop">
          <div>
            <Link to="/" className="text-headline-md font-bold text-white">
              FutureCV
            </Link>
            <p className="mt-4 text-label text-white/80">
              Nền tảng tìm việc làm và tạo CV online cho người Việt.
            </p>
            <p className="mt-6 text-label-sm text-white/60">
              © 2026 FutureCV. Tất cả quyền được bảo vệ.
            </p>
          </div>

          <div>
            <h4 className="mb-4 text-label-sm font-bold uppercase tracking-wider text-white">
              Thông tin
            </h4>
            <ul className="flex flex-col gap-2 text-label text-white/80">
              <li>
                <Link to="/about" className="decoration-gold transition-all hover:text-white hover:underline">
                  Về chúng tôi
                </Link>
              </li>
              <li>
                <Link to="/contact" className="decoration-gold transition-all hover:text-white hover:underline">
                  Liên hệ
                </Link>
              </li>
              <li>
                <Link to="/candidate" className="decoration-gold transition-all hover:text-white hover:underline">
                  Tìm kiếm việc làm
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-label-sm font-bold uppercase tracking-wider text-white">
              Pháp lý
            </h4>
            <ul className="flex flex-col gap-2 text-label text-white/80">
              <li><a href="#" className="decoration-gold transition-all hover:text-white hover:underline">Điều khoản sử dụng</a></li>
              <li><a href="#" className="decoration-gold transition-all hover:text-white hover:underline">Chính sách bảo mật</a></li>
              <li><a href="#" className="decoration-gold transition-all hover:text-white hover:underline">Quy định bảo mật</a></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-label-sm font-bold uppercase tracking-wider text-white">
              Liên hệ
            </h4>
            <ul className="flex flex-col gap-3 text-label text-white/80">
              <li className="flex items-center gap-2">
                <IconBriefcase size={18} stroke={1.6} className="text-gold" />
                Hotline: 1900 068 889
              </li>
              <li className="flex items-center gap-2">
                <IconFileText size={18} stroke={1.6} className="text-gold" />
                Email: hotro@futurecv.vn
              </li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}
