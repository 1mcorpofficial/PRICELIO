import { useEffect } from 'react';
import { connectRealtimeStream } from '../lib/realtime';
import { useAuthStore } from '../stores/authStore';
import { useGamificationStore } from '../stores/gamificationStore';
import { useMissionsStore } from '../stores/missionsStore';
import { useUiStore } from '../stores/uiStore';
import type { RealtimeEvent } from '../types/contracts';

export function useRealtimeEvents() {
  const accessToken = useAuthStore((state) => state.session.accessToken);

  useEffect(() => {
    if (!accessToken) return undefined;

    const off = connectRealtimeStream(accessToken, (event: RealtimeEvent) => {
      if (event.type === 'xp_awarded') {
        useGamificationStore.getState().applyXpDelta(event.xp_delta, event.points_delta);
        useUiStore.getState().pushToast(`+${event.xp_delta} XP`, 'success');
      }

      if (event.type === 'mission_verified') {
        useMissionsStore.getState().updateMissionFromRealtime(event.mission_id);
        useUiStore.getState().pushToast('Mission verified', 'success');
      }

      if (event.type === 'mission_expiring') {
        useUiStore.getState().pushToast('Mission expires soon', 'warning');
      }

      if (event.type === 'receipt_processed') {
        useUiStore.getState().pushToast('Receipt processed', 'info');
      }
    });

    return () => off();
  }, [accessToken]);
}
