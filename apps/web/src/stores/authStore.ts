import { create } from 'zustand';
import { API_BASE, getCsrfToken } from '../lib/env';
import type { AuthSession } from '../types/contracts';

type Credentials = { email: string; password: string };

type AuthStore = {
  session: AuthSession;
  status: 'idle' | 'loading' | 'authenticated' | 'guest';
  error: string | null;
  initDone: boolean;
  register: (input: Credentials) => Promise<boolean>;
  login: (input: Credentials) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  bootstrap: () => Promise<void>;
  clearError: () => void;
};

async function authFetch(path: string, body?: unknown, method = 'POST') {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  const csrf = getCsrfToken();
  if (csrf) {
    headers['X-CSRF-Token'] = csrf;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    credentials: 'include',
    body: body != null ? JSON.stringify(body) : undefined
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      payload?.error?.message || payload?.error?.code || payload?.error || payload?.message || `Request failed (${response.status})`;
    throw new Error(String(message));
  }
  return payload;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  session: {
    accessToken: '',
    user: null
  },
  status: 'idle',
  error: null,
  initDone: false,
  clearError: () => set({ error: null }),
  register: async ({ email, password }) => {
    set({ status: 'loading', error: null });
    try {
      const payload = await authFetch('/auth/register', { email, password });
      set({
        session: {
          accessToken: String(payload?.access_token || ''),
          user: payload?.user || null
        },
        status: 'authenticated',
        error: null
      });
      return true;
    } catch (error) {
      set({ status: 'guest', error: error instanceof Error ? error.message : 'Registration failed' });
      return false;
    }
  },
  login: async ({ email, password }) => {
    set({ status: 'loading', error: null });
    try {
      const payload = await authFetch('/auth/login', { email, password });
      set({
        session: {
          accessToken: String(payload?.access_token || ''),
          user: payload?.user || null
        },
        status: 'authenticated',
        error: null
      });
      return true;
    } catch (error) {
      set({ status: 'guest', error: error instanceof Error ? error.message : 'Login failed' });
      return false;
    }
  },
  logout: async () => {
    try {
      await authFetch('/auth/logout', {});
    } catch {
      // local cleanup anyway
    }
    set({
      session: {
        accessToken: '',
        user: null
      },
      status: 'guest',
      error: null
    });
  },
  refreshSession: async () => {
    try {
      const payload = await authFetch('/auth/refresh', {});
      if (!payload?.access_token) {
        set({
          session: { accessToken: '', user: null },
          status: 'guest'
        });
        return false;
      }
      set({
        session: {
          accessToken: String(payload.access_token),
          user: payload.user || null
        },
        status: 'authenticated',
        error: null
      });
      return true;
    } catch {
      set({
        session: { accessToken: '', user: null },
        status: 'guest'
      });
      return false;
    }
  },
  bootstrap: async () => {
    if (get().initDone) return;
    const ok = await get().refreshSession();
    set({
      initDone: true,
      status: ok ? 'authenticated' : 'guest'
    });
  }
}));
