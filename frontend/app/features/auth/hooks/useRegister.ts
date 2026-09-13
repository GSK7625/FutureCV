import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { authService } from "../services/authService";
import { useAuthStore } from "~/stores/useAuthStore";
import { useUIStore } from "~/stores/useUIStore";
import { normalizeRole } from "./useLogin";

export function useRegister() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const showToast = useUIStore((s) => s.showToast);

  return useMutation({
    mutationFn: (input: { email: string; password: string; confirmPassword: string; fullName: string }) =>
      authService().registerCandidate(input),
    onSuccess: (result, variables) => {
      // Xóa cache cũ trước khi đăng ký phiên mới
      queryClient.removeQueries({ type: "all" });
      const role = normalizeRole(result.role);
      useAuthStore.getState().setSession({
        user: {
          id: result.id ?? result.user?.id ?? "",
          email: result.email ?? result.user?.email ?? variables.email,
          fullName: result.fullName ?? result.user?.fullName ?? variables.fullName,
          role,
        },
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
      showToast("Đăng ký tài khoản thành công", "success");
      const targetUrl = role === "candidate" ? "/" : role === "employer" ? "/hr" : role === "admin" ? "/admin" : "/";
      navigate(targetUrl, { replace: true });
    },
  });
}
