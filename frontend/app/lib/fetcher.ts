import { useAuthStore } from "~/stores/useAuthStore";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:5000";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

interface FetchOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  auth?: boolean;
}

export async function fetcher<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { body, auth = false, headers, ...rest } = options;

  const requestHeaders: Record<string, string> = {
    ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    ...((headers as Record<string, string>) ?? {}),
  };

  if (auth) {
    const accessToken = useAuthStore.getState().accessToken;
    if (accessToken) {
      requestHeaders.Authorization = `Bearer ${accessToken}`;
    }
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: requestHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    let message = `Yêu cầu thất bại (${response.status})`;
    try {
      const data = await response.json();
      if (data?.message) message = data.message;
      if (data?.errors) {
        const first = Object.values(data.errors).flat()[0];
        if (typeof first === "string") message = first;
      }
    } catch {
      // giữ message mặc định
    }
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export { API_BASE };
