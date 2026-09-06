import { QueryClient } from '@tanstack/react-query';

/**
 * TanStack Query Client configuration
 * 
 * Default options:
 * - Không refetch khi window focus để tránh request thừa
 * - Không retry nếu request fail (trừ network error)
 * - Cache data trong 5 phút
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 phút
      gcTime: 1000 * 60 * 10, // 10 phút (trước đây là cacheTime)
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: (failureCount, error: any) => {
        // Chỉ retry nếu là network error, không retry nếu là 4xx/5xx
        if (error?.response?.status) {
          return false;
        }
        return failureCount < 2;
      },
    },
    mutations: {
      retry: false,
    },
  },
});
