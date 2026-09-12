import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { authApi } from "~/services/api";
import { useAuthStore } from "~/stores/useAuthStore";
import { useUIStore } from "~/stores/useUIStore";
import { normalizeRole } from "./useLogin";
import type { GoogleAuthDto } from "~/types/api";

export function useGoogleAuth() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const showToast = useUIStore((s) => s.showToast);

  return useMutation({
    mutationFn: (dto: GoogleAuthDto) => authApi.googleAuth(dto),
    onSuccess: (result) => {
      queryClient.removeQueries({ type: "all" });
      const role = normalizeRole(result.role);
      useAuthStore.getState().setSession({
        user: {
          id: result.id ?? result.user?.id ?? "",
          email: result.email ?? result.user?.email ?? "",
          fullName: result.fullName ?? result.user?.fullName ?? "",
          role,
        },
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
      showToast("Đăng nhập Google thành công", "success");
      const targetUrl = role === "candidate" ? "/candidate" : role === "employer" ? "/hr" : role === "admin" ? "/admin" : "/";
      navigate(targetUrl, { replace: true });
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });
}
