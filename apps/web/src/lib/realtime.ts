import { API_BASE } from './env';
import type { RealtimeEvent } from '../types/contracts';

export function connectRealtimeStream(
  accessToken: string,
  onEvent: (event: RealtimeEvent) => void,
  onError?: (error: Event) => void
): () => void {
  if (!accessToken) {
    return () => {};
  }

  const url = new URL(`${API_BASE}/events/user/stream`, window.location.origin);

  const source = new EventSource(url.toString(), { withCredentials: true });

  const forward = (event: MessageEvent<string>) => {
    try {
      const payload = JSON.parse(event.data) as RealtimeEvent;
      onEvent(payload);
    } catch {
      // Ignore malformed packets.
    }
  };

  source.addEventListener('xp_awarded', forward as EventListener);
  source.addEventListener('mission_expiring', forward as EventListener);
  source.addEventListener('mission_verified', forward as EventListener);
  source.addEventListener('receipt_processed', forward as EventListener);
  source.addEventListener('price_drop', forward as EventListener);
  source.addEventListener('heartbeat', forward as EventListener);
  source.onerror = (event) => {
    if (onError) onError(event);
  };

  return () => {
    source.close();
  };
}
