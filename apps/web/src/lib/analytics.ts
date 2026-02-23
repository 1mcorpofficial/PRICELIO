import { apiRequest } from './http';

type UiEventName =
  | 'lp_viewed'
  | 'lp_try_demo_click'
  | 'demo_scan_click'
  | 'demo_micro_win_seen'
  | 'auth_register_submit'
  | 'auth_register_success'
  | 'demo_claim_success'
  | 'first_receipt_scan_started'
  | 'first_receipt_scan_done';

export async function trackUiEvent(eventName: UiEventName, metadata: Record<string, unknown> = {}): Promise<void> {
  try {
    await apiRequest<{ ok: boolean }>('/events/ui', {
      method: 'POST',
      body: {
        event_name: eventName,
        metadata,
        session_id: sessionStorage.getItem('pricelio_session_id') || undefined
      }
    });
  } catch {
    // Silent by design for funnel tracking.
  }
}
