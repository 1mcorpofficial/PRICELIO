const auth = require('../auth');
const ecosystem = require('../ecosystem');
const { withFeatureFlag } = require('../middleware/featureFlags');

module.exports = (app) => {
  app.get('/families', auth.requireUser, async (req, res) => {
    try {
      const families = await ecosystem.getUserFamilies(req.user.id);
      res.json(families);
    } catch (error) {
      res.status(500).json({ error: 'families_fetch_failed' });
    }
  });

  app.post('/families', auth.requireUser, withFeatureFlag('family_core'), async (req, res) => {
    try {
      const family = await ecosystem.createFamily(req.user.id, req.body?.name);
      res.json(family);
    } catch (error) {
      res.status(500).json({ error: 'family_create_failed' });
    }
  });

  app.post('/families/:id/invite', auth.requireUser, withFeatureFlag('family_core'), async (req, res) => {
    try {
      const invite = await ecosystem.inviteFamilyMember(req.params.id, req.user.id, req.body || {});
      res.json(invite);
    } catch (error) {
      if (error.message === 'family_plus_required') return res.status(402).json({ error: 'family_plus_required' });
      if (error.message === 'forbidden_household' || error.message === 'forbidden_role') return res.status(403).json({ error: error.message });
      res.status(500).json({ error: 'family_invite_failed' });
    }
  });

  app.post('/families/:id/join', auth.requireUser, withFeatureFlag('family_core'), async (req, res) => {
    try {
      const token = req.body?.token;
      if (!token) return res.status(400).json({ error: 'token_required' });
      const data = await ecosystem.joinFamilyByToken(req.user.id, token);
      if (String(data.household_id) !== String(req.params.id)) return res.status(400).json({ error: 'invite_household_mismatch' });
      res.json(data);
    } catch (error) {
      if (['invite_not_found', 'invite_expired'].includes(error.message)) return res.status(400).json({ error: error.message });
      if (error.message === 'family_plus_required') return res.status(402).json({ error: 'family_plus_required' });
      res.status(500).json({ error: 'family_join_failed' });
    }
  });

  app.get('/families/:id/lists', auth.requireUser, withFeatureFlag('family_core'), async (req, res) => {
    try {
      const lists = await ecosystem.getFamilyLists(req.params.id, req.user.id);
      res.json(lists);
    } catch (error) {
      if (error.message === 'forbidden_household') return res.status(403).json({ error: 'forbidden_household' });
      res.status(500).json({ error: 'family_lists_failed' });
    }
  });

  app.post('/families/:id/lists/:listId/items', auth.requireUser, withFeatureFlag('family_core'), async (req, res) => {
    try {
      const item = await ecosystem.addFamilyListItem(req.params.id, req.params.listId, req.user.id, req.body || {});
      res.json(item);
    } catch (error) {
      if (['forbidden_household', 'list_not_found'].includes(error.message)) return res.status(403).json({ error: error.message });
      res.status(500).json({ error: 'family_item_add_failed' });
    }
  });

  app.post('/families/:id/events/poll', auth.requireUser, withFeatureFlag('family_core'), async (req, res) => {
    try {
      const data = await ecosystem.pollFamilyEvents(req.params.id, req.user.id, req.body?.cursor || 0, req.body?.limit || 100);
      res.json(data);
    } catch (error) {
      if (error.message === 'forbidden_household') return res.status(403).json({ error: 'forbidden_household' });
      res.status(500).json({ error: 'family_events_failed' });
    }
  });
};
