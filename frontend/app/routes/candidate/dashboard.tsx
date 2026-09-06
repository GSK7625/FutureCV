import { useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { useAuthStore } from "~/stores/useAuthStore";

export default function CandidateDashboard() {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "candidate") {
      navigate("/auth/login");
    }
  }, [isAuthenticated, user, navigate]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">FC</span>
              </div>
              <h1 className="text-xl font-bold text-slate-50">FutureCV</h1>
            </Link>
            
            <nav className="hidden md:flex items-center gap-6">
              <Link to="/candidate/dashboard" className="text-cyan-400 text-sm font-medium">
                Dashboard
              </Link>
              <Link to="/candidate/jobs" className="text-slate-400 hover:text-slate-200 text-sm transition-colors">
                Tìm việc
              </Link>
              <Link to="/candidate/applications" className="text-slate-400 hover:text-slate-200 text-sm transition-colors">
                Hồ sơ của tôi
              </Link>
              <Link to="/candidate/profile" className="text-slate-400 hover:text-slate-200 text-sm transition-colors">
                Hồ sơ cá nhân
              </Link>
            </nav>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm font-medium text-slate-200">{user?.fullName}</div>
              <div className="text-xs text-slate-500">Ứng viên</div>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg border border-slate-700 transition-colors"
            >
              Đăng xuất
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-slate-50 mb-2">
            Chào {user?.fullName}! 👋
          </h2>
          <p className="text-slate-400">
            Sẵn sàng cho cơ hội nghề nghiệp mới chưa?
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
            <div className="text-sm font-medium text-slate-400 mb-2">Hồ sơ đã nộp</div>
            <div className="text-3xl font-bold text-cyan-400">12</div>
          </div>
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
            <div className="text-sm font-medium text-slate-400 mb-2">Đang chờ phản hồi</div>
            <div className="text-3xl font-bold text-orange-400">5</div>
          </div>
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
            <div className="text-sm font-medium text-slate-400 mb-2">Lịch phỏng vấn</div>
            <div className="text-3xl font-bold text-blue-400">2</div>
          </div>
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
            <div className="text-sm font-medium text-slate-400 mb-2">Profile views</div>
            <div className="text-3xl font-bold text-green-400">48</div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Applications */}
          <div className="lg:col-span-2 space-y-6">
            {/* Recent Applications */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-slate-50">Hồ sơ gần đây</h3>
                <Link to="/candidate/applications" className="text-sm text-cyan-400 hover:text-cyan-300">
                  Xem tất cả →
                </Link>
              </div>

              <div className="space-y-4">
                {[
                  { company: "Tech Corp", position: "Frontend Developer", status: "interview", date: "2 ngày trước" },
                  { company: "StartUp XYZ", position: "Full Stack Developer", status: "pending", date: "5 ngày trước" },
                  { company: "Big Company", position: "React Developer", status: "reviewing", date: "1 tuần trước" },
                ].map((app, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-slate-900/30 rounded-lg hover:bg-slate-900/50 transition-colors cursor-pointer">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-sm">{app.company[0]}</span>
                      </div>
                      <div>
                        <h4 className="font-medium text-slate-200">{app.position}</h4>
                        <p className="text-sm text-slate-400">{app.company}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                        app.status === "interview" ? "bg-green-500/10 text-green-400" :
                        app.status === "pending" ? "bg-orange-500/10 text-orange-400" :
                        "bg-cyan-500/10 text-cyan-400"
                      }`}>
                        {app.status === "interview" ? "Phỏng vấn" :
                         app.status === "pending" ? "Chờ duyệt" : "Đang xem xét"}
                      </span>
                      <p className="text-xs text-slate-500 mt-1">{app.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommended Jobs */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-slate-50">Việc làm phù hợp</h3>
                <Link to="/candidate/jobs" className="text-sm text-cyan-400 hover:text-cyan-300">
                  Xem tất cả →
                </Link>
              </div>

              <div className="space-y-4">
                {[
                  { company: "Innovation Labs", position: "Senior React Developer", salary: "20-30M", location: "Hà Nội", hot: true },
                  { company: "Digital Agency", position: "UI/UX Developer", salary: "15-25M", location: "TP.HCM", hot: false },
                  { company: "FinTech Startup", position: "Frontend Engineer", salary: "18-28M", location: "Remote", hot: true },
                ].map((job, index) => (
                  <div key={index} className="p-4 bg-slate-900/30 rounded-lg hover:bg-slate-900/50 transition-colors cursor-pointer border border-transparent hover:border-cyan-500/30">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-slate-200">{job.position}</h4>
                          {job.hot && (
                            <span className="px-2 py-0.5 bg-orange-500/10 text-orange-400 text-xs font-medium rounded">
                              🔥 Hot
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-400 mt-1">{job.company}</p>
                      </div>
                      <button className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white text-sm font-medium rounded-lg transition-colors">
                        Ứng tuyển
                      </button>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span>💰 {job.salary}</span>
                      <span>📍 {job.location}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Profile & Schedule */}
          <div className="space-y-6">
            {/* Profile Completion */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-slate-50 mb-4">Hoàn thiện hồ sơ</h3>
              
              <div className="mb-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-slate-400">Tiến độ</span>
                  <span className="text-cyan-400 font-medium">75%</span>
                </div>
                <div className="w-full bg-slate-900/50 rounded-full h-2">
                  <div className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full" style={{ width: "75%" }}></div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-green-400">✓</span>
                  <span className="text-slate-300">Thông tin cơ bản</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-green-400">✓</span>
                  <span className="text-slate-300">Upload CV</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-orange-400">○</span>
                  <span className="text-slate-400">Kinh nghiệm làm việc</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-slate-600">○</span>
                  <span className="text-slate-500">Kỹ năng chuyên môn</span>
                </div>
              </div>

              <Link
                to="/candidate/profile"
                className="block w-full mt-4 px-4 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-sm font-medium rounded-lg border border-cyan-500/20 hover:border-cyan-500/40 transition-colors text-center"
              >
                Cập nhật hồ sơ
              </Link>
            </div>

            {/* Upcoming Interviews */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-slate-50 mb-4">Lịch phỏng vấn</h3>
              
              <div className="space-y-3">
                <div className="p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">📅</div>
                    <div className="flex-1">
                      <h4 className="font-medium text-slate-200 mb-1">Tech Corp</h4>
                      <p className="text-sm text-slate-400 mb-2">Frontend Developer - Round 2</p>
                      <div className="flex items-center gap-2 text-xs text-cyan-400">
                        <span>⏰ Thứ 2, 10:00 AM</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-900/30 rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">📅</div>
                    <div className="flex-1">
                      <h4 className="font-medium text-slate-200 mb-1">StartUp XYZ</h4>
                      <p className="text-sm text-slate-400 mb-2">Full Stack - Round 1</p>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span>⏰ Thứ 4, 2:00 PM</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-slate-50 mb-4">Thao tác nhanh</h3>
              
              <div className="space-y-2">
                <button className="w-full px-4 py-3 bg-slate-900/50 hover:bg-slate-900 text-slate-300 hover:text-cyan-400 text-sm font-medium rounded-lg border border-slate-700/50 hover:border-cyan-500/50 transition-all text-left">
                  🔍 Tìm việc làm
                </button>
                <button className="w-full px-4 py-3 bg-slate-900/50 hover:bg-slate-900 text-slate-300 hover:text-cyan-400 text-sm font-medium rounded-lg border border-slate-700/50 hover:border-cyan-500/50 transition-all text-left">
                  📄 Upload CV mới
                </button>
                <button className="w-full px-4 py-3 bg-slate-900/50 hover:bg-slate-900 text-slate-300 hover:text-cyan-400 text-sm font-medium rounded-lg border border-slate-700/50 hover:border-cyan-500/50 transition-all text-left">
                  ⚙️ Cài đặt tài khoản
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
