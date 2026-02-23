import { describe, expect, it } from 'vitest';
import { useGamificationStore } from './gamificationStore';

describe('gamificationStore', () => {
  it('applies xp and points delta', () => {
    useGamificationStore.setState({
      profile: {
        spendable_points: 100,
        lifetime_xp: 450,
        rank: { level: 1, min_xp: 0, rank_name: 'Window Shopper', tier: 'bronze' }
      },
      ranks: [
        { level: 1, min_xp: 0, rank_name: 'Window Shopper', tier: 'bronze' },
        { level: 2, min_xp: 500, rank_name: 'Receipt Rookie', tier: 'bronze' }
      ],
      loading: false
    });

    useGamificationStore.getState().applyXpDelta(100, 25);

    expect(useGamificationStore.getState().profile?.lifetime_xp).toBe(550);
    expect(useGamificationStore.getState().profile?.spendable_points).toBe(125);
    expect(useGamificationStore.getState().profile?.rank?.level).toBe(2);
  });
});
