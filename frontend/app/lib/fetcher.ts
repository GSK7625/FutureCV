import axios, { AxiosError, type AxiosRequestConfig } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

// Tạo axios instance với cấu hình mặc định
export const fetcher = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds
});

// Request interceptor - tự động thêm token vào header
fetcher.interceptors.request.use(
  (config) => {
    // Lấy token từ localStorage (zustand persist lưu vào key 'auth-storage')
    const authStorage = localStorage.getItem('auth-storage');
    if (authStorage) {
      try {
        const { state } = JSON.parse(authStorage);
        if (state?.token) {
          config.headers.Authorization = `Bearer ${state.token}`;
        }
      } catch (error) {
        console.error('Failed to parse auth storage:', error);
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - xử lý lỗi chung
fetcher.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Xử lý lỗi 401 Unauthorized - redirect về login
    if (error.response?.status === 401) {
      localStorage.removeItem('auth-storage');
      window.location.href = '/auth/login';
    }
    return Promise.reject(error);
  }
);

// Helper function cho GET request
export async function get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const response = await fetcher.get<T>(url, config);
  return response.data;
}

// Helper function cho POST request
export async function post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const response = await fetcher.post<T>(url, data, config);
  return response.data;
}

// Helper function cho PUT request
export async function put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const response = await fetcher.put<T>(url, data, config);
  return response.data;
}

// Helper function cho DELETE request
export async function del<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const response = await fetcher.delete<T>(url, config);
  return response.data;
}

// Helper function cho PATCH request
export async function patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const response = await fetcher.patch<T>(url, data, config);
  return response.data;
}
