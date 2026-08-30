import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { IconCircleCheck as CircleCheck } from "@tabler/icons-react";
import { Field, Input, Button } from "~/components/ui";
import { authService } from "~/features/auth/services/authService";
import { useUIStore } from "~/stores/useUIStore";

export default function ForgotPasswordPage() {
  const showToast = useUIStore((s) => s.showToast);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string>();
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Vui lòng nhập email.");
      return;
    }
    setError(undefined);
    setSending(true);
    try {
      await authService().forgotPassword({ email: email.trim() });
      setSent(true);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Gửi yêu cầu thất bại.", "error");
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <div className="mb-10">
        <h1 className="text-headline text-ink">Quên mật khẩu</h1>
        <p className="mt-2 text-ink-variant">
          Nhập email đã đăng ký, chúng tôi sẽ gửi hướng dẫn đặt lại mật khẩu.
        </p>
      </div>

      {sent ? (
        <div className="rounded-default border border-border-subtle bg-surface p-8 text-center shadow-surface">
          <CircleCheck size={48} stroke={1.5} className="mx-auto text-success" />
          <h2 className="mt-4 text-headline-md text-navy">Đã gửi email hướng dẫn</h2>
          <p className="mt-2 text-ink-variant">
            Vui lòng kiểm tra hộp thư <strong className="text-navy">{email}</strong> và làm theo hướng
            dẫn. Email có hiệu lực trong 15 phút.
          </p>
          <Link
            to="/login"
            className="mt-6 inline-flex h-11 items-center rounded-default bg-navy px-6 font-semibold text-white transition-colors hover:bg-navy-secondary"
          >
            Quay lại đăng nhập
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
          <Field label="Email" htmlFor="fp-email" error={error} required>
            <Input
              id="fp-email"
              type="email"
              autoComplete="email"
              placeholder="ban@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Button type="submit" variant="primary" size="lg" disabled={sending}>
            {sending ? "Đang gửi..." : "Gửi hướng dẫn"}
          </Button>
        </form>
      )}

      <p className="mt-8 text-center text-ink-variant">
        Bạn chưa có tài khoản?{" "}
        <Link to="/register" className="font-semibold text-navy underline decoration-gold hover:text-gold">
          Đăng ký ngay
        </Link>
      </p>
    </div>
  );
}
