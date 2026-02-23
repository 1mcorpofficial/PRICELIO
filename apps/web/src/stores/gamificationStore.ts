import { create } from 'zustand';
import { apiRequest } from '../lib/http';

type RankLevel = {
  level: number;
  rank_name: string;
  tier: string;
  min_xp: number;
};

type GamificationProfile = {
  spendable_points: number;
  lifetime_xp: number;
  rank: RankLevel | null;
};

type GamificationStore = {
  profile: GamificationProfile | null;
  ranks: RankLevel[];
  loading: boolean;
  load: () => Promise<void>;
  applyXpDelta: (xpDelta: number, pointsDelta: number) => void;
};

export const useGamificationStore = create<GamificationStore>((set, get) => ({
  profile: null,
  ranks: [],
  loading: false,
  load: async () => {
    set({ loading: true });
    try {
      const [profile, ranks] = await Promise.all([
        apiRequest<GamificationProfile>('/me/gamification'),
        apiRequest<RankLevel[]>('/ranks')
      ]);
      set({ profile, ranks, loading: false });
    } catch {
      set({ loading: false });
    }
  },
  applyXpDelta: (xpDelta, pointsDelta) => {
    const current = get().profile;
    if (!current) return;
    const nextXp = Math.max(0, Number(current.lifetime_xp || 0) + Number(xpDelta || 0));
    const nextPoints = Math.max(0, Number(current.spendable_points || 0) + Number(pointsDelta || 0));
    const nextRank = get().ranks
      .filter((rank) => rank.min_xp <= nextXp)
      .sort((a, b) => b.level - a.level)[0] || current.rank;
    set({
      profile: {
        ...current,
        lifetime_xp: nextXp,
        spendable_points: nextPoints,
        rank: nextRank || current.rank
      }
    });
  }
}));
