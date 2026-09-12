import { redirect } from "react-router";
import { useAuthStore } from "~/stores/useAuthStore";

/** Guard ngoài component: PHẢI gọi qua `.getState()` (không dùng hook). */
export function requireAuth(returnTo?: string): { user: NonNullable<ReturnType<typeof useAuthStore.getState>["user"]> } | never {
  const { user } = useAuthStore.getState();
  if (!user) {
    // Nếu đang cố truy cập route admin, redirect về login-admin
    const isAdminRoute = returnTo?.startsWith("/admin");
    const loginPath = isAdminRoute ? "/login-admin" : "/login";
    const to = returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : "";
    throw redirect(`${loginPath}${to}`);
  }
  return { user };
}
