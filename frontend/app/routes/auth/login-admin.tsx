import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { IconEye, IconEyeOff, IconShieldCheck } from "@tabler/icons-react";
import { Field, Input, Button } from "~/components/ui";
import { useLogin } from "~/features/auth/hooks/useLogin";
import { useUIStore } from "~/stores/useUIStore";

export default function LoginAdminPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const login = useLogin();
  const showToast = useUIStore((s) => s.showToast);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const validate = () => {
    const next: typeof errors = {};
    if (!email.trim()) next.email = "Vui lòng nhập email quản trị.";
    if (!password) next.password = "Vui lòng nhập mật khẩu.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    login.mutate(
      { email: email.trim(), password },
      {
        onError: (error) => showToast(error.message, "error"),
        onSuccess: (data) => {
          // Kiểm tra role phải là admin
          const role = (data.role || "").toLowerCase();
          if (!role.includes("admin")) {
            showToast("Tài khoản không có quyền quản trị hệ thống.", "error");
            return;
          }
          
          const returnTo = searchParams.get("returnTo");
          if (returnTo?.startsWith("/admin")) {
            navigate(returnTo, { replace: true });
          } else {
            navigate("/admin/dashboard", { replace: true });
          }
        },
      },
    );
  };

  return (
    <div>
      {/* Header với icon shield */}
      <div className="mb-6 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 shadow-lg shadow-orange-500/30">
          <IconShieldCheck size={32} stroke={2} className="text-white" />
        </div>
        <h1 className="text-2xl font-bold text-ink">Đăng nhập Quản trị</h1>
        <p className="mt-1 text-label-sm text-ink-muted">Khu vực dành cho Quản trị viên hệ thống</p>
      </div>

      {/* Alert cảnh báo */}
      <div className="mb-6 rounded-lg border border-orange-500/30 bg-orange-500/5 p-4">
        <div className="flex gap-3">
          <IconShieldCheck size={20} className="mt-0.5 shrink-0 text-orange-600" />
          <div className="flex-1 text-label-sm text-ink-variant">
            <p className="font-semibold text-orange-800">Khu vực bảo mật cao</p>
            <p className="mt-1 text-orange-700">Chỉ dành cho quản trị viên được ủy quyền. Mọi hoạt động đều được ghi lại.</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <Field label="Email quản trị" htmlFor="admin-email" error={errors.email} required>
          <Input
            id="admin-email"
            type="email"
            inputSize="md"
            autoComplete="email"
            placeholder="admin@futurecv.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>

        <Field label="Mật khẩu" htmlFor="admin-password" error={errors.password} required>
          <div className="relative">
            <Input
              id="admin-password"
              type={showPassword ? "text" : "password"}
              inputSize="md"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pr-12"
            />
            <button
              type="button"
              aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-muted transition-colors hover:text-navy"
              onClick={() => setShowPassword((v) => !v)}
            >
              {showPassword ? <IconEyeOff size={18} stroke={1.6} /> : <IconEye size={18} stroke={1.6} />}
            </button>
          </div>
        </Field>

        <button
          type="submit"
          disabled={login.isPending}
          className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-default bg-gradient-to-r from-orange-500 to-red-600 px-4 font-bold text-white shadow-lg shadow-orange-500/30 transition-all hover:shadow-xl hover:shadow-orange-500/40 active:scale-[0.98] disabled:opacity-50"
        >
          <IconShieldCheck size={20} stroke={2} />
          <span className="font-bold">{login.isPending ? "Đang xác thực..." : "Đăng nhập với quyền Admin"}</span>
        </button>
      </form>

      {/* Demo credentials */}
      <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Tài khoản demo</p>
        <div className="space-y-1 text-sm text-slate-700">
          <p><span className="font-semibold">Email:</span> admin@futurecv.com</p>
          <p><span className="font-semibold">Password:</span> Admin@123</p>
        </div>
      </div>

      {/* Back to main site */}
      <div className="mt-6 border-t border-border-strong pt-6 text-center">
        <p className="text-label-sm text-ink-variant">
          <Link to="/login" className="font-semibold text-navy hover:underline">
            ← Quay lại trang đăng nhập thông thường
          </Link>
        </p>
      </div>
    </div>
  );
}
