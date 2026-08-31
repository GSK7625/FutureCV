import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { authService } from "../services/authService";
import { useAuthStore, type Role } from "~/stores/useAuthStore";
import { useUIStore } from "~/stores/useUIStore";

function applySession(result: { accessToken: string; refreshToken: string; role: Role }) {
  useAuthStore.getState().setSession({
    user: {
      id: "",
      email: "",
      fullName: "",
      role: result.role,
    },
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
  });
}

export function useLogin() {
  const navigate = useNavigate();
  const showToast = useUIStore((s) => s.showToast);

  return useMutation({
    mutationFn: (input: { email: string; password: string }) =>
      authService().login(input),
    onSuccess: (result) => {
      applySession(result);
      showToast("Đăng nhập thành công", "success");
      const role = useAuthStore.getState().user?.role;
      navigate(role === "candidate" ? "/candidate" : "/", { replace: true });
    },
  });
}
