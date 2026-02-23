export type Lang = 'lt' | 'en';

export type AuthSession = {
  accessToken: string;
  user: {
    id: string;
    email: string;
  } | null;
};

export type DemoStatus = 'idle' | 'loading' | 'started' | 'won' | 'claimed' | 'expired' | 'error';

export type DemoSessionState = {
  status: DemoStatus;
  token: string | null;
  expiresAt: string | null;
  rewardPreview: {
    xp: number;
    points: number;
    mission_unlock_level?: number;
  } | null;
  claimed: boolean;
  error: string | null;
};

export type RealtimeXpAwardedEvent = {
  event_id?: string;
  type: 'xp_awarded';
  user_id: string;
  source?: string;
  xp_delta: number;
  points_delta: number;
  occurred_at: string;
};

export type RealtimeMissionExpiringEvent = {
  event_id?: string;
  type: 'mission_expiring';
  user_id: string;
  mission_id: string;
  title?: string;
  ends_at: string;
  occurred_at: string;
};

export type RealtimeMissionVerifiedEvent = {
  event_id?: string;
  type: 'mission_verified';
  user_id: string;
  mission_id: string;
  submission_id: string;
  vote: 'confirm' | 'reject';
  occurred_at: string;
};

export type RealtimeReceiptProcessedEvent = {
  event_id?: string;
  type: 'receipt_processed';
  user_id: string;
  receipt_id: string;
  status: string;
  occurred_at: string;
};

export type RealtimePriceDropEvent = {
  event_id?: string;
  type: 'price_drop';
  product_id: string | null;
  store_chain: string | null;
  old_price: number | null;
  new_price: number | null;
  drop_percent: number | null;
  occurred_at: string;
};

export type RealtimeHeartbeatEvent = {
  event_id?: string;
  type: 'heartbeat';
  timestamp: string;
};

export type RealtimeEvent =
  | RealtimeXpAwardedEvent
  | RealtimeMissionExpiringEvent
  | RealtimeMissionVerifiedEvent
  | RealtimeReceiptProcessedEvent
  | RealtimePriceDropEvent
  | RealtimeHeartbeatEvent;
