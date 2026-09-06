import { Link } from "react-router";
import { useAuthStore } from "~/stores/useAuthStore";

export default function HomePage() {
  const { isAuthenticated, user } = useAuthStore();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">FC</span>
            </div>
            <h1 className="text-xl font-bold text-slate-50">FutureCV</h1>
          </div>
          
          <nav className="flex items-center gap-6">
            {isAuthenticated ? (
              <>
                <span className="text-slate-300 text-sm">
                  Xin chào, <span className="font-medium text-cyan-400">{user?.fullName}</span>
                </span>
                <Link
                  to={`/${user?.role}/dashboard`}
                  className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Dashboard
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/auth/login"
                  className="px-4 py-2 text-slate-300 hover:text-white text-sm font-medium transition-colors"
                >
                  Đăng nhập
                </Link>
                <Link
                  to="/auth/register"
                  className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Đăng ký
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-6 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full mb-8">
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
            <span className="text-cyan-400 text-sm font-medium">Hệ thống tuyển dụng thông minh</span>
          </div>
          
          <h2 className="text-5xl font-bold text-slate-50 mb-6 leading-tight">
            Kết nối tài năng với <br />
            <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              cơ hội nghề nghiệp
            </span>
          </h2>
          
          <p className="text-xl text-slate-400 mb-12 max-w-2xl mx-auto">
            Nền tảng tuyển dụng hiện đại giúp ứng viên tìm việc và nhà tuyển dụng tìm kiếm nhân tài một cách nhanh chóng và hiệu quả.
          </p>

          <div className="flex items-center justify-center gap-4">
            <Link
              to="/auth/register"
              className="px-8 py-4 bg-cyan-500 hover:bg-cyan-600 text-white text-lg font-medium rounded-xl transition-all hover:scale-105"
            >
              Bắt đầu ngay
            </Link>
            <Link
              to="/public/about"
              className="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-slate-200 text-lg font-medium rounded-xl border border-slate-700 transition-all hover:scale-105"
            >
              Tìm hiểu thêm
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 max-w-5xl mx-auto">
          <div className="p-6 bg-slate-800/50 border border-slate-700/50 rounded-xl">
            <div className="w-12 h-12 bg-cyan-500/10 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-50 mb-2">Cho ứng viên</h3>
            <p className="text-slate-400 text-sm">Tìm kiếm công việc phù hợp, nộp hồ sơ trực tuyến, theo dõi tiến trình ứng tuyển.</p>
          </div>

          <div className="p-6 bg-slate-800/50 border border-slate-700/50 rounded-xl">
            <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-50 mb-2">Cho HR</h3>
            <p className="text-slate-400 text-sm">Đăng tin tuyển dụng, quản lý hồ sơ ứng viên, lên lịch phỏng vấn dễ dàng.</p>
          </div>

          <div className="p-6 bg-slate-800/50 border border-slate-700/50 rounded-xl">
            <div className="w-12 h-12 bg-orange-500/10 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-50 mb-2">Bảo mật</h3>
            <p className="text-slate-400 text-sm">Dữ liệu được bảo vệ với công nghệ mã hóa hiện đại, đảm bảo an toàn tuyệt đối.</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20 max-w-4xl mx-auto text-center">
          <div>
            <div className="text-4xl font-bold text-cyan-400 mb-2">1000+</div>
            <div className="text-slate-400">Công việc đang tuyển</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-cyan-400 mb-2">500+</div>
            <div className="text-slate-400">Nhà tuyển dụng</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-cyan-400 mb-2">5000+</div>
            <div className="text-slate-400">Ứng viên đã tìm được việc</div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-700/50 bg-slate-900/80 backdrop-blur-sm mt-20">
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <p className="text-slate-400 text-sm">
              © 2026 FutureCV. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <Link to="/public/about" className="text-slate-400 hover:text-cyan-400 text-sm transition-colors">
                Về chúng tôi
              </Link>
              <Link to="/public/contact" className="text-slate-400 hover:text-cyan-400 text-sm transition-colors">
                Liên hệ
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
