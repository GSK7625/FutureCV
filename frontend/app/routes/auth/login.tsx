import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { IconEye, IconEyeOff, IconBrandGoogle, IconBrandFacebook } from "@tabler/icons-react";
import { Field, Input, Button } from "~/components/ui";
import { useLogin } from "~/features/auth/hooks/useLogin";
import { useUIStore } from "~/stores/useUIStore";

export default function LoginPage() {
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
    if (!email.trim()) next.email = "Vui lòng nhập email hoặc số điện thoại.";
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
        onSuccess: () => {
          const returnTo = searchParams.get("returnTo");
          if (returnTo?.startsWith("/")) navigate(returnTo, { replace: true });
        },
      },
    );
  };

  return (
    <div>
      <div className="mb-10">
        <h1 className="text-headline text-ink">Đăng nhập</h1>
        <p className="mt-2 text-ink-variant">Chào mừng bạn quay trở lại với tương lai sự nghiệp.</p>
      </div>

      <div className="mb-8 flex flex-col gap-4">
        <Button variant="secondary" size="lg" onClick={() => showToast("Đăng nhập Google sẽ ra mắt sớm.", "info")}>
          <IconBrandGoogle size={20} />
          Tiếp tục với Google
        </Button>
        <Button variant="secondary" size="lg" onClick={() => showToast("Đăng nhập Facebook sẽ ra mắt sớm.", "info")}>
          <IconBrandFacebook size={20} />
          Tiếp tục với Facebook
        </Button>
      </div>

      <div className="mb-8 flex items-center gap-4" aria-hidden>
        <div className="h-px flex-1 bg-border-strong" />
        <span className="text-label-sm uppercase text-ink-muted">Hoặc</span>
        <div className="h-px flex-1 bg-border-strong" />
      </div>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
        <Field label="Email" htmlFor="login-email" error={errors.email} required>
          <Input
            id="login-email"
            type="email"
            autoComplete="email"
            placeholder="Nhập email của bạn"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>

        <Field label="Mật khẩu" htmlFor="login-password" error={errors.password} required>
          <div className="relative">
            <Input
              id="login-password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pr-12"
            />
            <button
              type="button"
              aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-muted transition-colors hover:text-navy"
              onClick={() => setShowPassword((v) => !v)}
            >
              {showPassword ? <IconEyeOff size={20} stroke={1.6} /> : <IconEye size={20} stroke={1.6} />}
            </button>
          </div>
        </Field>

        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-label-sm font-semibold text-navy hover:underline">
            Quên mật khẩu?
          </Link>
        </div>

        <Button type="submit" variant="primary" size="lg" disabled={login.isPending} className="mt-2">
          {login.isPending ? "Đang đăng nhập..." : "Đăng nhập"}
        </Button>
      </form>

      <p className="mt-8 text-center text-ink-variant">
        Bạn chưa có tài khoản?{" "}
        <Link to="/register" className="font-semibold text-navy underline decoration-gold hover:text-gold">
          Đăng ký ngay
        </Link>
      </p>
    </div>
  );
}
