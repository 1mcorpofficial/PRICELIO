const auth = require('../auth');
const {
  getUserReceiptsAnalytics,
  getUserLoyaltyCards,
  upsertUserLoyaltyCard,
  deactivateUserLoyaltyCard,
  getUserReceiptReviewQueue,
  getUserReceiptHistory,
  getUserReceiptQualitySummary
} = require('../queries');

module.exports = (app) => {
  app.get('/me', auth.authMiddleware, async (req, res) => {
    try {
      const profile = await auth.getUserProfile(req.user.id);
      res.json({ id: profile.id, email: profile.email, status: profile.status, created_at: profile.created_at, last_login_at: profile.last_login_at });
    } catch (error) {
      res.status(404).json({ error: 'user_not_found' });
    }
  });

  app.get('/me/receipts/analytics', auth.requireUser, async (req, res) => {
    try {
      const months = Math.max(1, Math.min(24, Number(req.query.months || 12)));
      const analytics = await getUserReceiptsAnalytics(req.user.id, { months });
      res.json(analytics);
    } catch (error) {
      console.error('Receipt analytics failed:', error);
      res.status(500).json({ error: 'receipt_analytics_failed' });
    }
  });

  app.get('/me/receipts/review-queue', auth.requireUser, async (req, res) => {
    try {
      const limit = Number.parseInt(req.query.limit, 10);
      const rows = await getUserReceiptReviewQueue(req.user.id, Number.isFinite(limit) ? limit : 12);
      res.json(rows);
    } catch (error) {
      console.error('Receipt review queue failed:', error);
      res.status(500).json({ error: 'receipt_review_queue_failed' });
    }
  });

  app.get('/me/receipts/history', auth.requireUser, async (req, res) => {
    try {
      const limit = Number.parseInt(req.query.limit, 10);
      const rows = await getUserReceiptHistory(req.user.id, Number.isFinite(limit) ? limit : 20);
      res.json(rows);
    } catch (error) {
      console.error('Receipt history failed:', error);
      res.status(500).json({ error: 'receipt_history_failed' });
    }
  });

  app.get('/me/receipts/quality-summary', auth.requireUser, async (req, res) => {
    try {
      const days = Number.parseInt(req.query.days, 10);
      const summary = await getUserReceiptQualitySummary(req.user.id, { days: Number.isFinite(days) ? days : 90 });
      res.json(summary);
    } catch (error) {
      console.error('Receipt quality summary failed:', error);
      res.status(500).json({ error: 'receipt_quality_summary_failed' });
    }
  });

  app.get('/me/loyalty-cards', auth.requireUser, async (req, res) => {
    try {
      const cards = await getUserLoyaltyCards(req.user.id);
      res.json(cards);
    } catch (error) {
      console.error('Loyalty cards fetch failed:', error);
      res.status(500).json({ error: 'loyalty_cards_fetch_failed' });
    }
  });

  app.post('/me/loyalty-cards', auth.requireUser, async (req, res) => {
    try {
      const storeChain = String(req.body?.store_chain || '').trim();
      const cardLabel = String(req.body?.card_label || '').trim() || null;
      const cardLast4 = String(req.body?.card_last4 || '').replace(/[^\d]/g, '').slice(-4) || null;
      if (!storeChain) return res.status(400).json({ error: 'store_chain_required' });
      const card = await upsertUserLoyaltyCard(req.user.id, { store_chain: storeChain, card_label: cardLabel, card_last4: cardLast4 });
      res.json(card);
    } catch (error) {
      console.error('Loyalty card upsert failed:', error);
      res.status(500).json({ error: 'loyalty_card_upsert_failed' });
    }
  });

  app.delete('/me/loyalty-cards/:id', auth.requireUser, async (req, res) => {
    try {
      const ok = await deactivateUserLoyaltyCard(req.user.id, req.params.id);
      if (!ok) return res.status(404).json({ error: 'loyalty_card_not_found' });
      res.status(204).send();
    } catch (error) {
      console.error('Loyalty card delete failed:', error);
      res.status(500).json({ error: 'loyalty_card_delete_failed' });
    }
  });
};
