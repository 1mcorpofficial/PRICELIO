import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useDemoStore } from './demoStore';

vi.mock('../lib/http', () => ({
  apiRequest: vi.fn()
}));

import { apiRequest } from '../lib/http';

describe('demoStore', () => {
  beforeEach(() => {
    sessionStorage.clear();
    useDemoStore.setState({
      status: 'idle',
      token: null,
      expiresAt: null,
      rewardPreview: null,
      claimed: false,
      error: null
    });
    vi.clearAllMocks();
  });

  it('starts demo and persists token', async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce({
      demo_token: 'abc',
      expires_at: new Date(Date.now() + 60_000).toISOString(),
      preview_reward: { xp: 50, points: 50 }
    });

    const ok = await useDemoStore.getState().startDemo();

    expect(ok).toBe(true);
    expect(useDemoStore.getState().token).toBe('abc');
    expect(sessionStorage.getItem('pricelio_demo_v2')).toContain('abc');
  });
});
