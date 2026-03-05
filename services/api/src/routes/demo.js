const crypto = require('crypto');
const auth = require('../auth');
const ecosystem = require('../ecosystem');
const sse = require('../sse');
const { query, getClient } = require('../db');
const { ensurePricelioUiTables, trackUiEvent } = require('../helpers/uiEvents');

const DEMO_SESSION_TTL_MS = Number(process.env.DEMO_SESSION_TTL_MS || 30 * 60 * 1000);
const DEMO_PREVIEW_REWARD_XP = Number(process.env.DEMO_PREVIEW_REWARD_XP || 50);
const DEMO_PREVIEW_REWARD_POINTS = Number(process.env.DEMO_PREVIEW_REWARD_POINTS || 50);
const nowIso = () => new Date().toISOString();

function createDemoToken() { return crypto.randomBytes(24).toString('hex'); }
function hashToken(value) { return crypto.createHash('sha256').update(String(value || '')).digest('hex'); }

module.exports = (app) => {
  app.post('/demo/session/start', async (req, res) => {
    try {
      await ensurePricelioUiTables();
      const token = createDemoToken();
      const tokenHash = hashToken(token);
      const expiresAt = new Date(Date.now() + Math.max(60_000, DEMO_SESSION_TTL_MS));
      const sessionId = String(req.body?.session_id || req.get('x-session-id') || '').trim().slice(0, 120) || null;
      const ipHash = crypto.createHash('sha256').update(req.ip || 'unknown').digest('hex');
      await query(
        `INSERT INTO demo_sessions (token_hash, reward_xp, reward_points, expires_at, session_id, user_agent, ip_hash, metadata) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [tokenHash, DEMO_PREVIEW_REWARD_XP, DEMO_PREVIEW_REWARD_POINTS, expiresAt.toISOString(), sessionId, req.get('user-agent') ? String(req.get('user-agent')).slice(0, 255) : null, ipHash, JSON.stringify(req.body?.metadata || {})]
      );
      return res.json({ demo_token: token, expires_at: expiresAt.toISOString(), preview_reward: { xp: DEMO_PREVIEW_REWARD_XP, points: DEMO_PREVIEW_REWARD_POINTS, mission_unlock_level: 1 } });
    } catch (error) {
      return res.status(500).json({ error: 'demo_session_start_failed' });
    }
  });

  app.post('/demo/session/claim', auth.requireUser, async (req, res) => {
    const demoToken = String(req.body?.demo_token || '').trim();
    if (!demoToken) return res.status(400).json({ error: 'demo_token_required' });

    const tokenHash = hashToken(demoToken);
    const client = await getClient();
    try {
      await ensurePricelioUiTables();
      await client.query('BEGIN');
      const found = await client.query(
        `SELECT id, reward_xp, reward_points, expires_at, claimed_at, claimed_by_user_id FROM demo_sessions WHERE token_hash = $1 LIMIT 1 FOR UPDATE`,
        [tokenHash]
      );
      if (!found.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'demo_session_not_found' }); }
      const session = found.rows[0];
      if (session.claimed_at) { await client.query('ROLLBACK'); return res.status(409).json({ error: 'demo_session_already_claimed' }); }
      if (new Date(session.expires_at).getTime() <= Date.now()) { await client.query('ROLLBACK'); return res.status(410).json({ error: 'demo_session_expired' }); }

      await client.query(`UPDATE demo_sessions SET claimed_by_user_id = $2, claimed_at = NOW() WHERE id = $1`, [session.id, req.user.id]);
      await client.query('COMMIT');

      const award = await ecosystem.awardPoints(req.user.id, {
        eventType: 'demo_claim',
        xp: Number(session.reward_xp || DEMO_PREVIEW_REWARD_XP),
        points: Number(session.reward_points || DEMO_PREVIEW_REWARD_POINTS),
        referenceType: 'demo_session',
        referenceId: session.id,
        metadata: { source: 'web_v2_demo' }
      });
      const gamification = await ecosystem.getGamification(req.user.id);

      sse.broadcastUserEvent({
        type: 'xp_awarded', user_id: req.user.id, source: 'demo_claim',
        xp_delta: Number(session.reward_xp || DEMO_PREVIEW_REWARD_XP),
        points_delta: Number(session.reward_points || DEMO_PREVIEW_REWARD_POINTS),
        occurred_at: nowIso()
      }, { userIds: [req.user.id] });

      await trackUiEvent('demo_claim_success', req, { demo_session_id: session.id, xp_delta: Number(session.reward_xp || DEMO_PREVIEW_REWARD_XP), points_delta: Number(session.reward_points || DEMO_PREVIEW_REWARD_POINTS) });

      return res.json({ claimed: true, demo_session_id: session.id, reward: { xp: Number(session.reward_xp || DEMO_PREVIEW_REWARD_XP), points: Number(session.reward_points || DEMO_PREVIEW_REWARD_POINTS) }, award, gamification });
    } catch (error) {
      try { await client.query('ROLLBACK'); } catch (_) {}
      return res.status(500).json({ error: 'demo_session_claim_failed' });
    } finally {
      client.release();
    }
  });
};
