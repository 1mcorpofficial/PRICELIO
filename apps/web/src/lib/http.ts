import { API_BASE, getCsrfToken } from './env';
import { useAuthStore } from '../stores/authStore';

type ApiOptions = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  formData?: FormData;
  skipRefresh?: boolean;
};

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status = 0, data: unknown = null) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

export async function apiRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const method = (options.method || 'GET').toUpperCase();
  const token = useAuthStore.getState().session.accessToken;
  const headers: Record<string, string> = {
    ...(options.headers || {})
  };

  if (!options.formData) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const csrf = getCsrfToken();
    if (csrf) {
      headers['X-CSRF-Token'] = csrf;
    }
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    credentials: 'include',
    headers,
    body: options.formData
      ? options.formData
      : options.body != null
        ? JSON.stringify(options.body)
        : undefined
  });

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    if (response.status === 401 && !options.skipRefresh && !path.startsWith('/auth/')) {
      const refreshed = await useAuthStore.getState().refreshSession();
      if (refreshed) {
        return apiRequest<T>(path, { ...options, skipRefresh: true });
      }
    }

    const message =
      (payload as { error?: { message?: string; code?: string } | string; message?: string } | null)?.error &&
      typeof (payload as { error?: unknown }).error === 'object'
        ? ((payload as { error?: { message?: string; code?: string } }).error?.message ||
          (payload as { error?: { message?: string; code?: string } }).error?.code ||
          `Request failed (${response.status})`)
        : ((payload as { error?: string; message?: string } | null)?.error ||
          (payload as { message?: string } | null)?.message ||
          `Request failed (${response.status})`);

    throw new ApiError(String(message), response.status, payload);
  }

  return payload as T;
}
