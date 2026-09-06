import { redirect } from 'react-router';
import { useAuthStore } from '~/stores/useAuthStore';

/**
 * Guard để kiểm tra role của user
 * Nếu user chưa đăng nhập hoặc không có quyền, redirect về trang login
 */
export function requireRole(allowedRoles: string[]) {
  const { user, isAuthenticated } = useAuthStore.getState();

  // Chưa đăng nhập -> redirect về login
  if (!isAuthenticated || !user) {
    throw redirect('/auth/login');
  }

  // Kiểm tra role
  if (!allowedRoles.includes(user.role)) {
    // Không có quyền -> redirect về dashboard của role hiện tại
    throw redirect(`/${user.role}/dashboard`);
  }
}
