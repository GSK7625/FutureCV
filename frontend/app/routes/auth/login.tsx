import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useAuthStore } from "~/stores/useAuthStore";
import { useUIStore } from "~/stores/useUIStore";

export default function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const addToast = useUIStore((state) => state.addToast);
  
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await login(formData.email, formData.password);
      addToast({
        type: "success",
        message: "Đăng nhập thành công!",
      });
      
      const user = useAuthStore.getState().user;
      // Map employer role to hr routes
      const dashboardPath = user?.role === 'employer' ? '/hr/dashboard' : `/${user?.role}/dashboard`;
      navigate(dashboardPath);
    } catch (error: any) {
      addToast({
        type: "error",
        message: error.message || "Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <Link to="/" className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold">FC</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-50">FutureCV</h1>
        </Link>

        {/* Login Form */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-8">
          <h2 className="text-2xl font-bold text-slate-50 mb-2">Đăng nhập</h2>
          <p className="text-slate-400 text-sm mb-6">
            Nhập thông tin để truy cập hệ thống
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
                Mật khẩu
              </label>
              <input
                id="password"
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                placeholder="••••••••"
              />
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-slate-600 bg-slate-900/50 text-cyan-500 focus:ring-2 focus:ring-cyan-500"
                />
                <span>Ghi nhớ đăng nhập</span>
              </label>
              <a href="#" className="text-cyan-400 hover:text-cyan-300">
                Quên mật khẩu?
              </a>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-4 py-3 bg-cyan-500 hover:bg-cyan-600 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium rounded-lg transition-colors"
            >
              {isLoading ? "Đang đăng nhập..." : "Đăng nhập"}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-700/50">
            <p className="text-center text-slate-400 text-sm">
              Chưa có tài khoản?{" "}
              <Link to="/auth/register" className="text-cyan-400 hover:text-cyan-300 font-medium">
                Đăng ký ngay
              </Link>
            </p>
          </div>

          {/* Quick Login Hint */}
          <div className="mt-6 p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
            <p className="text-xs text-cyan-400 font-medium mb-2">💡 Tài khoản demo:</p>
            <div className="space-y-1 text-xs text-slate-400">
              <p>Admin: admin@futurecv.com / Admin@123456</p>
              <p>Employer: employer@test.com / Test@123456</p>
            </div>
          </div>
        </div>

        <p className="text-center text-slate-500 text-sm mt-6">
          <Link to="/" className="hover:text-slate-400">
            ← Quay lại trang chủ
          </Link>
        </p>
      </div>
    </div>
  );
}
