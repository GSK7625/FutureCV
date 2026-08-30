import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { authService } from "../services/authService";
import { useAuthStore } from "~/stores/useAuthStore";
import { useUIStore } from "~/stores/useUIStore";

export function useRegister() {
  const navigate = useNavigate();
  const showToast = useUIStore((s) => s.showToast);

  return useMutation({
    mutationFn: (input: { email: string; password: string; confirmPassword: string; fullName: string }) =>
      authService().registerCandidate(input),
    onSuccess: (result) => {
      useAuthStore.getState().setSession({
        user: { id: "", email: "", fullName: "", role: result.role },
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
      showToast("Đăng ký tài khoản thành công", "success");
      navigate("/candidate", { replace: true });
    },
  });
}
