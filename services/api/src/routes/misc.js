const crypto = require('crypto');
const fs = require('fs');
const auth = require('../auth');
const { query } = require('../db');
const projectBaskets = require('../project-baskets');
const { upload, ensureUploadPath } = require('../helpers/upload');

module.exports = (app) => {
  // Project Baskets
  app.get('/project-baskets/templates', async (req, res) => {
    try {
      const templates = projectBaskets.getProjectTemplates();
      res.json(templates);
    } catch (error) {
      res.status(500).json({ error: 'templates_fetch_failed' });
    }
  });

  app.post('/project-baskets/create/:templateId', auth.requireUser, async (req, res) => {
    try {
      const basket = await projectBaskets.createBasketFromTemplate(req.user.id, req.params.templateId);
      res.json(basket);
    } catch (error) {
      console.error('Create basket from template error:', error);
      res.status(500).json({ error: 'basket_create_failed' });
    }
  });

  app.get('/project-baskets/recommended', auth.requireUser, async (req, res) => {
    try {
      const recommendations = await projectBaskets.getRecommendedTemplates(req.user.id);
      res.json(recommendations);
    } catch (error) {
      res.status(500).json({ error: 'recommendations_fetch_failed' });
    }
  });

  // ShelfSnap
  app.post('/shelfsnap/submit', auth.requireUser, upload.single('image'), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'file_required' });

      const { product_name, price, store } = req.body || {};
      const parsedPrice = Number.parseFloat(String(price || '').replace(',', '.'));
      if (!Number.isFinite(parsedPrice)) return res.status(400).json({ error: 'invalid_price' });

      const mimeToExt = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
      const ext = mimeToExt[String(req.file.mimetype || '').toLowerCase()] || '.jpg';
      const objectKey = `shelfsnaps/${crypto.randomUUID()}${ext}`;
      const targetPath = ensureUploadPath(objectKey);
      fs.writeFileSync(targetPath, req.file.buffer);
      const imageUrl = `/uploads/${objectKey}`;

      await query(
        `INSERT INTO shelf_snaps (user_id, image_url, extracted_price, verification_status, metadata, created_at) VALUES ($1, $2, $3, 'pending', $4, NOW())`,
        [req.user.id, imageUrl, parsedPrice, JSON.stringify({ product_name, store })]
      );
      res.json({ success: true, status: 'pending_verification' });
    } catch (error) {
      console.error('ShelfSnap submit error:', error);
      res.status(500).json({ error: 'shelfsnap_submit_failed' });
    }
  });

  // Package Size Trap Detector
  app.get('/package-traps', async (req, res) => {
    try {
      const traps = await query(
        `SELECT pst.*, p1.name as larger_product_name, p2.name as smaller_product_name, s.name as store_name
         FROM package_size_traps pst
         JOIN products p1 ON p1.id = pst.product_id
         JOIN products p2 ON p2.id = pst.smaller_product_id
         JOIN stores s ON s.id = pst.store_id
         WHERE pst.is_active = true ORDER BY pst.unit_price_diff_percent DESC LIMIT 20`
      );
      res.json(traps.rows);
    } catch (error) {
      res.status(500).json({ error: 'traps_fetch_failed' });
    }
  });

  // Warranty Vault
  app.post('/warranty/add', auth.requireUser, async (req, res) => {
    try {
      const { receiptId, receiptItemId, warrantyMonths } = req.body;
      const item = await query(
        `SELECT ri.*, r.created_at as purchase_date, s.name as store_name FROM receipt_items ri JOIN receipts r ON r.id = ri.receipt_id LEFT JOIN stores s ON s.id = r.store_id WHERE ri.id = $1 AND r.user_id = $2`,
        [receiptItemId, req.user.id]
      );
      if (item.rows.length === 0) return res.status(404).json({ error: 'item_not_found' });

      const purchaseDate = new Date(item.rows[0].purchase_date);
      const warrantyExpires = new Date(purchaseDate);
      warrantyExpires.setMonth(warrantyExpires.getMonth() + warrantyMonths);

      await query(
        `INSERT INTO warranty_items (user_id, receipt_id, receipt_item_id, product_id, product_name, purchase_date, warranty_months, warranty_expires_at, purchase_price, store_name, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
        [req.user.id, receiptId, receiptItemId, item.rows[0].product_id, item.rows[0].normalized_name || item.rows[0].raw_name, purchaseDate.toISOString().split('T')[0], warrantyMonths, warrantyExpires.toISOString().split('T')[0], item.rows[0].total_price, item.rows[0].store_name]
      );
      res.json({ success: true });
    } catch (error) {
      console.error('Warranty add error:', error);
      res.status(500).json({ error: 'warranty_add_failed' });
    }
  });

  app.get('/warranty/list', auth.requireUser, async (req, res) => {
    try {
      const items = await query(`SELECT * FROM warranty_items WHERE user_id = $1 ORDER BY warranty_expires_at ASC`, [req.user.id]);
      res.json(items.rows);
    } catch (error) {
      res.status(500).json({ error: 'warranty_list_failed' });
    }
  });
};
