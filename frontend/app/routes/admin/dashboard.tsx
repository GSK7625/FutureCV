import { useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { useAuthStore } from "~/stores/useAuthStore";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "admin") {
      navigate("/auth/login");
    }
  }, [isAuthenticated, user, navigate]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const stats = [
    { label: "Tổng người dùng", value: "1,234", change: "+12%", color: "cyan" },
    { label: "Công việc đang tuyển", value: "567", change: "+8%", color: "blue" },
    { label: "Hồ sơ ứng tuyển", value: "2,890", change: "+24%", color: "orange" },
    { label: "HR đang hoạt động", value: "89", change: "+5%", color: "green" },
  ];

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
              <h1 className="text-xl font-bold text-slate-50">FutureCV Admin</h1>
            </Link>
            
            <nav className="hidden md:flex items-center gap-6">
              <Link to="/admin/dashboard" className="text-cyan-400 text-sm font-medium">
                Dashboard
              </Link>
              <Link to="/admin/users" className="text-slate-400 hover:text-slate-200 text-sm transition-colors">
                Người dùng
              </Link>
              <Link to="/admin/jobs" className="text-slate-400 hover:text-slate-200 text-sm transition-colors">
                Công việc
              </Link>
              <Link to="/admin/applications" className="text-slate-400 hover:text-slate-200 text-sm transition-colors">
                Hồ sơ
              </Link>
              <Link to="/admin/settings" className="text-slate-400 hover:text-slate-200 text-sm transition-colors">
                Cài đặt
              </Link>
            </nav>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm font-medium text-slate-200">{user?.fullName}</div>
              <div className="text-xs text-slate-500">Administrator</div>
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
            Xin chào, {user?.fullName}! 👋
          </h2>
          <p className="text-slate-400">
            Chào mừng trở lại với bảng điều khiển quản trị
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 hover:border-slate-600/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="text-sm font-medium text-slate-400">{stat.label}</div>
                <span className={`text-xs font-medium px-2 py-1 bg-${stat.color}-500/10 text-${stat.color}-400 rounded`}>
                  {stat.change}
                </span>
              </div>
              <div className="text-3xl font-bold text-slate-50">{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Recent Activities */}
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-slate-50 mb-4">Hoạt động gần đây</h3>
            <div className="space-y-4">
              {[
                { user: "Nguyễn Văn A", action: "đã đăng ký tài khoản", time: "5 phút trước", type: "user" },
                { user: "Công ty XYZ", action: "đăng tin tuyển dụng mới", time: "15 phút trước", type: "job" },
                { user: "Trần Thị B", action: "nộp hồ sơ ứng tuyển", time: "1 giờ trước", type: "app" },
                { user: "HR Công ty ABC", action: "xác nhận phỏng vấn", time: "2 giờ trước", type: "interview" },
              ].map((activity, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-slate-900/30 rounded-lg">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    activity.type === "user" ? "bg-cyan-500/10" :
                    activity.type === "job" ? "bg-blue-500/10" :
                    activity.type === "app" ? "bg-orange-500/10" : "bg-green-500/10"
                  }`}>
                    <span className={`text-xs ${
                      activity.type === "user" ? "text-cyan-400" :
                      activity.type === "job" ? "text-blue-400" :
                      activity.type === "app" ? "text-orange-400" : "text-green-400"
                    }`}>●</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-slate-300">
                      <span className="font-medium text-slate-200">{activity.user}</span> {activity.action}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* System Status */}
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-slate-50 mb-4">Trạng thái hệ thống</h3>
            <div className="space-y-4">
              {[
                { service: "API Server", status: "online", uptime: "99.9%", color: "green" },
                { service: "Database", status: "online", uptime: "99.8%", color: "green" },
                { service: "Email Service", status: "online", uptime: "98.5%", color: "green" },
                { service: "Storage", status: "warning", uptime: "85%", color: "orange" },
              ].map((service, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-slate-900/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      service.color === "green" ? "bg-green-400 animate-pulse" : "bg-orange-400"
                    }`}></div>
                    <span className="text-sm font-medium text-slate-300">{service.service}</span>
                  </div>
                  <div className="text-right">
                    <div className={`text-xs font-medium ${
                      service.color === "green" ? "text-green-400" : "text-orange-400"
                    }`}>
                      {service.status === "online" ? "Online" : "Warning"}
                    </div>
                    <div className="text-xs text-slate-500">Uptime: {service.uptime}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
              <p className="text-xs text-cyan-400 font-medium mb-1">💡 Lưu ý</p>
              <p className="text-xs text-slate-400">
                Storage đang sử dụng 85% dung lượng. Cân nhắc nâng cấp.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-slate-50 mb-4">Thao tác nhanh</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button className="p-4 bg-slate-900/50 hover:bg-slate-900 border border-slate-700/50 hover:border-cyan-500/50 rounded-lg transition-all group">
              <div className="text-2xl mb-2">👤</div>
              <div className="text-sm font-medium text-slate-300 group-hover:text-cyan-400">Quản lý người dùng</div>
            </button>
            <button className="p-4 bg-slate-900/50 hover:bg-slate-900 border border-slate-700/50 hover:border-cyan-500/50 rounded-lg transition-all group">
              <div className="text-2xl mb-2">💼</div>
              <div className="text-sm font-medium text-slate-300 group-hover:text-cyan-400">Duyệt tin tuyển dụng</div>
            </button>
            <button className="p-4 bg-slate-900/50 hover:bg-slate-900 border border-slate-700/50 hover:border-cyan-500/50 rounded-lg transition-all group">
              <div className="text-2xl mb-2">📊</div>
              <div className="text-sm font-medium text-slate-300 group-hover:text-cyan-400">Xem báo cáo</div>
            </button>
            <button className="p-4 bg-slate-900/50 hover:bg-slate-900 border border-slate-700/50 hover:border-cyan-500/50 rounded-lg transition-all group">
              <div className="text-2xl mb-2">⚙️</div>
              <div className="text-sm font-medium text-slate-300 group-hover:text-cyan-400">Cấu hình hệ thống</div>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
