const { query } = require('../db');
const { getStorePins, getStoreDetail, getCityFeed } = require('../queries');
const { buildVersionedKey, getJson: getCachedJson, setJson: setCachedJson } = require('../cache');
const { calculateDistance } = require('../helpers/geo');

module.exports = (app) => {
  app.get('/map/stores', async (req, res) => {
    try {
      const { category, verified, maxDistance, lat, lon, cityId, city } = req.query;
      let resolvedCityId = null;
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

      if (cityId && uuidRegex.test(String(cityId))) {
        resolvedCityId = String(cityId);
      } else {
        const defaultCity = (city || 'Kaunas').toString();
        const cityRow = await query(`SELECT id FROM cities WHERE name = $1 LIMIT 1`, [defaultCity]);
        resolvedCityId = cityRow.rows[0]?.id || null;
      }

      const filters = {
        category,
        verified: verified === 'true',
        maxDistance: maxDistance ? parseFloat(maxDistance) : null,
        lat: lat ? parseFloat(lat) : null,
        lon: lon ? parseFloat(lon) : null,
        cityId: resolvedCityId
      };

      let pins = await getStorePins(filters);
      if (filters.verified) pins = pins.filter(pin => pin.has_verified_prices);
      if (filters.lat && filters.lon && filters.maxDistance) {
        pins = pins.filter(pin => calculateDistance(filters.lat, filters.lon, pin.lat, pin.lon) <= filters.maxDistance);
      }
      res.json(pins);
    } catch (error) {
      console.error('Map error:', error);
      res.status(500).json({ error: 'map_unavailable' });
    }
  });

  app.get('/stores/:id', async (req, res) => {
    try {
      const detail = await getStoreDetail(req.params.id);
      if (!detail) return res.status(404).json({ error: 'store_not_found' });
      res.json(detail);
    } catch (error) {
      res.status(500).json({ error: 'store_unavailable' });
    }
  });

  app.get('/city/:city/feed', async (req, res) => {
    try {
      const feed = await getCityFeed(req.params.city);
      res.json(feed);
    } catch (error) {
      res.status(500).json({ error: 'feed_unavailable' });
    }
  });

  app.get('/chains', async (req, res) => {
    try {
      const cacheKey = await buildVersionedKey('categories_all', ['all']);
      const cached = await getCachedJson(cacheKey, 'categories_all');
      if (cached) return res.json(cached);

      const result = await query(
        `SELECT DISTINCT chain, COUNT(DISTINCT id) as store_count, COUNT(DISTINCT city_id) as city_count
         FROM stores WHERE is_active = true GROUP BY chain ORDER BY chain ASC`
      );
      await setCachedJson(cacheKey, result.rows, 86400, 'categories_all');
      res.json(result.rows);
    } catch (error) {
      console.error('Chains fetch error:', error);
      res.status(500).json({ error: 'chains_unavailable' });
    }
  });

  app.get('/stores', async (req, res) => {
    try {
      const { chain, city, category } = req.query;
      let whereConditions = ['is_active = true'];
      let params = [];
      let paramIndex = 1;

      if (chain) { whereConditions.push(`chain = $${paramIndex}`); params.push(chain); paramIndex++; }
      if (city) { whereConditions.push(`city_id = $${paramIndex}`); params.push(city); paramIndex++; }
      if (category && category !== 'All') { whereConditions.push(`format = $${paramIndex}`); params.push(category); paramIndex++; }

      const result = await query(
        `SELECT id, chain, name, format, address, lat, lon, city_id, is_active FROM stores WHERE ${whereConditions.join(' AND ')} ORDER BY chain, name ASC`,
        params
      );
      res.json(result.rows);
    } catch (error) {
      console.error('Stores fetch error:', error);
      res.status(500).json({ error: 'stores_unavailable' });
    }
  });

  app.get('/offers', async (req, res) => {
    try {
      const { chain, category, city, limit = 50 } = req.query;
      let whereConditions = ["o.status = 'active'", 's.is_active = true'];
      let params = [];
      let paramIndex = 1;

      if (chain) { whereConditions.push(`s.chain = $${paramIndex}`); params.push(chain); paramIndex++; }
      if (category && category !== 'All') { whereConditions.push(`s.format = $${paramIndex}`); params.push(category); paramIndex++; }
      if (city) { whereConditions.push(`s.city_id = $${paramIndex}`); params.push(city); paramIndex++; }
      params.push(parseInt(limit));

      const result = await query(
        `SELECT o.id, o.price_value, o.old_price_value, o.unit_price_value AS unit_price, o.unit_price_unit, o.valid_from, o.valid_to, o.source_type,
                p.id AS product_id, p.name AS product_name, p.brand, p.variant,
                s.id AS store_id, s.chain, s.name AS store_name, s.format
         FROM offers o JOIN products p ON p.id = o.product_id JOIN stores s ON s.id = o.store_id
         WHERE ${whereConditions.join(' AND ')} ORDER BY o.created_at DESC LIMIT $${paramIndex}`,
        params
      );
      res.json(result.rows);
    } catch (error) {
      console.error('Offers fetch error:', error);
      res.status(500).json({ error: 'offers_unavailable' });
    }
  });
};
