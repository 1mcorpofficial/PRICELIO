const { query } = require('../db');
const axios = require('axios');

const ANALYTICS_SERVICE_URL = process.env.ANALYTICS_SERVICE_URL || 'http://127.0.0.1:3004';
const UI_EVENT_ALLOWLIST = new Set([
  'lp_viewed', 'lp_try_demo_click', 'demo_scan_click', 'demo_micro_win_seen',
  'auth_register_submit', 'auth_register_success', 'demo_claim_success',
  'first_receipt_scan_started', 'first_receipt_scan_done'
]);

let pricelioUiTablesEnsured = false;
async function ensurePricelioUiTables() {
  if (pricelioUiTablesEnsured) return;
  await query(`CREATE TABLE IF NOT EXISTS demo_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    token_hash text NOT NULL UNIQUE,
    reward_xp integer NOT NULL DEFAULT 50,
    reward_points integer NOT NULL DEFAULT 50,
    expires_at timestamptz NOT NULL,
    claimed_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
    claimed_at timestamptz,
    session_id text,
    user_agent text,
    ip_hash text,
    metadata jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
  )`);
  await query(`CREATE INDEX IF NOT EXISTS demo_sessions_expiry_idx ON demo_sessions (expires_at DESC)`);
  await query(`CREATE INDEX IF NOT EXISTS demo_sessions_claimed_idx ON demo_sessions (claimed_by_user_id, claimed_at DESC)`);
  await query(`CREATE TABLE IF NOT EXISTS ui_events_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_name text NOT NULL,
    user_id uuid REFERENCES users(id) ON DELETE SET NULL,
    session_id text,
    metadata jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
  )`);
  await query(`CREATE INDEX IF NOT EXISTS ui_events_log_event_created_idx ON ui_events_log (event_name, created_at DESC)`);
  await query(`CREATE INDEX IF NOT EXISTS ui_events_log_user_created_idx ON ui_events_log (user_id, created_at DESC)`);
  pricelioUiTablesEnsured = true;
}

async function publishUiEventToAnalytics(eventName, req, metadata = {}) {
  try {
    await axios.post(`${ANALYTICS_SERVICE_URL}/events/track`, {
      event_name: eventName,
      user_id: req.user?.id || null,
      metadata: { ...metadata, route: req.path, trace_id: req.traceId || null }
    }, { timeout: 2000 });
  } catch (_) {}
}

async function trackUiEvent(eventName, req, metadata = {}) {
  if (!UI_EVENT_ALLOWLIST.has(eventName)) return false;
  await ensurePricelioUiTables();
  try {
    await query(
      `INSERT INTO ui_events_log (event_name, user_id, session_id, metadata, created_at) VALUES ($1, $2, $3, $4, NOW())`,
      [
        eventName,
        req.user?.id || null,
        String(req.body?.session_id || req.get('x-session-id') || req.get('x-demo-session-id') || '').slice(0, 120) || null,
        JSON.stringify(metadata || {})
      ]
    );
  } catch (_) {}
  await publishUiEventToAnalytics(eventName, req, metadata);
  return true;
}

module.exports = { trackUiEvent, ensurePricelioUiTables };
