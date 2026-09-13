import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router";
import { IconEye, IconEyeOff } from "@tabler/icons-react";
import { Field, Input, Button } from "~/components/ui";
import { useResetPassword } from "~/features/auth/hooks";
import { useUIStore } from "~/stores/useUIStore";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const resetPassword = useResetPassword();
  const showToast = useUIStore((s) => s.showToast);

  const token = searchParams.get("token") ?? "";
  const email = searchParams.get("email") ?? "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<{ newPassword?: string; confirmPassword?: string }>({});

  const validate = () => {
    const next: typeof errors = {};
    if (!newPassword) {
      next.newPassword = "Vui lòng nhập mật khẩu mới.";
    } else if (newPassword.length < 8) {
      next.newPassword = "Mật khẩu cần ít nhất 8 ký tự.";
    }
    if (confirmPassword !== newPassword) {
      next.confirmPassword = "Mật khẩu xác nhận không khớp.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!token || !email) {
      showToast("Link đặt lại mật khẩu không hợp lệ.", "error");
      return;
    }
    if (!validate()) return;
    resetPassword.mutate({ token, email, newPassword, confirmPassword });
  };

  return (
    <div>
      <div className="mb-10">
        <h1 className="text-headline text-ink">Đặt lại mật khẩu</h1>
        <p className="mt-2 text-ink-variant">Nhập mật khẩu mới cho tài khoản của bạn.</p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <Field
          label="Mật khẩu mới"
          htmlFor="new-password"
          error={errors.newPassword}
          hint="Tối thiểu 8 ký tự"
          required
        >
          <div className="relative">
            <Input
              id="new-password"
              type={showNewPassword ? "text" : "password"}
              inputSize="md"
              autoComplete="new-password"
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="pr-11"
            />
            <button
              type="button"
              aria-label={showNewPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted transition-colors hover:text-navy"
              onClick={() => setShowNewPassword((v) => !v)}
            >
              {showNewPassword ? <IconEyeOff size={18} stroke={1.6} /> : <IconEye size={18} stroke={1.6} />}
            </button>
          </div>
        </Field>

        <Field label="Xác nhận mật khẩu" htmlFor="confirm-password" error={errors.confirmPassword} required>
          <div className="relative">
            <Input
              id="confirm-password"
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

        <Button
          type="submit"
          variant="primary"
          size="md"
          disabled={resetPassword.isPending}
          className="mt-1 h-10 w-full font-bold text-white shadow-sm"
        >
          {resetPassword.isPending ? "Đang đặt lại..." : "Đặt lại mật khẩu"}
        </Button>
      </form>

      <p className="mt-5 text-center text-label-sm text-ink-variant">
        <Link to="/login" className="font-semibold text-navy underline decoration-gold hover:text-gold">
          Quay lại đăng nhập
        </Link>
      </p>
    </div>
  );
}
