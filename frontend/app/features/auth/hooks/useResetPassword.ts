import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { authApi } from "~/services/api";
import { useAuthStore } from "~/stores/useAuthStore";
import { useUIStore } from "~/stores/useUIStore";
import type { ResetPasswordDto } from "~/types/api";

export function useResetPassword() {
  const navigate = useNavigate();
  const showToast = useUIStore((s) => s.showToast);

  return useMutation({
    mutationFn: (dto: ResetPasswordDto) => authApi.resetPassword(dto),
    onSuccess: () => {
      showToast("Đặt lại mật khẩu thành công. Vui lòng đăng nhập.", "success");
      navigate("/login", { replace: true });
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });
}
