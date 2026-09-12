import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { authApi } from "~/services/api";
import { useAuthStore } from "~/stores/useAuthStore";
import { useUIStore } from "~/stores/useUIStore";

export function useLogout() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const showToast = useUIStore((s) => s.showToast);
  const { refreshToken, logout } = useAuthStore();

  return useMutation({
    mutationFn: async () => {
      if (refreshToken) {
        try {
          await authApi.logout(refreshToken);
        } catch (error) {
          // Ignore logout API errors, still clear local state
          console.error("Logout API error:", error);
        }
      }
    },
    onSuccess: () => {
      queryClient.clear();
      logout();
      showToast("Đăng xuất thành công", "success");
      navigate("/", { replace: true });
    },
  });
}
