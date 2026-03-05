const auth = require('../auth');
const ecosystem = require('../ecosystem');
const { withFeatureFlag, requirePlusFeature } = require('../middleware/featureFlags');

module.exports = (app) => {
  app.get('/ranks', withFeatureFlag('gamification'), async (req, res) => {
    try {
      const ranks = await ecosystem.getRankLevels();
      res.json(ranks);
    } catch (error) {
      res.status(500).json({ error: 'ranks_fetch_failed' });
    }
  });

  app.get('/me/gamification', auth.requireUser, withFeatureFlag('gamification'), async (req, res) => {
    try {
      const data = await ecosystem.getGamification(req.user.id);
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: 'gamification_fetch_failed' });
    }
  });

  app.get('/leaderboard/global', withFeatureFlag('gamification'), async (req, res) => {
    try {
      const rows = await ecosystem.getLeaderboardGlobal(req.query.limit || 50);
      res.json(rows);
    } catch (error) {
      res.status(500).json({ error: 'leaderboard_fetch_failed' });
    }
  });

  app.get('/leaderboard/friends', auth.requireUser, withFeatureFlag('gamification'), async (req, res) => {
    try {
      const rows = await ecosystem.getLeaderboardFriends(req.user.id, req.query.limit || 50);
      res.json(rows);
    } catch (error) {
      res.status(500).json({ error: 'leaderboard_fetch_failed' });
    }
  });

  app.get('/points/ledger', auth.requireUser, withFeatureFlag('gamification'), async (req, res) => {
    try {
      const rows = await ecosystem.getPointsLedger(req.user.id, req.query.limit || 100);
      res.json(rows);
    } catch (error) {
      res.status(500).json({ error: 'points_ledger_failed' });
    }
  });

  app.get('/points/redeem/options', auth.requireUser, withFeatureFlag('premium_redeem'), async (req, res) => {
    try {
      res.json(await ecosystem.getRedeemOptions());
    } catch (error) {
      res.status(500).json({ error: 'redeem_options_failed' });
    }
  });

  app.post('/points/redeem', auth.requireUser, withFeatureFlag('premium_redeem'), async (req, res) => {
    try {
      const { reward_key } = req.body || {};
      if (reward_key !== 'plus_30d') return res.status(400).json({ error: 'unsupported_reward' });
      const result = await ecosystem.unlockPlusWithPoints(req.user.id);
      if (!result.ok) return res.status(400).json({ error: result.reason || 'redeem_failed' });
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'redeem_failed' });
    }
  });

  app.get('/plus/features', async (req, res) => {
    try {
      res.json(await ecosystem.getPlusFeatures());
    } catch (error) {
      res.status(500).json({ error: 'plus_features_failed' });
    }
  });

  app.get('/plus/status', auth.requireUser, async (req, res) => {
    try {
      res.json(await ecosystem.getPlusStatus(req.user.id));
    } catch (error) {
      res.status(500).json({ error: 'plus_status_failed' });
    }
  });

  app.post('/plus/subscribe', auth.requireUser, async (req, res) => {
    try {
      const result = await ecosystem.subscribePlus(req.user.id);
      if (!result.ok) return res.status(400).json({ error: result.reason || 'plus_subscribe_failed' });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'plus_subscribe_failed' });
    }
  });

  app.post('/plus/unlock-with-points', auth.requireUser, withFeatureFlag('premium_redeem'), async (req, res) => {
    try {
      const result = await ecosystem.unlockPlusWithPoints(req.user.id);
      if (!result.ok) return res.status(400).json({ error: result.reason || 'unlock_failed' });
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'unlock_failed' });
    }
  });

  app.get('/insights/time-machine/:productId', auth.requireUser, requirePlusFeature('time_machine'), async (req, res) => {
    try {
      const result = await ecosystem.getTimeMachinePrediction(req.params.productId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'time_machine_failed' });
    }
  });

  app.get('/insights/analytics/spending', auth.requireUser, requirePlusFeature('advanced_analytics'), async (req, res) => {
    try {
      const result = await ecosystem.getAdvancedAnalytics(req.user.id);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'advanced_analytics_failed' });
    }
  });
};
