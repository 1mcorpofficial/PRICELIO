import { create } from 'zustand';
import { apiRequest } from '../lib/http';
import type { DemoSessionState } from '../types/contracts';

const STORAGE_KEY = 'pricelio_demo_v2';

type DemoStore = DemoSessionState & {
  hydrate: () => void;
  startDemo: () => Promise<boolean>;
  markWin: () => void;
  claimDemo: () => Promise<boolean>;
  clear: () => void;
};

type DemoStartResponse = {
  demo_token: string;
  expires_at: string;
  preview_reward: {
    xp: number;
    points: number;
    mission_unlock_level?: number;
  };
};

function persist(state: DemoSessionState) {
  sessionStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      status: state.status,
      token: state.token,
      expiresAt: state.expiresAt,
      rewardPreview: state.rewardPreview,
      claimed: state.claimed
    })
  );
}

export const useDemoStore = create<DemoStore>((set, get) => ({
  status: 'idle',
  token: null,
  expiresAt: null,
  rewardPreview: null,
  claimed: false,
  error: null,
  hydrate: () => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw) as Partial<DemoSessionState>;
      if (data.expiresAt && new Date(data.expiresAt).getTime() <= Date.now()) {
        set({ status: 'expired', token: null, expiresAt: null, rewardPreview: null, claimed: false, error: null });
        sessionStorage.removeItem(STORAGE_KEY);
        return;
      }
      set({
        status: data.status || 'idle',
        token: data.token || null,
        expiresAt: data.expiresAt || null,
        rewardPreview: data.rewardPreview || null,
        claimed: Boolean(data.claimed),
        error: null
      });
    } catch {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  },
  startDemo: async () => {
    set({ status: 'loading', error: null });
    try {
      const payload = await apiRequest<DemoStartResponse>('/demo/session/start', {
        method: 'POST',
        body: {
          session_id: sessionStorage.getItem('pricelio_session_id') || undefined,
          metadata: { surface: 'web_demo' }
        }
      });
      const next: DemoSessionState = {
        status: 'started',
        token: payload.demo_token,
        expiresAt: payload.expires_at,
        rewardPreview: payload.preview_reward,
        claimed: false,
        error: null
      };
      set(next);
      persist(next);
      return true;
    } catch (error) {
      set({ status: 'error', error: error instanceof Error ? error.message : 'Demo start failed' });
      return false;
    }
  },
  markWin: () => {
    const next: DemoSessionState = {
      ...get(),
      status: 'won',
      error: null
    };
    set(next);
    persist(next);
  },
  claimDemo: async () => {
    const token = get().token;
    if (!token) return false;
    try {
      await apiRequest('/demo/session/claim', {
        method: 'POST',
        body: { demo_token: token }
      });
      const next: DemoSessionState = {
        status: 'claimed',
        token: null,
        expiresAt: null,
        rewardPreview: get().rewardPreview,
        claimed: true,
        error: null
      };
      set(next);
      persist(next);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Demo claim failed';
      if (message.includes('expired')) {
        set({ status: 'expired', error: message });
      } else {
        set({ status: 'error', error: message });
      }
      return false;
    }
  },
  clear: () => {
    set({ status: 'idle', token: null, expiresAt: null, rewardPreview: null, claimed: false, error: null });
    sessionStorage.removeItem(STORAGE_KEY);
  }
}));
