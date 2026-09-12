import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { authApi } from "~/services/api";
import { useAuthStore } from "~/stores/useAuthStore";
import { useUIStore } from "~/stores/useUIStore";
import { normalizeRole } from "./useLogin";
import type { RegisterEmployerDto } from "~/types/api";

export function useRegisterEmployer() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const showToast = useUIStore((s) => s.showToast);

  return useMutation({
    mutationFn: (dto: RegisterEmployerDto) => authApi.registerEmployer(dto),
    onSuccess: (result, variables) => {
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
      showToast("Đăng ký tài khoản nhà tuyển dụng thành công", "success");
      navigate("/hr", { replace: true });
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });
}
