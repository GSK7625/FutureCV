import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { IconBrandGoogle, IconBrandFacebook } from "@tabler/icons-react";
import { Field, Input, Button } from "~/components/ui";
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
      <div className="mb-10">
        <h1 className="text-headline text-ink">Đăng ký</h1>
        <p className="mt-2 text-ink-variant">Tạo tài khoản ứng viên miễn phí chỉ với vài bước.</p>
      </div>

      <div className="mb-8 flex flex-col gap-4">
        <Button variant="secondary" size="lg" onClick={() => showToast("Đăng ký Google sẽ ra mắt sớm.", "info")}>
          <IconBrandGoogle size={20} />
          Tiếp tục với Google
        </Button>
        <Button variant="secondary" size="lg" onClick={() => showToast("Đăng ký Facebook sẽ ra mắt sớm.", "info")}>
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
        <Field label="Họ và tên" htmlFor="reg-name" error={errors.fullName} required>
          <Input
            id="reg-name"
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
          hint="Tối thiểu 8 ký tự."
          required
        >
          <Input
            id="reg-password"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>

        <Field label="Xác nhận mật khẩu" htmlFor="reg-confirm" error={errors.confirmPassword} required>
          <Input
            id="reg-confirm"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </Field>

        <Button type="submit" variant="primary" size="lg" disabled={register.isPending} className="mt-2">
          {register.isPending ? "Đang tạo tài khoản..." : "Đăng ký"}
        </Button>
      </form>

      <p className="mt-8 text-center text-ink-variant">
        Bạn đã có tài khoản?{" "}
        <Link to="/login" className="font-semibold text-navy underline decoration-gold hover:text-gold">
          Đăng nhập
        </Link>
      </p>
    </div>
  );
}
