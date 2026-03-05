const { bumpCacheVersion } = require('../cache');

const INTERNAL_CACHE_BUMP_TOKEN = process.env.INTERNAL_CACHE_BUMP_TOKEN || '';

module.exports = (app) => {
  app.post('/internal/cache/bump', async (req, res) => {
    if (!INTERNAL_CACHE_BUMP_TOKEN || req.get('x-internal-token') !== INTERNAL_CACHE_BUMP_TOKEN) {
      return res.status(401).json({ error: 'internal_token_required' });
    }
    const next = await bumpCacheVersion();
    return res.json({ ok: true, cache_version: next });
  });
};
