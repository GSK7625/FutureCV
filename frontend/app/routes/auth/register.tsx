import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { IconEye, IconEyeOff, IconBrandGoogle, IconBrandFacebook } from "@tabler/icons-react";
import { Field, Input } from "~/components/ui";
import { useRegister } from "~/features/auth/hooks/useRegister";
import { useUIStore } from "~/stores/useUIStore";

interface FormErrors {
  fullName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export default function RegisterPage() {
  const register = useRegister();
  const showToast = useUIStore((s) => s.showToast);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const validate = () => {
    const next: FormErrors = {};
    if (!fullName.trim()) next.fullName = "Vui lòng nhập họ và tên.";
    if (!email.trim()) {
      next.email = "Vui lòng nhập email.";
    } else if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      next.email = "Email chưa đúng định dạng.";
    }
    if (!password) {
      next.password = "Vui lòng nhập mật khẩu.";
    } else if (password.length < 8) {
      next.password = "Mật khẩu cần ít nhất 8 ký tự.";
    }
    if (confirmPassword !== password) {
      next.confirmPassword = "Mật khẩu xác nhận không khớp.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    register.mutate(
      { fullName: fullName.trim(), email: email.trim(), password, confirmPassword },
      { onError: (error) => showToast(error.message, "error") },
    );
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink">Đăng ký</h1>
        <p className="mt-1 text-label-sm text-ink-muted">Tạo tài khoản ứng viên miễn phí chỉ với vài bước.</p>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={() => showToast("Đăng ký Google sẽ ra mắt sớm.", "info")}
          className="flex h-10 items-center justify-center gap-2 rounded-default bg-navy px-3 text-label-sm font-semibold text-white shadow-sm transition-all hover:bg-navy-secondary active:scale-[0.98]"
        >
          <IconBrandGoogle size={18} />
          Google
        </button>
        <button
          type="button"
          onClick={() => showToast("Đăng ký Facebook sẽ ra mắt sớm.", "info")}
          className="flex h-10 items-center justify-center gap-2 rounded-default bg-[#1877F2] px-3 text-label-sm font-semibold text-white shadow-sm transition-all hover:bg-[#166fe5] active:scale-[0.98]"
        >
          <IconBrandFacebook size={18} />
          Facebook
        </button>
      </div>

      <div className="mb-4 flex items-center gap-3" aria-hidden>
        <div className="h-px flex-1 bg-border-strong" />
        <span className="text-[11px] uppercase tracking-wider text-ink-muted">Hoặc</span>
        <div className="h-px flex-1 bg-border-strong" />
      </div>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
        <Field label="Họ và tên" htmlFor="reg-name" error={errors.fullName} required>
          <Input
            id="reg-name"
            inputSize="md"
            autoComplete="name"
            placeholder="Nguyễn Văn A"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </Field>

        <Field label="Email" htmlFor="reg-email" error={errors.email} required>
          <Input
            id="reg-email"
            type="email"
            inputSize="md"
            autoComplete="email"
            placeholder="ban@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>

        <Field
          label="Mật khẩu"
          htmlFor="reg-password"
          error={errors.password}
          hint="Tối thiểu 8 ký tự"
          required
        >
          <div className="relative">
            <Input
              id="reg-password"
              type={showPassword ? "text" : "password"}
              inputSize="md"
              autoComplete="new-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pr-11"
            />
            <button
              type="button"
              aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted transition-colors hover:text-navy"
              onClick={() => setShowPassword((v) => !v)}
            >
              {showPassword ? <IconEyeOff size={18} stroke={1.6} /> : <IconEye size={18} stroke={1.6} />}
            </button>
          </div>
        </Field>

        <Field label="Xác nhận mật khẩu" htmlFor="reg-confirm" error={errors.confirmPassword} required>
          <div className="relative">
            <Input
              id="reg-confirm"
              type={showConfirmPassword ? "text" : "password"}
              inputSize="md"
              autoComplete="new-password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="pr-11"
            />
            <button
              type="button"
              aria-label={showConfirmPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted transition-colors hover:text-navy"
              onClick={() => setShowConfirmPassword((v) => !v)}
            >
              {showConfirmPassword ? <IconEyeOff size={18} stroke={1.6} /> : <IconEye size={18} stroke={1.6} />}
            </button>
          </div>
        </Field>

        <button
          type="submit"
          disabled={register.isPending}
          className="mt-1 flex h-10 w-full items-center justify-center rounded-default bg-navy px-4 font-bold !text-white shadow-sm transition-all hover:bg-navy-secondary active:scale-[0.98] disabled:opacity-50"
        >
          <span className="font-bold !text-white">{register.isPending ? "Đang tạo tài khoản..." : "Đăng ký"}</span>
        </button>
      </form>

      <p className="mt-5 text-center text-label-sm text-ink-variant">
        Bạn đã có tài khoản?{" "}
        <Link to="/login" className="font-semibold text-navy underline decoration-gold hover:text-gold">
          Đăng nhập
        </Link>
      </p>
    </div>
  );
}
