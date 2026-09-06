import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiClient } from '~/lib/apiClient';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  
  login: (email: string, password: string) => Promise<void>;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: async (email: string, password: string) => {
        const response = await apiClient.post('/api/Auth/login', {
          email,
          password,
        });

        const { accessToken, refreshToken, role } = response.data;
        
        // Create user object from email and role
        const user: User = {
          id: '', // Will be populated from token claims if needed
          email,
          fullName: email.split('@')[0], // Temporary, should be fetched from profile endpoint
          role: role.toLowerCase(),
        };
        
        set({
          user,
          token: accessToken,
          isAuthenticated: true,
        });

        // Store refresh token separately if needed
        localStorage.setItem('refreshToken', refreshToken);
      },

      setAuth: (user, token) =>
        set({
          user,
          token,
          isAuthenticated: true,
        }),

      logout: () =>
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        }),

      updateUser: (user) =>
        set({ user }),
    }),
    {
      name: 'auth-storage',
    }
  )
);
