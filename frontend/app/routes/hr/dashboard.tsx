import { useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { useAuthStore } from "~/stores/useAuthStore";

export default function HRDashboard() {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated || (user?.role !== "hr" && user?.role !== "employer")) {
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
              <h1 className="text-xl font-bold text-slate-50">FutureCV HR</h1>
            </Link>
            
            <nav className="hidden md:flex items-center gap-6">
              <Link to="/hr/dashboard" className="text-cyan-400 text-sm font-medium">
                Dashboard
              </Link>
              <Link to="/hr/jobs" className="text-slate-400 hover:text-slate-200 text-sm transition-colors">
                Tin tuyển dụng
              </Link>
              <Link to="/hr/applications" className="text-slate-400 hover:text-slate-200 text-sm transition-colors">
                Hồ sơ ứng viên
              </Link>
              <Link to="/hr/interviews" className="text-slate-400 hover:text-slate-200 text-sm transition-colors">
                Lịch phỏng vấn
              </Link>
              <Link to="/hr/profile" className="text-slate-400 hover:text-slate-200 text-sm transition-colors">
                Công ty
              </Link>
            </nav>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm font-medium text-slate-200">{user?.fullName}</div>
              <div className="text-xs text-slate-500">HR Manager</div>
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
            Quản lý tuyển dụng và tìm kiếm nhân tài
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="text-sm font-medium text-slate-400">Tin đang tuyển</div>
              <span className="text-xs font-medium px-2 py-1 bg-cyan-500/10 text-cyan-400 rounded">
                Active
              </span>
            </div>
            <div className="text-3xl font-bold text-slate-50">8</div>
            <p className="text-xs text-slate-500 mt-2">+2 trong tuần này</p>
          </div>
          
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="text-sm font-medium text-slate-400">Hồ sơ mới</div>
              <span className="text-xs font-medium px-2 py-1 bg-orange-500/10 text-orange-400 rounded">
                +24%
              </span>
            </div>
            <div className="text-3xl font-bold text-slate-50">45</div>
            <p className="text-xs text-slate-500 mt-2">Chờ xem xét</p>
          </div>
          
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="text-sm font-medium text-slate-400">Phỏng vấn tuần này</div>
              <span className="text-xs font-medium px-2 py-1 bg-blue-500/10 text-blue-400 rounded">
                Scheduled
              </span>
            </div>
            <div className="text-3xl font-bold text-slate-50">12</div>
            <p className="text-xs text-slate-500 mt-2">7 hôm nay</p>
          </div>
          
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="text-sm font-medium text-slate-400">Profile views</div>
              <span className="text-xs font-medium px-2 py-1 bg-green-500/10 text-green-400 rounded">
                +15%
              </span>
            </div>
            <div className="text-3xl font-bold text-slate-50">1,234</div>
            <p className="text-xs text-slate-500 mt-2">Trong 30 ngày</p>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Applications */}
          <div className="lg:col-span-2 space-y-6">
            {/* New Applications */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-slate-50">Hồ sơ mới nhất</h3>
                <Link to="/hr/applications" className="text-sm text-cyan-400 hover:text-cyan-300">
                  Xem tất cả →
                </Link>
              </div>

              <div className="space-y-4">
                {[
                  { name: "Nguyễn Văn A", position: "Frontend Developer", experience: "3 năm", status: "new", time: "5 phút trước" },
                  { name: "Trần Thị B", position: "Full Stack Developer", experience: "5 năm", status: "reviewing", time: "1 giờ trước" },
                  { name: "Lê Văn C", position: "React Developer", experience: "2 năm", status: "new", time: "2 giờ trước" },
                ].map((app, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-slate-900/30 rounded-lg hover:bg-slate-900/50 transition-colors cursor-pointer">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-sm">{app.name[0]}</span>
                      </div>
                      <div>
                        <h4 className="font-medium text-slate-200">{app.name}</h4>
                        <p className="text-sm text-slate-400">{app.position} • {app.experience}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                          app.status === "new" ? "bg-orange-500/10 text-orange-400" : "bg-cyan-500/10 text-cyan-400"
                        }`}>
                          {app.status === "new" ? "Mới" : "Đang xem"}
                        </span>
                        <p className="text-xs text-slate-500 mt-1">{app.time}</p>
                      </div>
                      <button className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white text-sm font-medium rounded-lg transition-colors">
                        Xem
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Active Job Posts */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-slate-50">Tin tuyển dụng đang active</h3>
                <Link to="/hr/jobs" className="text-sm text-cyan-400 hover:text-cyan-300">
                  Quản lý →
                </Link>
              </div>

              <div className="space-y-4">
                {[
                  { title: "Senior Frontend Developer", applications: 23, views: 456, daysLeft: 15 },
                  { title: "Full Stack Engineer", applications: 18, views: 342, daysLeft: 22 },
                  { title: "React Native Developer", applications: 12, views: 234, daysLeft: 8 },
                ].map((job, index) => (
                  <div key={index} className="p-4 bg-slate-900/30 rounded-lg hover:bg-slate-900/50 transition-colors cursor-pointer">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-medium text-slate-200 mb-1">{job.title}</h4>
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          <span>📋 {job.applications} hồ sơ</span>
                          <span>👁️ {job.views} lượt xem</span>
                        </div>
                      </div>
                      <span className="px-3 py-1 bg-green-500/10 text-green-400 text-xs font-medium rounded-full">
                        {job.daysLeft} ngày
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="flex-1 px-3 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-xs font-medium rounded border border-cyan-500/20 transition-colors">
                        Xem hồ sơ
                      </button>
                      <button className="flex-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded border border-slate-700 transition-colors">
                        Chỉnh sửa
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <button className="w-full mt-4 px-4 py-3 bg-cyan-500 hover:bg-cyan-600 text-white text-sm font-medium rounded-lg transition-colors">
                + Đăng tin tuyển dụng mới
              </button>
            </div>

            {/* Performance Chart */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-slate-50 mb-4">Hiệu suất tuyển dụng</h3>
              
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-slate-400">Tỷ lệ xem CV</span>
                    <span className="text-cyan-400 font-medium">85%</span>
                  </div>
                  <div className="w-full bg-slate-900/50 rounded-full h-2">
                    <div className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full" style={{ width: "85%" }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-slate-400">Tỷ lệ phỏng vấn</span>
                    <span className="text-orange-400 font-medium">62%</span>
                  </div>
                  <div className="w-full bg-slate-900/50 rounded-full h-2">
                    <div className="bg-gradient-to-r from-orange-500 to-red-500 h-2 rounded-full" style={{ width: "62%" }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-slate-400">Tỷ lệ chấp nhận offer</span>
                    <span className="text-green-400 font-medium">78%</span>
                  </div>
                  <div className="w-full bg-slate-900/50 rounded-full h-2">
                    <div className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full" style={{ width: "78%" }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Schedule & Actions */}
          <div className="space-y-6">
            {/* Today's Schedule */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-slate-50 mb-4">Lịch hôm nay</h3>
              
              <div className="space-y-3">
                <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
                  <div className="flex items-center gap-2 text-xs text-cyan-400 mb-2">
                    <span>⏰ 10:00 AM</span>
                  </div>
                  <h4 className="font-medium text-slate-200 text-sm mb-1">Nguyễn Văn A</h4>
                  <p className="text-xs text-slate-400">Frontend Developer - Round 2</p>
                </div>

                <div className="p-3 bg-slate-900/30 rounded-lg">
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                    <span>⏰ 2:00 PM</span>
                  </div>
                  <h4 className="font-medium text-slate-200 text-sm mb-1">Trần Thị B</h4>
                  <p className="text-xs text-slate-400">Full Stack - Round 1</p>
                </div>

                <div className="p-3 bg-slate-900/30 rounded-lg">
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                    <span>⏰ 4:00 PM</span>
                  </div>
                  <h4 className="font-medium text-slate-200 text-sm mb-1">Lê Văn C</h4>
                  <p className="text-xs text-slate-400">React Developer - Round 1</p>
                </div>
              </div>

              <Link
                to="/hr/interviews"
                className="block w-full mt-4 px-4 py-2 bg-slate-900/50 hover:bg-slate-900 text-slate-300 hover:text-cyan-400 text-sm font-medium rounded-lg border border-slate-700/50 hover:border-cyan-500/50 transition-all text-center"
              >
                Xem lịch đầy đủ
              </Link>
            </div>

            {/* Quick Actions */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-slate-50 mb-4">Thao tác nhanh</h3>
              
              <div className="space-y-2">
                <button className="w-full px-4 py-3 bg-cyan-500 hover:bg-cyan-600 text-white text-sm font-medium rounded-lg transition-colors text-left">
                  ➕ Đăng tin tuyển dụng
                </button>
                <button className="w-full px-4 py-3 bg-slate-900/50 hover:bg-slate-900 text-slate-300 hover:text-cyan-400 text-sm font-medium rounded-lg border border-slate-700/50 hover:border-cyan-500/50 transition-all text-left">
                  📋 Xem hồ sơ mới
                </button>
                <button className="w-full px-4 py-3 bg-slate-900/50 hover:bg-slate-900 text-slate-300 hover:text-cyan-400 text-sm font-medium rounded-lg border border-slate-700/50 hover:border-cyan-500/50 transition-all text-left">
                  📅 Lên lịch phỏng vấn
                </button>
                <button className="w-full px-4 py-3 bg-slate-900/50 hover:bg-slate-900 text-slate-300 hover:text-cyan-400 text-sm font-medium rounded-lg border border-slate-700/50 hover:border-cyan-500/50 transition-all text-left">
                  ⚙️ Cài đặt công ty
                </button>
              </div>
            </div>

            {/* Tips */}
            <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-xl p-6">
              <div className="text-2xl mb-3">💡</div>
              <h3 className="text-lg font-semibold text-slate-50 mb-2">Mẹo tuyển dụng</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Phản hồi hồ sơ ứng viên trong vòng 24h để tăng tỷ lệ chấp nhận phỏng vấn lên 40%.
              </p>
            </div>

            {/* Stats Summary */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-slate-50 mb-4">Tháng này</h3>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Tổng hồ sơ</span>
                  <span className="text-sm font-medium text-slate-200">156</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Đã phỏng vấn</span>
                  <span className="text-sm font-medium text-slate-200">42</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Đã tuyển</span>
                  <span className="text-sm font-medium text-green-400">8</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Từ chối</span>
                  <span className="text-sm font-medium text-red-400">34</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
