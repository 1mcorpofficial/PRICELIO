const auth = require('../auth');
const ecosystem = require('../ecosystem');
const sse = require('../sse');
const { withFeatureFlag } = require('../middleware/featureFlags');

const nowIso = () => new Date().toISOString();

module.exports = (app) => {
  app.get('/missions/nearby', auth.requireUser, withFeatureFlag('bounty'), async (req, res) => {
    try {
      const missions = await ecosystem.getNearbyMissions(req.user.id, {
        lat: req.query.lat ? Number(req.query.lat) : null,
        lon: req.query.lon ? Number(req.query.lon) : null,
        limit: req.query.limit ? Number(req.query.limit) : 20,
        app_foreground: req.query.app_foreground !== 'false'
      });
      const nowMs = Date.now();
      const expiring = missions.find((mission) => {
        if (!mission?.ends_at) return false;
        const endsAtMs = new Date(mission.ends_at).getTime();
        return Number.isFinite(endsAtMs) && endsAtMs > nowMs && (endsAtMs - nowMs) <= 2 * 60 * 60 * 1000;
      });
      if (expiring) {
        sse.broadcastUserEvent({ type: 'mission_expiring', user_id: req.user.id, mission_id: expiring.id, title: expiring.title || null, ends_at: expiring.ends_at, occurred_at: nowIso() }, { userIds: [req.user.id] });
      }
      res.json(missions);
    } catch (error) {
      res.status(500).json({ error: 'missions_nearby_failed' });
    }
  });

  app.post('/missions/:id/start', auth.requireUser, withFeatureFlag('bounty'), async (req, res) => {
    try {
      const task = await ecosystem.startMission(req.user.id, req.params.id);
      res.json(task);
    } catch (error) {
      if (error.message === 'mission_unavailable') return res.status(400).json({ error: 'mission_unavailable' });
      res.status(500).json({ error: 'mission_start_failed' });
    }
  });

  app.post('/missions/:id/submit', auth.requireUser, withFeatureFlag('bounty'), async (req, res) => {
    try {
      const payload = req.body || {};
      if (!payload.product_canonical_name || !payload.barcode) return res.status(400).json({ error: 'product_canonical_name_and_barcode_required' });
      const submission = await ecosystem.submitMission(req.user.id, req.params.id, payload);
      res.json(submission);
    } catch (error) {
      if (['shadow_banned', 'mission_not_found'].includes(error.message)) return res.status(403).json({ error: error.message });
      res.status(500).json({ error: 'mission_submit_failed' });
    }
  });

  app.post('/missions/:id/verify', auth.requireUser, withFeatureFlag('bounty'), async (req, res) => {
    try {
      const vote = req.body?.vote;
      const submissionId = req.body?.submission_id;
      if (!submissionId || !['confirm', 'reject'].includes(vote)) return res.status(400).json({ error: 'submission_id_and_vote_required' });
      const result = await ecosystem.verifyMissionSubmission(req.user.id, req.params.id, submissionId, vote);
      sse.broadcastUserEvent({ type: 'mission_verified', user_id: req.user.id, mission_id: req.params.id, submission_id: submissionId, vote, result: result || null, occurred_at: nowIso() }, { userIds: [req.user.id] });
      res.json(result);
    } catch (error) {
      if (['submission_not_found', 'cannot_verify_own_submission'].includes(error.message)) return res.status(400).json({ error: error.message });
      res.status(500).json({ error: 'mission_verify_failed' });
    }
  });

  app.get('/proof/:id/status', auth.requireUser, withFeatureFlag('bounty'), async (req, res) => {
    try {
      const status = await ecosystem.getProofStatus(req.params.id);
      if (!status) return res.status(404).json({ error: 'proof_not_found' });
      res.json(status);
    } catch (error) {
      res.status(500).json({ error: 'proof_status_failed' });
    }
  });

  app.post('/proof/:id/dispute', auth.requireUser, withFeatureFlag('bounty'), async (req, res) => {
    try {
      const result = await ecosystem.disputeProof(req.user.id, req.params.id, req.body?.reason || null);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'proof_dispute_failed' });
    }
  });

  // Kids mode
  app.post('/kids/activate', auth.requireUser, withFeatureFlag('kids_mode'), async (req, res) => {
    try {
      const session = await ecosystem.activateKidsMode(req.user.id, req.body || {});
      res.json(session);
    } catch (error) {
      if (['kid_profile_not_found', 'invalid_parent_pin'].includes(error.message)) return res.status(400).json({ error: error.message });
      res.status(500).json({ error: 'kids_activate_failed' });
    }
  });

  app.get('/kids/missions', auth.requireUser, withFeatureFlag('kids_mode'), async (req, res) => {
    try {
      const sessionId = req.query.session_id;
      if (!sessionId) return res.status(400).json({ error: 'session_id_required' });
      const missions = await ecosystem.getKidsMissions(req.user.id, sessionId);
      res.json(missions);
    } catch (error) {
      if (error.message === 'kids_session_not_found') return res.status(404).json({ error: 'kids_session_not_found' });
      res.status(500).json({ error: 'kids_missions_failed' });
    }
  });

  app.post('/kids/missions/:id/submit', auth.requireUser, withFeatureFlag('kids_mode'), async (req, res) => {
    try {
      const sessionId = req.body?.session_id;
      if (!sessionId) return res.status(400).json({ error: 'session_id_required' });
      const result = await ecosystem.submitKidsMission(req.user.id, sessionId, req.params.id, req.body || {});
      res.json(result);
    } catch (error) {
      if (['kids_session_not_found', 'adult_mission_not_allowed', 'mission_not_found'].includes(error.message)) return res.status(400).json({ error: error.message });
      res.status(500).json({ error: 'kids_submit_failed' });
    }
  });

  app.post('/kids/deactivate', auth.requireUser, withFeatureFlag('kids_mode'), async (req, res) => {
    try {
      const sessionId = req.body?.session_id;
      if (!sessionId) return res.status(400).json({ error: 'session_id_required' });
      const result = await ecosystem.deactivateKidsMode(req.user.id, sessionId);
      res.json(result);
    } catch (error) {
      if (error.message === 'kids_session_not_found') return res.status(404).json({ error: 'kids_session_not_found' });
      res.status(500).json({ error: 'kids_deactivate_failed' });
    }
  });
};
