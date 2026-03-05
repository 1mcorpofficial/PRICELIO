const crypto = require('crypto');
const auth = require('../auth');
const ecosystem = require('../ecosystem');
const { query } = require('../db');
const { createBasket, insertBasketItems, getBasketItems, findProductByName, createGuestSession } = require('../queries');
const { optimizeSingleStore } = require('../optimizer');

function readGuestSessionProof(req) {
  return req.get('x-guest-session-proof') || req.query.guest_proof || req.body?.guest_proof || null;
}

async function getBasketById(basketId) {
  const result = await query(`SELECT id, user_id, guest_session_id FROM baskets WHERE id = $1 LIMIT 1`, [basketId]);
  return result.rows[0] || null;
}

async function enforceBasketAccess(basket, req) {
  if (basket.user_id) {
    if (!req.user?.id) return { ok: false, status: 401, code: 'login_required' };
    if (basket.user_id !== req.user.id) return { ok: false, status: 403, code: 'basket_access_denied' };
    return { ok: true, mode: 'user' };
  }
  const proof = readGuestSessionProof(req);
  if (!proof) return { ok: false, status: 401, code: 'guest_proof_required' };
  const decoded = auth.verifyGuestSessionProof(proof);
  if (!decoded || decoded.guest_session_id !== basket.guest_session_id) return { ok: false, status: 403, code: 'guest_basket_access_denied' };
  return { ok: true, mode: 'guest' };
}

module.exports = (app) => {
  app.post('/baskets', auth.optionalAuthMiddleware, async (req, res) => {
    try {
      let userId = null;
      let guestSessionId = null;
      let guestProof = null;

      if (req.user?.id) {
        userId = req.user.id;
        const hasMultiBaskets = await ecosystem.hasFeature(userId, 'multi_baskets');
        if (!hasMultiBaskets) {
          const active = await query(`SELECT COUNT(*)::int AS cnt FROM baskets WHERE user_id = $1 AND status = 'active'`, [userId]);
          if (Number(active.rows[0]?.cnt || 0) >= 1) return res.status(402).json({ error: 'plus_feature_required', feature: 'multi_baskets' });
        }
      } else {
        const ipHash = crypto.createHash('sha256').update(req.ip || 'unknown').digest('hex');
        guestSessionId = await createGuestSession(ipHash);
        guestProof = auth.generateGuestSessionProof(guestSessionId);
      }

      const basket = await createBasket({ userId, guestSessionId, name: req.body.name });
      res.json({ ...basket, guest_proof: guestProof });
    } catch (error) {
      res.status(500).json({ error: 'basket_create_failed' });
    }
  });

  app.post('/baskets/:id/items', auth.optionalAuthMiddleware, async (req, res) => {
    try {
      const basket = await getBasketById(req.params.id);
      if (!basket) return res.status(404).json({ error: 'basket_not_found' });
      const access = await enforceBasketAccess(basket, req);
      if (!access.ok) return res.status(access.status).json({ error: access.code });

      const items = Array.isArray(req.body.items) ? req.body.items : [];
      if (!items.length) return res.status(400).json({ error: 'items_required' });

      const resolved = [];
      for (const item of items) {
        if (item.product_id) { resolved.push(item); continue; }
        if (item.raw_name) {
          const product = await findProductByName(item.raw_name);
          resolved.push({ ...item, product_id: product ? product.id : null, product_name: product ? product.name : item.raw_name });
        }
      }

      await insertBasketItems(req.params.id, resolved);
      const basketItems = await getBasketItems(req.params.id);
      res.json({ id: req.params.id, items: basketItems });
    } catch (error) {
      res.status(500).json({ error: 'basket_items_failed' });
    }
  });

  app.post('/baskets/:id/optimize', auth.optionalAuthMiddleware, async (req, res) => {
    try {
      const basket = await getBasketById(req.params.id);
      if (!basket) return res.status(404).json({ error: 'basket_not_found' });
      const access = await enforceBasketAccess(basket, req);
      if (!access.ok) return res.status(access.status).json({ error: access.code });

      const basketItems = await getBasketItems(req.params.id);
      const plan = await optimizeSingleStore(basketItems);
      res.json(plan);
    } catch (error) {
      res.status(500).json({ error: 'basket_optimize_failed' });
    }
  });
};
