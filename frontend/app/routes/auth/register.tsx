import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { apiClient } from "~/lib/apiClient";
import { useUIStore } from "~/stores/useUIStore";

export default function RegisterPage() {
  const navigate = useNavigate();
  const addToast = useUIStore((state) => state.addToast);
  
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    fullName: "",
    phoneNumber: "",
    role: "candidate" as "candidate" | "hr",
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      addToast({
        type: "error",
        message: "Mật khẩu xác nhận không khớp!",
      });
      return;
    }

    setIsLoading(true);

    try {
      await apiClient.post("/api/Auth/register", {
        email: formData.email,
        password: formData.password,
        fullName: formData.fullName,
        phoneNumber: formData.phoneNumber,
        role: formData.role,
      });

      addToast({
        type: "success",
        message: "Đăng ký thành công! Vui lòng đăng nhập.",
      });
      
      navigate("/auth/login");
    } catch (error: any) {
      addToast({
        type: "error",
        message: error.response?.data?.message || "Đăng ký thất bại. Vui lòng thử lại.",
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

        {/* Register Form */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-8">
          <h2 className="text-2xl font-bold text-slate-50 mb-2">Đăng ký tài khoản</h2>
          <p className="text-slate-400 text-sm mb-6">
            Tạo tài khoản mới để bắt đầu
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Role Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Bạn là
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, role: "candidate" })}
                  className={`px-4 py-3 rounded-lg border-2 transition-all ${
                    formData.role === "candidate"
                      ? "border-cyan-500 bg-cyan-500/10 text-cyan-400"
                      : "border-slate-700 bg-slate-900/50 text-slate-400 hover:border-slate-600"
                  }`}
                >
                  <div className="font-medium">Ứng viên</div>
                  <div className="text-xs opacity-75">Tìm việc làm</div>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, role: "hr" })}
                  className={`px-4 py-3 rounded-lg border-2 transition-all ${
                    formData.role === "hr"
                      ? "border-cyan-500 bg-cyan-500/10 text-cyan-400"
                      : "border-slate-700 bg-slate-900/50 text-slate-400 hover:border-slate-600"
                  }`}
                >
                  <div className="font-medium">Nhà tuyển dụng</div>
                  <div className="text-xs opacity-75">Tuyển nhân sự</div>
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-slate-300 mb-2">
                Họ và tên
              </label>
              <input
                id="fullName"
                type="text"
                required
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                placeholder="Nguyễn Văn A"
              />
            </div>

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
              <label htmlFor="phoneNumber" className="block text-sm font-medium text-slate-300 mb-2">
                Số điện thoại
              </label>
              <input
                id="phoneNumber"
                type="tel"
                required
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                placeholder="0912345678"
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
                minLength={8}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                placeholder="••••••••"
              />
              <p className="text-xs text-slate-500 mt-1">Tối thiểu 8 ký tự</p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-300 mb-2">
                Xác nhận mật khẩu
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-4 py-3 bg-cyan-500 hover:bg-cyan-600 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium rounded-lg transition-colors"
            >
              {isLoading ? "Đang đăng ký..." : "Đăng ký"}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-700/50">
            <p className="text-center text-slate-400 text-sm">
              Đã có tài khoản?{" "}
              <Link to="/auth/login" className="text-cyan-400 hover:text-cyan-300 font-medium">
                Đăng nhập
              </Link>
            </p>
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
