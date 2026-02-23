import { create } from 'zustand';
import { apiRequest } from '../lib/http';

type Mission = {
  id: string;
  title: string;
  description?: string;
  reward_points: number;
  status: string;
  ends_at?: string;
  store_chain?: string;
};

type MissionsStore = {
  missions: Mission[];
  loading: boolean;
  load: () => Promise<void>;
  updateMissionFromRealtime: (missionId: string) => void;
};

export const useMissionsStore = create<MissionsStore>((set, get) => ({
  missions: [],
  loading: false,
  load: async () => {
    set({ loading: true });
    try {
      const missions = await apiRequest<Mission[]>('/missions/nearby?limit=30');
      set({ missions, loading: false });
    } catch {
      set({ loading: false });
    }
  },
  updateMissionFromRealtime: (missionId) => {
    set({
      missions: get().missions.map((mission) =>
        mission.id === missionId
          ? { ...mission, status: 'verified' }
          : mission
      )
    });
  }
}));
